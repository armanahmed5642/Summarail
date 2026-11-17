import React, { useState, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  Copy,
  Download,
  RotateCcw,
  Trash2,
  BookmarkCheck,
  Check,
  Sliders,
  Layers,
  HelpCircle,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { api, downloadAsTxt, downloadAsPdf, SummarizeTextResponse } from '../services/api';
import { Summary, SummaryLength, SummaryStyle } from '../types';
import { useToast } from '../context/ToastContext';
import { NavigationTab } from '../components/layout/Sidebar';

interface TextSummarizerProps {
  onNavigateToTab?: (tab: NavigationTab, initialText?: string) => void;
  initialText?: string;
  initialSummary?: Summary | null;
}

const SAMPLE_TEXT = `Artificial Intelligence (AI) and Machine Learning (ML) have evolved from academic curiosities into foundational drivers of modern technological civilization. At the core of the ongoing generative revolution is the Transformer architecture, pioneered in 2017. Transformers discarded previous sequential processing paradigms—namely Recurrent Neural Networks (RNNs) and Long Short-Term Memory networks (LSTMs)—in favor of a parallelized self-attention mechanism.

In conventional recurrent models, computations must unfold step-by-step along the sequence axis, creating significant bottlenecks in modern GPU architectures. Self-attention fundamentally resolves this by computing attention coefficients across all token positions simultaneously. By mapping queries, keys, and values through learned linear projections across multiple heads, the model attends to information from distinct representation subspaces at disparate positions.

Despite extraordinary empirical success, frontier foundation models face substantive challenges. These include astronomical computational energy demands, hallucinations wherein models invent fabricated citations, and difficulties in long-horizon reasoning. Modern alignment strategies, including Reinforcement Learning from Human Feedback (RLHF), Direct Preference Optimization (DPO), and test-time reasoning compute, represent current frontiers in mitigating these shortcomings. As research moves toward autonomous agents, guaranteeing verifiable grounding, safety, and auditability remains paramount.`;

export const TextSummarizer: React.FC<TextSummarizerProps> = ({
  onNavigateToTab,
  initialText = '',
  initialSummary = null,
}) => {
  const [inputText, setInputText] = useState(initialSummary?.original_text || initialText);
  const [length, setLength] = useState<SummaryLength>('medium');
  const [style, setStyle] = useState<SummaryStyle>('bullet_points');
  const [extractKeyPoints, setExtractKeyPoints] = useState(true);
  const [extractKeywords, setExtractKeywords] = useState(true);
  const [generateTitle, setGenerateTitle] = useState(true);
  const [preserveFacts, setPreserveFacts] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SummarizeTextResponse | null>(() =>
    initialSummary
      ? {
          title: initialSummary.title,
          summary: initialSummary.summary,
          keyPoints: initialSummary.key_points || [],
          keywords: initialSummary.keywords || [],
          originalWordCount: initialSummary.original_word_count,
          summaryWordCount: initialSummary.summary_word_count,
          compressionRatio: initialSummary.compression_ratio,
          summaryId: initialSummary._id,
        }
      : null
  );
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const { success, error, info } = useToast();

  useEffect(() => {
    if (initialSummary) {
      setInputText(initialSummary.original_text || initialSummary.summary || '');
      setResult({
        title: initialSummary.title,
        summary: initialSummary.summary,
        keyPoints: initialSummary.key_points || [],
        keywords: initialSummary.keywords || [],
        originalWordCount: initialSummary.original_word_count,
        summaryWordCount: initialSummary.summary_word_count,
        compressionRatio: initialSummary.compression_ratio,
        summaryId: initialSummary._id,
      });
    } else if (initialText) {
      setInputText(initialText);
    }
  }, [initialSummary, initialText]);

  const wordCount = inputText.trim().split(/\s+/).filter(Boolean).length;
  const charCount = inputText.length;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputText(text);
        success('Pasted from clipboard!');
      }
    } catch {
      info('Please paste directly using Ctrl+V / Cmd+V into the text area.');
    }
  };

  const handleLoadSample = () => {
    setInputText(SAMPLE_TEXT);
    success('Sample text loaded!');
  };

  const handleClear = () => {
    setInputText('');
    setResult(null);
  };

  const handleGenerate = async () => {
    if (wordCount < 10) {
      error('Please enter at least 10 words of text to summarize.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await api.summarizeText({
        text: inputText,
        length,
        style,
        extractKeyPoints,
        extractKeywords,
        generateTitle,
        preserveFacts,
        saveToHistory: true,
      });

      const normalizedSummary =
        typeof data?.summary === 'string'
          ? data.summary.trim()
          : Array.isArray(data?.summary)
          ? (data.summary as unknown[]).map(item => String(item)).join('\n')
          : '';

      if (!normalizedSummary) {
        error('The summarizer returned an empty summary. Please try again.');
        return;
      }

      setResult({
        ...data,
        title: data.title || 'Executive Summary',
        summary: normalizedSummary,
        keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : [],
        keywords: Array.isArray(data.keywords) ? data.keywords : [],
      });
      success('Summary synthesized successfully!');
    } catch (err: any) {
      error(err.message || 'Summarization failed. Please verify connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const content = `${result.title}\n\n${result.summary}\n\nKey Takeaways:\n${result.keyPoints.map(p => `• ${p}`).join('\n')}`;
    navigator.clipboard.writeText(content);
    setCopied(true);
    success('Summary copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!result) return;
    const content = `TITLE: ${result.title}
DATE: ${new Date().toLocaleDateString()}
ORIGINAL WORDS: ${result.originalWordCount}
SUMMARY WORDS: ${result.summaryWordCount} (Compression: ${result.compressionRatio}%)

SUMMARY:
${result.summary}

KEY TAKEAWAYS:
${result.keyPoints.map(p => `• ${p}`).join('\n')}

KEYWORDS:
${result.keywords.join(', ')}

Generated with SummarAI (https://summarai.app)
`;
    downloadAsTxt(`${result.title.replace(/\s+/g, '_')}_summary`, content);
    success('Downloaded summary as TXT');
  };

  const handleDownloadPdf = () => {
    if (!result) return;
    downloadAsPdf(result.title, result.summary, result.keyPoints, result.keywords);
    success('Downloaded summary as PDF');
  };

  const handleSaveSummary = () => {
    if (!result) return;
    setIsSaved(true);
    success('Summary saved to your library history!');
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  return (
    <div className="space-y-6">
      {/* Settings Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <Sliders className="w-4 h-4 text-indigo-500" />
          <span>Summarization Parameters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Summary Length */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Summary Length
            </label>
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
              {(['short', 'medium', 'detailed'] as SummaryLength[]).map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLength(l)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                    length === l
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-cyan-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Summary Style */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Summary Tone & Format
            </label>
            <select
              value={style}
              onChange={e => setStyle(e.target.value as SummaryStyle)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="bullet_points">Bullet Points (Structured)</option>
              <option value="paragraph">Cohesive Paragraph (Narrative)</option>
              <option value="executive">Executive Summary (TL;DR + Actionable)</option>
              <option value="simple">Simple Language (Plain English)</option>
              <option value="academic">Academic Style (Scholarly)</option>
            </select>
          </div>

          {/* Additional Options */}
          <div className="sm:col-span-2 flex flex-wrap items-center gap-4 pt-4 sm:pt-6">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300 select-none">
              <input
                type="checkbox"
                checked={extractKeyPoints}
                onChange={e => setExtractKeyPoints(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
              />
              <span>Extract Key Points</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300 select-none">
              <input
                type="checkbox"
                checked={extractKeywords}
                onChange={e => setExtractKeywords(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
              />
              <span>Extract Keywords</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300 select-none">
              <input
                type="checkbox"
                checked={preserveFacts}
                onChange={e => setPreserveFacts(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
              />
              <span>Preserve Metrics & Dates</span>
            </label>
          </div>
        </div>
      </div>

      {/* Main Dual Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input Textarea */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[460px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                <FileText className="w-4 h-4 text-indigo-500" />
                <span>Source Text Input</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePaste}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Paste
                </button>
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-cyan-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                >
                  Load Example
                </button>
                {inputText && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                    title="Clear text"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Paste any article, research excerpt, essay, or lecture notes here (minimum 10 words)..."
              className="w-full mt-3 h-80 p-3 rounded-xl bg-transparent border-0 text-slate-800 dark:text-slate-100 text-sm leading-relaxed focus:outline-none placeholder-slate-400 resize-none font-sans"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-400 font-mono">
              <span>{wordCount.toLocaleString()} words</span>
              <span className="mx-2">•</span>
              <span>{charCount.toLocaleString()} characters</span>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isLoading || wordCount < 10}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all flex items-center gap-2 active:scale-95"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Summary</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Output Panel */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[460px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-500" />
                  <span>AI Executive Output</span>
                </span>
                {result && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {result.compressionRatio}% Compression
                  </span>
                )}
              </div>

              {result && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={handleRegenerate}
                    disabled={isLoading}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs font-semibold"
                    title="Regenerate Summary"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Regenerate</span>
                  </button>

                  <button
                    onClick={handleSaveSummary}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs font-semibold"
                    title="Save Summary to History"
                  >
                    <BookmarkCheck className={`w-3.5 h-3.5 ${isSaved ? 'text-emerald-500' : ''}`} />
                    <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
                  </button>

                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs font-semibold"
                    title="Copy Summary"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">Copy</span>
                  </button>

                  <button
                    onClick={handleDownloadTxt}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs font-semibold"
                    title="Download as TXT"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>TXT</span>
                  </button>

                  <button
                    onClick={handleDownloadPdf}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors flex items-center gap-1"
                    title="Download Formatted PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                </div>
              )}
            </div>

            {/* Output Content */}
            {!result && !isLoading && (
              <div className="h-80 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-slate-800/80 flex items-center justify-center text-indigo-500 mb-3">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Ready to Summarize
                </h4>
                <p className="text-xs max-w-sm mt-1 text-slate-500">
                  Paste your text on the left, pick your preferred length and tone, then click Generate Summary.
                </p>
              </div>
            )}

            {isLoading && (
              <div className="h-80 flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-cyan-400 animate-bounce">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Abstractive NLP Synthesis in Progress...
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Preserving core facts, computing key takeaways, and compressing text with Gemini 3.8 Flash.
                  </p>
                </div>
              </div>
            )}

            {result && !isLoading && (
              <div className="mt-3 space-y-4 max-h-[540px] overflow-y-auto pr-1 custom-scrollbar">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                    {result.title}
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                    <span>{result.summaryWordCount} words</span>
                    <span>•</span>
                    <span>Down from {result.originalWordCount} words</span>
                  </div>
                </div>

                {result.isFallback && result.fallbackNotice && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{result.fallbackNotice}</span>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
                  {result.summary}
                </div>

                {/* Key Points */}
                {result.keyPoints && result.keyPoints.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-indigo-600 dark:text-cyan-400 uppercase tracking-wider">
                      Key Takeaways
                    </span>
                    <ul className="space-y-1.5">
                      {result.keyPoints.map((pt, i) => (
                        <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-cyan-400 mt-1.5 shrink-0" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Keywords */}
                {result.keywords && result.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {result.keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Learning Tool Handoffs */}
          {result && !isLoading && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400">Next Learning Steps:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigateToTab?.('flashcards', result.summary)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition-colors flex items-center gap-1"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Generate Flashcards</span>
                </button>
                <button
                  onClick={() => onNavigateToTab?.('quiz-generator', result.summary)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-100 transition-colors flex items-center gap-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Create Quiz</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
