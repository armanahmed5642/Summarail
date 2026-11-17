import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

function getApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || !key.trim() || key === 'MY_GEMINI_API_KEY' || key === 'your_api_key_here') {
    return null;
  }
  return key.trim();
}

function getAiClient(): GoogleGenAI | null {
  const key = getApiKey();
  if (!key) return null;
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface ExponentialBackoffOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterRatio?: number;
  shouldRetry?: (err: any) => boolean;
  onRetry?: (err: any, attempt: number, delayMs: number) => void;
}

export function extractErrorStatus(err: any): number | undefined {
  const direct = err?.status ?? err?.statusCode ?? err?.code ?? err?.error?.code;
  if (typeof direct === 'number' && Number.isFinite(direct)) {
    return direct;
  }
  const msg = String(err?.message || err?.error?.message || '');
  const match = msg.match(/\b(429|500|502|503|504)\b/);
  if (match) {
    return Number(match[1]);
  }
  return undefined;
}

export function isServiceUnavailableError(err: any): boolean {
  const status = extractErrorStatus(err);
  const errorStatus = String(err?.error?.status || err?.statusText || '').toUpperCase();
  const msg = String(err?.message || err?.error?.message || '').toLowerCase();
  return (
    status === 503 ||
    errorStatus === 'UNAVAILABLE' ||
    msg.includes('503') ||
    msg.includes('service unavailable') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('overloaded')
  );
}

export function isTransientError(err: any): boolean {
  const status = extractErrorStatus(err);
  const name = String(err?.name || '').toLowerCase();
  const msg = String(err?.message || err?.error?.message || '').toLowerCase();
  return (
    isServiceUnavailableError(err) ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 504 ||
    name === 'aborterror' ||
    name === 'timeouterror' ||
    msg.includes('resource_exhausted') ||
    msg.includes('rate limit') ||
    msg.includes('timeout') ||
    msg.includes('aborted') ||
    msg.includes('econnreset') ||
    msg.includes('fetch failed')
  );
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function parseRetryAfterMs(err: any): number | null {
  const headers = err?.response?.headers || err?.headers;
  const raw = typeof headers?.get === 'function'
    ? headers.get('retry-after')
    : headers?.['retry-after'] ?? headers?.['Retry-After'];
  if (!raw) return null;

  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(10000, Math.round(seconds * 1000));
  }

  const parsedDate = Date.parse(String(raw));
  if (!Number.isNaN(parsedDate)) {
    return Math.min(10000, Math.max(0, parsedDate - Date.now()));
  }

  return null;
}

export function computeExponentialBackoffMs(
  retryIndex: number,
  options: { baseDelayMs?: number; maxDelayMs?: number; jitterRatio?: number; retryAfterMs?: number | null } = {}
): number {
  const baseDelayMs = options.baseDelayMs ?? 600;
  const maxDelayMs = options.maxDelayMs ?? 5000;
  const jitterRatio = options.jitterRatio ?? 0.35;

  const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, retryIndex));
  const jitter = Math.floor(Math.random() * Math.max(1, exponentialDelay * jitterRatio));
  const computed = Math.min(maxDelayMs, exponentialDelay + jitter);

  if (typeof options.retryAfterMs === 'number' && Number.isFinite(options.retryAfterMs)) {
    return Math.min(maxDelayMs, Math.max(computed, options.retryAfterMs));
  }

  return computed;
}

export async function executeWithExponentialBackoff<T>(
  operation: (attempt: number) => Promise<T>,
  options: ExponentialBackoffOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const shouldRetry = options.shouldRetry ?? isTransientError;

  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation(attempt);
    } catch (err: any) {
      lastError = err;
      if (attempt >= maxRetries || !shouldRetry(err)) {
        throw err;
      }

      const delayMs = computeExponentialBackoffMs(attempt, {
        baseDelayMs: options.baseDelayMs,
        maxDelayMs: options.maxDelayMs,
        jitterRatio: options.jitterRatio,
        retryAfterMs: parseRetryAfterMs(err),
      });

      options.onRetry?.(err, attempt + 1, delayMs);
      await sleep(delayMs);
    }
  }

  throw lastError;
}

async function callGeminiWithRetry(
  ai: GoogleGenAI,
  params: {
    contents: string | Record<string, any> | Array<any>;
    config?: Record<string, any>;
  }
) {
  const modelPlan: Array<{
    model: 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    timeoutMs: number;
    useLowThinking?: boolean;
  }> = [
    {
      model: 'gemini-4-hydrogen',
      maxRetries: 3,
      baseDelayMs: 600,
      maxDelayMs: 4000,
      timeoutMs: 10000,
      useLowThinking: true,
    },
    {
      model: 'gemini-3.1-flash-lite',
      maxRetries: 2,
      baseDelayMs: 500,
      maxDelayMs: 2500,
      timeoutMs: 8000,
    },
  ];

  let lastError: any;

  for (const plan of modelPlan) {
    try {
      return await executeWithExponentialBackoff(
        async () => {
          const config: Record<string, any> = {
            ...(params.config || {}),
            abortSignal: AbortSignal.timeout(plan.timeoutMs),
          };
          if (plan.useLowThinking) {
            config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
          }
          return await ai.models.generateContent({
            model: plan.model,
            contents: params.contents,
            config,
          });
        },
        {
          maxRetries: plan.maxRetries,
          baseDelayMs: plan.baseDelayMs,
          maxDelayMs: plan.maxDelayMs,
          shouldRetry: (err) => {
            if (!isTransientError(err)) return false;
            // On explicit 503 Service Unavailable or 429/5xx network errors, apply full exponential backoff retries.
            if (isServiceUnavailableError(err)) return true;
            const errName = String(err?.name || '').toLowerCase();
            const errMsg = String(err?.message || '').toLowerCase();
            const isTimeout = errName === 'aborterror' || errName === 'timeouterror' || errMsg.includes('abort') || errMsg.includes('timeout');
            // Avoid stacking multiple full request timeouts; move to fallback model quickly on hard timeout.
            return !isTimeout;
          },
          onRetry: (err, retryNumber, delayMs) => {
            const code = extractErrorStatus(err) || 'transient';
            console.warn(
              `[Gemini Retry] Model ${plan.model} returned ${code}. Retry #${retryNumber} in ${delayMs}ms (exponential backoff)...`
            );
          },
        }
      );
    } catch (err: any) {
      lastError = err;
      if (!isTransientError(err)) {
        throw err;
      }
      console.warn(`[Gemini Fallback] Exhausted retries for ${plan.model}, trying next model if available.`);
    }
  }

  throw lastError;
}

export interface SummarizeOptions {
  text: string;
  length?: 'short' | 'medium' | 'detailed';
  style?: 'paragraph' | 'bullet_points' | 'executive' | 'simple' | 'academic';
  extractKeyPoints?: boolean;
  extractKeywords?: boolean;
  generateTitle?: boolean;
  preserveFacts?: boolean;
}

export interface SummaryResult {
  title: string;
  summary: string;
  keyPoints: string[];
  keywords: string[];
  summaryWordCount: number;
  originalWordCount: number;
  compressionRatio: number;
  isFallback?: boolean;
  fallbackNotice?: string;
}

// Stopwords list for NLP frequency scoring
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot',
  'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during', 'each',
  'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d',
  'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i',
  'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s',
  'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or',
  'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll',
  'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs',
  'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve',
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll',
  'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while',
  'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll',
  'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves'
]);

/**
 * Natural Language Processing (NLP) Extractive Summarizer
 * Used as a zero-failure fallback when Gemini API key is not configured or rate-limited.
 */
function nlpSummarize(options: SummarizeOptions): SummaryResult {
  const {
    text,
    length = 'medium',
    style = 'bullet_points',
    preserveFacts = true,
  } = options;

  const rawWords = text.trim().split(/\s+/).filter(Boolean);
  const originalWordCount = rawWords.length;

  // Split into sentences using punctuation boundaries
  const rawSentences = text
    .replace(/([.?!])\s*(?=[A-Z0-9])/g, '$1|')
    .split('|')
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.split(/\s+/).length >= 4);

  // Fallback if text is too brief or unstructured
  const sentences = rawSentences.length > 0 ? rawSentences : [text.trim()];

  // Compute word frequency
  const wordFreq: Record<string, number> = {};
  for (const word of rawWords) {
    const clean = word.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (clean.length > 2 && !STOP_WORDS.has(clean)) {
      wordFreq[clean] = (wordFreq[clean] || 0) + 1;
    }
  }

  // Score sentences
  const scoredSentences = sentences.map((sentence, index) => {
    const sWords = sentence.toLowerCase().split(/\s+/).map(w => w.replace(/[^a-z0-9]/g, '')).filter(Boolean);
    let score = 0;

    for (const w of sWords) {
      if (wordFreq[w]) {
        score += wordFreq[w];
      }
    }

    // Normalized score by sentence length
    score = sWords.length > 0 ? score / Math.sqrt(sWords.length) : 0;

    // Boost position (first sentence of documents / paragraphs contain core thesis)
    if (index === 0) score *= 1.4;
    else if (index === sentences.length - 1) score *= 1.15;
    else if (index < 3) score *= 1.2;

    // Boost factual content: numbers, percentages, years, currency
    if (preserveFacts && /\b(\d+(?:\.\d+)?%?|\$\d+|19\d\d|20\d\d)\b/.test(sentence)) {
      score *= 1.35;
    }

    // Boost sentences containing capitalized proper nouns
    if (/[A-Z][a-z]+ [A-Z][a-z]+/.test(sentence)) {
      score *= 1.15;
    }

    return { sentence, score, originalIndex: index };
  });

  // Determine number of sentences based on length
  let targetCount = 4;
  if (length === 'short') {
    targetCount = Math.min(3, Math.max(1, Math.ceil(sentences.length * 0.15)));
  } else if (length === 'detailed') {
    targetCount = Math.min(10, Math.max(5, Math.ceil(sentences.length * 0.45)));
  } else {
    targetCount = Math.min(6, Math.max(2, Math.ceil(sentences.length * 0.25)));
  }

  // Sort by score to find top sentences
  const topScored = [...scoredSentences]
    .sort((a, b) => b.score - a.score)
    .slice(0, targetCount);

  // Re-sort chronologically to preserve narrative flow
  topScored.sort((a, b) => a.originalIndex - b.originalIndex);

  // Extract top keywords
  const sortedKeywords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));

  // Extract Key Points
  const keyPoints = topScored.slice(0, 5).map(item => {
    let pt = item.sentence.replace(/^[-•*]\s*/, '').trim();
    if (!pt.endsWith('.')) pt += '.';
    return pt;
  });

  // Apply summary tone & style
  let finalSummary = '';
  if (style === 'bullet_points') {
    finalSummary = topScored.map(item => `• ${item.sentence}`).join('\n\n');
  } else if (style === 'executive') {
    const lead = topScored[0]?.sentence || '';
    const body = topScored.slice(1).map(item => `• ${item.sentence}`).join('\n');
    finalSummary = `**Executive Overview:**\n${lead}\n\n**Strategic Takeaways:**\n${body}`;
  } else if (style === 'academic') {
    finalSummary = `Key Academic Findings: ${topScored.map(item => item.sentence).join(' ')}`;
  } else if (style === 'simple') {
    finalSummary = topScored.map(item => item.sentence).join(' ');
  } else {
    // paragraph
    finalSummary = topScored.map(item => item.sentence).join(' ');
  }

  // Generate Title
  let title = 'Executive Intelligence Brief';
  if (sentences.length > 0) {
    const firstSent = sentences[0];
    const match = firstSent.match(/^([^,:;–—]+)/);
    if (match && match[1] && match[1].split(/\s+/).length <= 10) {
      title = match[1].trim();
    } else if (sortedKeywords.length >= 2) {
      title = `${sortedKeywords[0]} & ${sortedKeywords[1]} Analysis`;
    }
  }

  const summaryWordCount = finalSummary.trim().split(/\s+/).filter(Boolean).length;
  const compressionRatio = originalWordCount > 0
    ? Math.max(0, Math.min(98, Math.round((1 - summaryWordCount / originalWordCount) * 100)))
    : 0;

  return {
    title,
    summary: finalSummary,
    keyPoints: keyPoints.length > 0 ? keyPoints : ['Synthesized primary concepts from source document.'],
    keywords: sortedKeywords.length > 0 ? sortedKeywords : ['Analysis', 'Summary', 'Intelligence'],
    originalWordCount,
    summaryWordCount,
    compressionRatio,
    isFallback: true,
    fallbackNotice: 'Generated via SummarAI Natural Language Processing (NLP) Engine. To enable Gemini 3.8 Flash abstractive synthesis, add your GEMINI_API_KEY in Settings > Secrets.',
  };
}

// Helper to clean JSON string from LLM output
function safeParseJson<T>(rawText: string, fallback: T): T {
  try {
    let clean = rawText.trim();
    if (clean.startsWith('```json')) {
      clean = clean.substring(7);
    } else if (clean.startsWith('```')) {
      clean = clean.substring(3);
    }
    if (clean.endsWith('```')) {
      clean = clean.substring(0, clean.length - 3);
    }
    return JSON.parse(clean.trim()) as T;
  } catch (err) {
    console.error('Failed to parse Gemini JSON output:', err, 'Raw text:', rawText);
    return fallback;
  }
}

export async function summarizeText(options: SummarizeOptions): Promise<SummaryResult> {
  const ai = getAiClient();

  if (!ai) {
    // API key not configured -> use NLP Extractive Fallback
    return nlpSummarize(options);
  }

  try {
    const {
      text,
      length = 'medium',
      style = 'bullet_points',
      extractKeyPoints = true,
      extractKeywords = true,
      generateTitle = true,
      preserveFacts = true,
    } = options;

    const originalWordCount = text.trim().split(/\s+/).filter(Boolean).length;

    const lengthInstructions = {
      short: 'Be extremely concise (approx 50-90 words, 1-2 tight paragraphs or 3-4 punchy bullets). Focus solely on the core thesis.',
      medium: 'Balanced depth (approx 120-220 words). Capture the central arguments, context, and primary conclusions.',
      detailed: 'Thorough coverage (approx 250-450 words). Provide a structured, in-depth breakdown covering nuances, methodology, and implications.',
    }[length];

    const styleInstructions = {
      paragraph: 'Fluid, cohesive prose paragraphs with clear logical transitions.',
      bullet_points: 'Crisp, structured bullet points grouped with bold headers where appropriate.',
      executive: 'High-impact executive briefing: start with a TL;DR / Bottom-Line-Up-Front (BLUF), followed by strategic takeaways and actionable impacts.',
      simple: 'Explain Like I\'m 5 / Plain English: Avoid jargon, use simple analogies, make it instantly accessible to anyone.',
      academic: 'Scholarly, rigorous, formal tone: Focus on methodology, theoretical constructs, analytical critique, and citations of ideas.',
    }[style];

    const prompt = `
Analyze the following source text and generate an intelligent, coherent summary with structured metadata.

Source Text:
"""
${text}
"""

Requirements:
- Length: ${lengthInstructions}
- Format/Style: ${styleInstructions}
${preserveFacts ? '- Crucial requirement: Faithfully preserve all key figures, dates, proper nouns, numerical metrics, and core findings. Avoid unsupported claims.' : ''}
${extractKeyPoints ? '- Extract 4 to 6 decisive bullet takeaways highlighting the most important findings or principles.' : ''}
${extractKeywords ? '- Identify 5 to 8 essential indexing keywords/tags.' : ''}
${generateTitle ? '- Propose an engaging, accurate title (under 12 words).' : ''}

You must return valid JSON matching the exact schema specified.
`;

    const response = await callGeminiWithRetry(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'An accurate, engaging title for the content' },
            summary: { type: Type.STRING, description: 'The generated summary matching the requested style and length' },
            keyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of 4-6 crucial key points and takeaways',
            },
            keywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '5-8 core domain keywords or tags',
            },
          },
          required: ['title', 'summary', 'keyPoints', 'keywords'],
        },
      },
    });

    const rawText = (response.text ?? '').trim();
    const parsed = safeParseJson<Record<string, any>>(rawText || '{}', {
      title: 'Content Summary',
      summary: rawText,
      keyPoints: [],
      keywords: [],
    });

    let summaryText = '';
    if (typeof parsed.summary === 'string') {
      summaryText = parsed.summary.trim();
    } else if (Array.isArray(parsed.summary)) {
      summaryText = parsed.summary.map((s: any) => String(s)).join('\n').trim();
    } else if (parsed.summary && typeof parsed.summary === 'object') {
      summaryText = Object.values(parsed.summary).map(v => String(v)).join('\n\n').trim();
    }

    if (!summaryText) {
      summaryText = nlpSummarize(options).summary;
    }

    const keyPoints = Array.isArray(parsed.keyPoints)
      ? parsed.keyPoints.map((k: any) => String(k).trim()).filter(Boolean)
      : [];
    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords.map((k: any) => String(k).trim()).filter(Boolean)
      : [];

    const summaryWordCount = summaryText.split(/\s+/).filter(Boolean).length;
    const compressionRatio = originalWordCount > 0
      ? Math.max(0, Math.min(99, Math.round((1 - summaryWordCount / originalWordCount) * 100)))
      : 0;

    return {
      title: (typeof parsed.title === 'string' && parsed.title.trim()) ? parsed.title.trim() : 'Executive Summary',
      summary: summaryText,
      keyPoints,
      keywords,
      originalWordCount,
      summaryWordCount,
      compressionRatio,
      isFallback: false,
    };
  } catch (err: any) {
    console.warn('Gemini summarization failed after exponential backoff retries, falling back to NLP engine:', err?.message || err);
    const fallback = nlpSummarize(options);
    fallback.fallbackNotice = isServiceUnavailableError(err)
      ? 'Gemini AI is temporarily experiencing high demand (503 Service Unavailable). Retried with exponential backoff and fulfilled automatically via the Extractive NLP engine.'
      : 'Gemini AI was temporarily unavailable. Retried with exponential backoff and fulfilled automatically via the Extractive NLP engine.';
    return fallback;
  }
}

export async function summarizeLongDocument(
  chunks: string[],
  documentTitle: string,
  options?: Pick<SummarizeOptions, 'length' | 'style'>
): Promise<SummaryResult> {
  const ai = getAiClient();
  const length = options?.length || 'detailed';
  const style = options?.style || 'executive';
  const fullText = chunks.join('\n\n');
  const fullOriginalWordCount = fullText.trim().split(/\s+/).filter(Boolean).length;

  if (!ai || chunks.length === 0) {
    return summarizeText({ text: fullText, length, style });
  }

  try {
    if (chunks.length === 1) {
      return summarizeText({ text: chunks[0], length, style });
    }

    // Cap to at most 4 evenly merged sections so multi-page PDFs stay fast and avoid request timeouts
    const cappedChunks: string[] = [];
    if (chunks.length <= 4) {
      cappedChunks.push(...chunks);
    } else {
      const groupSize = Math.ceil(chunks.length / 4);
      for (let i = 0; i < chunks.length; i += groupSize) {
        cappedChunks.push(chunks.slice(i, i + groupSize).join('\n\n'));
      }
    }

    const chunkSummaries = await Promise.all(
      cappedChunks.map(async (chunk, i) => {
        try {
          const chunkPrompt = `Summarize Section ${i + 1} of the document "${documentTitle}" concisely, highlighting key concepts, data points, and conclusions:\n\n${chunk.slice(0, 12000)}`;
          const chunkRes = await callGeminiWithRetry(ai, {
            contents: chunkPrompt,
          });
          return (chunkRes.text || '').trim();
        } catch {
          return nlpSummarize({ text: chunk, length: 'short', style: 'paragraph' }).summary;
        }
      })
    );

    const combined = chunkSummaries.filter(Boolean).join('\n\n--- Next Section ---\n\n');
    const finalResult = await summarizeText({
      text: `Title: ${documentTitle}\n\nIntermediate Section Summaries:\n${combined || fullText.slice(0, 15000)}`,
      length,
      style,
      extractKeyPoints: true,
      extractKeywords: true,
      generateTitle: true,
    });

    const summaryWordCount = finalResult.summaryWordCount ?? finalResult.summary.trim().split(/\s+/).filter(Boolean).length;
    const compressionRatio = fullOriginalWordCount > 0
      ? Math.max(0, Math.min(99, Math.round((1 - summaryWordCount / fullOriginalWordCount) * 100)))
      : 0;

    return {
      ...finalResult,
      originalWordCount: fullOriginalWordCount,
      summaryWordCount,
      compressionRatio,
    };
  } catch (err) {
    const fallback = await summarizeText({ text: fullText.slice(0, 15000), length, style });
    const summaryWordCount = fallback.summaryWordCount ?? fallback.summary.trim().split(/\s+/).filter(Boolean).length;
    const compressionRatio = fullOriginalWordCount > 0
      ? Math.max(0, Math.min(99, Math.round((1 - summaryWordCount / fullOriginalWordCount) * 100)))
      : 0;

    return {
      ...fallback,
      originalWordCount: fullOriginalWordCount,
      summaryWordCount,
      compressionRatio,
    };
  }
}

export interface NotesOptions {
  text: string;
  format: 'quick_revision' | 'detailed' | 'exam_prep';
  title?: string;
}

export interface GeneratedNotes {
  title: string;
  format: string;
  executiveSummary: string;
  sections: Array<{
    heading: string;
    content: string;
    keyTerms?: Array<{ term: string; definition: string }>;
  }>;
  keyTakeaways: string[];
  examTips?: string[];
  isFallback?: boolean;
}

function nlpGenerateNotes(options: NotesOptions): GeneratedNotes {
  const { text, format, title } = options;
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 30);
  const sentences = text.replace(/([.?!])\s*(?=[A-Z0-9])/g, '$1|').split('|').map(s => s.trim()).filter(s => s.length > 25);

  const sections = paragraphs.slice(0, 4).map((para, i) => {
    const heading = para.split(/[.:\n]/)[0]?.slice(0, 50) || `Core Concept ${i + 1}`;
    const words = para.split(/\s+/).filter(w => w.length > 5 && !STOP_WORDS.has(w.toLowerCase()));
    const keyTerms = words.slice(0, 2).map(w => ({
      term: w.charAt(0).toUpperCase() + w.slice(1).replace(/[^a-zA-Z]/g, ''),
      definition: `Fundamental concept related to ${heading.toLowerCase()} discussed in this section.`,
    }));

    return {
      heading: heading.charAt(0).toUpperCase() + heading.slice(1),
      content: para,
      keyTerms,
    };
  });

  const keyTakeaways = sentences.slice(0, 5);
  const examTips = [
    'Pay special attention to direct definitions and quantitative metrics in this topic.',
    'Common pitfall: Differentiate between the primary causal factors and secondary symptoms.',
    'High-yield memory cue: Practice active recall on the core definitions listed above.',
  ];

  return {
    title: title || 'Structured Study Notes',
    format,
    executiveSummary: sentences[0] || 'Comprehensive overview of key subject principles.',
    sections: sections.length > 0 ? sections : [{ heading: 'Core Study Notes', content: text }],
    keyTakeaways,
    examTips,
    isFallback: true,
  };
}

export async function generateNotes(options: NotesOptions): Promise<GeneratedNotes> {
  const ai = getAiClient();
  if (!ai) {
    return nlpGenerateNotes(options);
  }

  try {
    const { text, format, title } = options;

    const formatInstruction = {
      quick_revision: 'Create rapid-fire review notes designed for 5-minute pre-test refresher. Focus on formulas, core axioms, definitions, and high-frequency concepts.',
      detailed: 'Create comprehensive study notes with hierarchical topic-wise explanations, in-depth context, theoretical mechanisms, and cross-topic connections.',
      exam_prep: 'Create high-yield exam preparation notes. Highlight anticipated exam questions, common pitfalls to avoid, memorization mnemonics, and essential definitions.',
    }[format];

    const prompt = `
You are an elite academic professor and learning specialist. Transform the following text into structured, high-retention study notes.

Format Type: ${format}
Instructions: ${formatInstruction}
${title ? `Topic/Title: ${title}` : ''}

Source Content:
"""
${text}
"""

Produce clean JSON matching the schema.
`;

    const response = await callGeminiWithRetry(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            executiveSummary: { type: Type.STRING },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  heading: { type: Type.STRING },
                  content: { type: Type.STRING },
                  keyTerms: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        term: { type: Type.STRING },
                        definition: { type: Type.STRING },
                      },
                      required: ['term', 'definition'],
                    },
                  },
                },
                required: ['heading', 'content'],
              },
            },
            keyTakeaways: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            examTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['title', 'executiveSummary', 'sections', 'keyTakeaways'],
        },
      },
    });

    const parsed = safeParseJson<GeneratedNotes>(response.text ?? '{}', {
      title: title || 'Study Notes',
      format,
      executiveSummary: response.text || 'Study notes successfully generated.',
      sections: [
        {
          heading: 'Core Concepts',
          content: response.text || '',
        },
      ],
      keyTakeaways: [],
      examTips: [],
    });

    return { ...parsed, isFallback: false };
  } catch (err) {
    console.warn('Gemini generateNotes failed, falling back to NLP notes:', err);
    return nlpGenerateNotes(options);
  }
}

export interface FlashcardItemGenerated {
  id: string;
  question: string;
  answer: string;
  category: string;
}

function nlpGenerateFlashcards(text: string, count: number = 8, topic?: string): { title: string; cards: FlashcardItemGenerated[] } {
  const sentences = text
    .replace(/([.?!])\s*(?=[A-Z0-9])/g, '$1|')
    .split('|')
    .map(s => s.trim())
    .filter(s => s.length > 25);

  const cards: FlashcardItemGenerated[] = [];

  for (let i = 0; i < Math.min(count, sentences.length); i++) {
    const s = sentences[i];
    const words = s.split(/\s+/);
    const subject = words.slice(0, 4).join(' ');

    cards.push({
      id: `card_nlp_${Date.now()}_${i}`,
      question: `What is the significance of ${subject.replace(/[.,]/g, '')}?`,
      answer: s,
      category: i % 2 === 0 ? 'Concept' : 'Principle',
    });
  }

  if (cards.length === 0) {
    cards.push({
      id: `card_nlp_${Date.now()}_0`,
      question: 'What is the primary thesis of this document?',
      answer: text.slice(0, 150),
      category: 'Core Thesis',
    });
  }

  return {
    title: topic || 'Recall Flashcards',
    cards,
  };
}

export async function generateFlashcards(text: string, count: number = 8, topic?: string): Promise<{ title: string; cards: FlashcardItemGenerated[] }> {
  const ai = getAiClient();
  if (!ai) {
    return nlpGenerateFlashcards(text, count, topic);
  }

  try {
    const prompt = `
Create ${count} high-yield, engaging flashcards for active recall and spaced repetition based on the provided text.
${topic ? `Topic: ${topic}` : ''}

Text:
"""
${text}
"""

Requirements:
- Each card must test one specific, unambiguous concept or definition.
- Questions should be clear, concise, and prompt deep recall (not just yes/no).
- Answers should be direct, informative, and include essential context.
- Assign an appropriate category/tag to each card (e.g. Architecture, Definition, Application, Formula).

Return JSON matching schema.
`;

    const response = await callGeminiWithRetry(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            cards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  answer: { type: Type.STRING },
                  category: { type: Type.STRING },
                },
                required: ['id', 'question', 'answer', 'category'],
              },
            },
          },
          required: ['title', 'cards'],
        },
      },
    });

    const parsed = safeParseJson(response.text ?? '{}', {
      title: topic || 'Flashcards Deck',
      cards: [] as FlashcardItemGenerated[],
    });

    const cardsWithIds = parsed.cards.map((c, i) => ({
      ...c,
      id: c.id || `card_${Date.now()}_${i}`,
    }));

    return {
      title: parsed.title || topic || 'Flashcards Deck',
      cards: cardsWithIds,
    };
  } catch (err) {
    console.warn('Gemini generateFlashcards failed, falling back to NLP flashcards:', err);
    return nlpGenerateFlashcards(text, count, topic);
  }
}

export interface QuizQuestionGenerated {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

function nlpGenerateQuiz(text: string, questionCount: number = 5, difficulty: string = 'medium'): { title: string; questions: QuizQuestionGenerated[] } {
  const sentences = text
    .replace(/([.?!])\s*(?=[A-Z0-9])/g, '$1|')
    .split('|')
    .map(s => s.trim())
    .filter(s => s.length > 30);

  const questions: QuizQuestionGenerated[] = [];

  for (let i = 0; i < Math.min(questionCount, sentences.length); i++) {
    const s = sentences[i];
    const keyTerms = s.split(/\s+/).filter(w => w.length > 5 && !STOP_WORDS.has(w.toLowerCase()));
    const focusWord = keyTerms[0] || 'this concept';

    questions.push({
      id: `q_nlp_${Date.now()}_${i}`,
      question: `According to the source text, which statement accurately reflects ${focusWord}?`,
      options: [
        s,
        `It is unrelated to ${focusWord} and serves as an auxiliary parameter.`,
        `It strictly contradicts classical theoretical frameworks without empirical support.`,
        `It operates exclusively under synthetic laboratory constraints.`,
      ],
      correctAnswer: 0,
      explanation: `The source material directly specifies: "${s}"`,
    });
  }

  if (questions.length === 0) {
    questions.push({
      id: `q_nlp_${Date.now()}_0`,
      question: 'What is the primary conclusion drawn from the analysis?',
      options: [
        text.slice(0, 100) + '...',
        'No conclusive evidence was identified in the text.',
        'The methodology requires complete restructuring.',
        'Alternative hypotheses superseded the initial hypothesis.',
      ],
      correctAnswer: 0,
      explanation: 'Derived directly from the core thesis of the provided material.',
    });
  }

  return {
    title: 'Knowledge Check Quiz',
    questions,
  };
}

export async function generateQuiz(text: string, questionCount: number = 5, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): Promise<{ title: string; questions: QuizQuestionGenerated[] }> {
  const ai = getAiClient();
  if (!ai) {
    return nlpGenerateQuiz(text, questionCount, difficulty);
  }

  try {
    const prompt = `
Generate a ${difficulty}-level multiple-choice quiz (${questionCount} questions) to test comprehension and mastery of the provided material.

Source Material:
"""
${text}
"""

Requirements:
- Exactly 4 options per question.
- Exactly 1 correct option index (0, 1, 2, or 3).
- Provide a clear, educational explanation for why the correct answer is right and why distractors are wrong.
- Questions must test understanding and application, not trivial wording.
- Distractors should be plausible and educational.

Return JSON.
`;

    const response = await callGeminiWithRetry(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  correctAnswer: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                },
                required: ['id', 'question', 'options', 'correctAnswer', 'explanation'],
              },
            },
          },
          required: ['title', 'questions'],
        },
      },
    });

    const parsed = safeParseJson(response.text ?? '{}', {
      title: 'Knowledge Check Quiz',
      questions: [] as QuizQuestionGenerated[],
    });

    const questionsWithIds = parsed.questions.map((q, i) => ({
      ...q,
      id: q.id || `q_${Date.now()}_${i}`,
      correctAnswer: Math.max(0, Math.min(3, q.correctAnswer || 0)),
    }));

    return {
      title: parsed.title || 'Knowledge Check Quiz',
      questions: questionsWithIds,
    };
  } catch (err) {
    console.warn('Gemini generateQuiz failed, falling back to NLP quiz:', err);
    return nlpGenerateQuiz(text, questionCount, difficulty);
  }
}

export interface ImageSummarizeOptions {
  imageBase64: string;
  mimeType: string;
  length?: 'short' | 'medium' | 'detailed';
  style?: 'paragraph' | 'bullet_points' | 'executive' | 'simple' | 'academic';
  promptHint?: string;
  filename?: string;
}

export interface ImageSummaryResult extends SummaryResult {
  extractedText: string;
}

export async function summarizeImage(options: ImageSummarizeOptions): Promise<ImageSummaryResult> {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('Gemini API key is required for image and camera analysis. Please configure GEMINI_API_KEY in Settings > Secrets.');
  }

  const {
    imageBase64,
    mimeType,
    length = 'medium',
    style = 'bullet_points',
    promptHint,
    filename,
  } = options;

  const lengthInstructions = {
    short: 'Be concise (approx 50-90 words). Focus on the main takeaway and essential details.',
    medium: 'Balanced depth (approx 120-220 words). Cover all core facts, context, and conclusions shown in the image.',
    detailed: 'Thorough breakdown (approx 250-450 words). Explain diagrams, equations, sections, and nuances thoroughly.',
  }[length];

  const styleInstructions = {
    paragraph: 'Fluid, cohesive prose paragraphs.',
    bullet_points: 'Crisp, structured bullet points with clear grouping.',
    executive: 'Executive briefing: start with a TL;DR followed by structured key insights.',
    simple: 'Plain English: clear, jargon-free explanation accessible to any learner.',
    academic: 'Formal, rigorous academic tone focusing on concepts, formulas, and analytical findings.',
  }[style];

  const imagePart = {
    inlineData: {
      mimeType,
      data: imageBase64,
    },
  };

  const textPart = {
    text: `Analyze this image carefully (${filename ? `filename: ${filename}` : 'captured photo/upload'}).
1. Transcribe or extract all readable text, headings, equations, labels, tables, or handwritten notes visible in the image into "extractedText". If the image is primarily a diagram, scene, or chart without prose, describe its visual elements and data accurately in "extractedText".
2. Generate an accurate, clear summary matching:
   - Length: ${lengthInstructions}
   - Style: ${styleInstructions}
   ${promptHint ? `- Specific user focus: ${promptHint}` : ''}
3. Extract 4 to 6 decisive key points and 5 to 8 domain keywords/tags.
4. Provide a concise, accurate title (under 12 words).

Return valid JSON matching the exact schema.`,
  };

  const response = await callGeminiWithRetry(ai, {
    contents: { parts: [imagePart, textPart] },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'Concise title describing the image content' },
          extractedText: { type: Type.STRING, description: 'Full transcribed text, formulas, or visual description extracted from the image' },
          summary: { type: Type.STRING, description: 'Generated summary matching requested length and style' },
          keyPoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '4 to 6 key takeaways from the image',
          },
          keywords: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '5 to 8 core domain keywords',
          },
        },
        required: ['title', 'extractedText', 'summary', 'keyPoints', 'keywords'],
      },
    },
  });

  const rawText = (response.text ?? '').trim();
  const parsed = safeParseJson<Record<string, any>>(rawText || '{}', {
    title: filename ? `Image Summary: ${filename}` : 'Image Intelligence Brief',
    extractedText: rawText,
    summary: rawText,
    keyPoints: [],
    keywords: [],
  });

  const extractedText = typeof parsed.extractedText === 'string' && parsed.extractedText.trim()
    ? parsed.extractedText.trim()
    : 'Visual content analyzed from uploaded image.';

  let summaryText = '';
  if (typeof parsed.summary === 'string') {
    summaryText = parsed.summary.trim();
  } else if (Array.isArray(parsed.summary)) {
    summaryText = parsed.summary.map((s: any) => String(s)).join('\n').trim();
  }
  if (!summaryText) {
    summaryText = extractedText;
  }

  const keyPoints = Array.isArray(parsed.keyPoints)
    ? parsed.keyPoints.map((k: any) => String(k).trim()).filter(Boolean)
    : [];
  const keywords = Array.isArray(parsed.keywords)
    ? parsed.keywords.map((k: any) => String(k).trim()).filter(Boolean)
    : [];

  const originalWordCount = extractedText.split(/\s+/).filter(Boolean).length;
  const summaryWordCount = summaryText.split(/\s+/).filter(Boolean).length;
  const compressionRatio = originalWordCount > 0
    ? Math.max(0, Math.min(99, Math.round((1 - summaryWordCount / originalWordCount) * 100)))
    : 0;

  return {
    title: (typeof parsed.title === 'string' && parsed.title.trim()) ? parsed.title.trim() : 'Image Intelligence Brief',
    extractedText,
    summary: summaryText,
    keyPoints,
    keywords,
    originalWordCount,
    summaryWordCount,
    compressionRatio,
    isFallback: false,
  };
}
