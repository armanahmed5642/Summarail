import { jsPDF } from 'jspdf';
import {
  Summary,
  FlashcardDeck,
  QuizRecord,
  DashboardStats,
  SummaryLength,
  SummaryStyle,
} from '../types';

const TOKEN_KEY = 'summarai_auth_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

const RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterRatio?: number;
}

export class ApiServiceError extends Error {
  status: number;
  retryable: boolean;

  constructor(message: string, status: number, retryable: boolean = false) {
    super(message);
    this.name = 'ApiServiceError';
    this.status = status;
    this.retryable = retryable;
  }
}

function sleepWithAbort(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('The operation was aborted.', 'AbortError'));
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function getRetryAfterMs(headers: Headers): number | null {
  const raw = headers.get('Retry-After');
  if (!raw) return null;

  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(10000, Math.round(seconds * 1000));
  }

  const timestamp = Date.parse(raw);
  if (!Number.isNaN(timestamp)) {
    return Math.min(10000, Math.max(0, timestamp - Date.now()));
  }

  return null;
}

function calculateBackoffDelayMs(
  retryAttemptIndex: number,
  options: RetryOptions,
  retryAfterMs?: number | null
): number {
  const baseDelayMs = options.baseDelayMs ?? 600;
  const maxDelayMs = options.maxDelayMs ?? 5000;
  const jitterRatio = options.jitterRatio ?? 0.3;

  const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, retryAttemptIndex));
  const jitter = Math.floor(Math.random() * Math.max(1, exponentialDelay * jitterRatio));
  const computed = Math.min(maxDelayMs, exponentialDelay + jitter);

  if (typeof retryAfterMs === 'number' && Number.isFinite(retryAfterMs)) {
    return Math.min(maxDelayMs, Math.max(computed, retryAfterMs));
  }

  return computed;
}

function formatHttpErrorMessage(status: number, rawMessage?: string): string {
  if (status === 503 || (rawMessage && /"code"\s*:\s*503|UNAVAILABLE|high demand/i.test(rawMessage))) {
    return 'The AI service is currently experiencing high demand (503 Service Unavailable). Automatic retries exhausted—please try again in a few moments.';
  }
  return rawMessage || `Request failed with status ${status}`;
}

async function request<T>(
  endpoint: string,
  options: RequestInit & { retry?: RetryOptions } = {}
): Promise<T> {
  const { retry, ...fetchOptions } = options;
  const retryConfig: RetryOptions = {
    maxRetries: retry?.maxRetries ?? 3,
    baseDelayMs: retry?.baseDelayMs ?? 600,
    maxDelayMs: retry?.maxDelayMs ?? 5000,
    jitterRatio: retry?.jitterRatio ?? 0.3,
  };

  const token = getAuthToken();
  const headers = new Headers(fetchOptions.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(fetchOptions.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const maxRetries = retryConfig.maxRetries ?? 3;
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(endpoint, {
        ...fetchOptions,
        headers,
      });

      const rawText = await res.text();
      let data: any = null;
      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          data = null;
        }
      }

      if (!res.ok) {
        const isRetryableStatus = RETRYABLE_STATUS_CODES.has(res.status);
        if (isRetryableStatus && attempt < maxRetries) {
          const delayMs = calculateBackoffDelayMs(attempt, retryConfig, getRetryAfterMs(res.headers));
          await sleepWithAbort(delayMs, fetchOptions.signal);
          continue;
        }

        throw new ApiServiceError(
          formatHttpErrorMessage(res.status, data?.error),
          res.status,
          isRetryableStatus
        );
      }

      if (!data || typeof data !== 'object') {
        throw new ApiServiceError(
          'Unexpected response format from server. Please try again.',
          res.status,
          false
        );
      }

      return data as T;
    } catch (err: any) {
      lastError = err;
      if (err?.name === 'AbortError') {
        throw err;
      }

      const isNetworkError = !(err instanceof ApiServiceError) && err instanceof TypeError;
      const isRetryableApiError = err instanceof ApiServiceError && err.retryable;

      if ((isNetworkError || isRetryableApiError) && attempt < maxRetries) {
        const delayMs = calculateBackoffDelayMs(attempt, retryConfig);
        await sleepWithAbort(delayMs, fetchOptions.signal);
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}

export interface SummarizeTextParams {
  text: string;
  length?: SummaryLength;
  style?: SummaryStyle;
  extractKeyPoints?: boolean;
  extractKeywords?: boolean;
  generateTitle?: boolean;
  preserveFacts?: boolean;
  saveToHistory?: boolean;
}

export interface SummarizeTextResponse {
  title: string;
  summary: string;
  keyPoints: string[];
  keywords: string[];
  summaryWordCount: number;
  originalWordCount: number;
  compressionRatio: number;
  summaryId?: string;
  isFallback?: boolean;
  fallbackNotice?: string;
}

export interface SummarizePdfResponse extends SummarizeTextResponse {
  filename: string;
  fileSize: number;
  pageCount: number;
  documentId?: string;
}

export interface SummarizeArticleResponse extends SummarizeTextResponse {
  articleTitle: string;
  sourceDomain: string;
  sourceUrl?: string;
}

export interface SummarizeImageResponse extends SummarizeTextResponse {
  extractedText: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  documentId?: string;
}

export interface GeneratedNotesResponse {
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
}

export const api = {
  // Auth
  register: (body: { name: string; email: string; password: string }) =>
    request<{ token: string; user: any }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  googleLogin: (body: { email?: string; name?: string; profileImage?: string }) =>
    request<{ token: string; user: any }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getMe: () => request<any>('/api/auth/me'),

  // Summarize
  summarizeText: (params: SummarizeTextParams) =>
    request<SummarizeTextResponse>('/api/summarize/text', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  summarizePdf: (file: File, options?: { length?: string; style?: string }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.length) formData.append('length', options.length);
    if (options?.style) formData.append('style', options.style);

    return request<SummarizePdfResponse>('/api/summarize/pdf', {
      method: 'POST',
      body: formData,
    });
  },

  summarizeArticle: (params: { url?: string; rawText?: string; length?: string; style?: string }) =>
    request<SummarizeArticleResponse>('/api/summarize/article', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  summarizeImage: (
    file: File | Blob,
    options?: { filename?: string; length?: string; style?: string; promptHint?: string }
  ) => {
    const formData = new FormData();
    const resolvedName = options?.filename || (file instanceof File ? file.name : 'camera_capture.jpg');
    formData.append('file', file, resolvedName);
    if (options?.length) formData.append('length', options.length);
    if (options?.style) formData.append('style', options.style);
    if (options?.promptHint) formData.append('promptHint', options.promptHint);

    return request<SummarizeImageResponse>('/api/summarize/image', {
      method: 'POST',
      body: formData,
    });
  },

  // Notes
  generateNotes: (params: { text: string; format: 'quick_revision' | 'detailed' | 'exam_prep'; title?: string }) =>
    request<GeneratedNotesResponse>('/api/notes/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  // Flashcards
  generateFlashcards: (params: { text: string; count?: number; topic?: string }) =>
    request<{ deckId?: string; title: string; cards: any[] }>('/api/flashcards/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  getFlashcards: () => request<FlashcardDeck[]>('/api/flashcards'),

  getFlashcardDeck: (id: string) => request<FlashcardDeck>(`/api/flashcards/${id}`),

  updateCardMastery: (deckId: string, cardId: string, mastered: boolean) =>
    request<FlashcardDeck>(`/api/flashcards/${deckId}/mastery`, {
      method: 'PUT',
      body: JSON.stringify({ cardId, mastered }),
    }),

  deleteFlashcardDeck: (id: string) =>
    request<{ success: boolean }>(`/api/flashcards/${id}`, {
      method: 'DELETE',
    }),

  // Quiz
  generateQuiz: (params: { text: string; questionCount?: number; difficulty?: string; topic?: string }) =>
    request<{ quizId?: string; title: string; questions: any[] }>('/api/quiz/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  getQuizzes: () => request<QuizRecord[]>('/api/quiz'),

  getQuiz: (id: string) => request<QuizRecord>(`/api/quiz/${id}`),

  submitQuiz: (quizId: string, userAnswers: Record<string, number>) =>
    request<{ score: number; total: number; percentage: number; breakdown: any[] }>(`/api/quiz/${quizId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ userAnswers }),
    }),

  deleteQuiz: (id: string) =>
    request<{ success: boolean }>(`/api/quiz/${id}`, {
      method: 'DELETE',
    }),

  // History
  getHistory: (type?: string, search?: string) => {
    const params = new URLSearchParams();
    if (type && type !== 'all') params.append('type', type);
    if (search) params.append('search', search);
    return request<Summary[]>(`/api/history?${params.toString()}`);
  },

  getHistoryItem: (id: string) => request<Summary>(`/api/history/${id}`),

  updateHistoryItem: (id: string, title: string) =>
    request<Summary>(`/api/history/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title }),
    }),

  deleteHistoryItem: (id: string) =>
    request<{ success: boolean }>(`/api/history/${id}`, {
      method: 'DELETE',
    }),

  // User Profile & Stats
  getProfile: () => request<any>('/api/user/profile'),

  updateProfile: (profile: { name?: string; profile_image?: string }) =>
    request<any>('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    }),

  updatePreferences: (preferences: any) =>
    request<any>('/api/user/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    }),

  updatePassword: (body: { currentPassword?: string; newPassword: string }) =>
    request<{ success: boolean; message: string }>('/api/user/password', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteAccount: () =>
    request<{ success: boolean; message: string }>('/api/user/account', {
      method: 'DELETE',
    }),

  getStats: () => request<DashboardStats>('/api/stats'),
};

// Document Export Utilities
export function downloadAsTxt(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.txt') ? filename : `${filename}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadAsPdf(title: string, summary: string, keyPoints: string[] = [], keywords: string[] = []) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxLineWidth = pageWidth - margin * 2;
  let cursorY = 25;

  // Header banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(99, 102, 241); // #6366F1
  doc.text('SummarAI', margin, cursorY);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('AI-Generated Intelligence Brief', margin + 45, cursorY - 1);

  cursorY += 12;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 12;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // slate-900
  const titleLines = doc.splitTextToSize(title, maxLineWidth);
  doc.text(titleLines, margin, cursorY);
  cursorY += titleLines.length * 7 + 6;

  // Date
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated on ${new Date().toLocaleDateString()} with SummarAI`, margin, cursorY);
  cursorY += 10;

  // Summary Heading
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(99, 102, 241);
  doc.text('EXECUTIVE SUMMARY', margin, cursorY);
  cursorY += 7;

  // Summary text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  const summaryLines = doc.splitTextToSize(summary, maxLineWidth);

  for (const line of summaryLines) {
    if (cursorY > 270) {
      doc.addPage();
      cursorY = 20;
    }
    doc.text(line, margin, cursorY);
    cursorY += 6;
  }

  // Key Points
  if (keyPoints.length > 0) {
    cursorY += 8;
    if (cursorY > 260) {
      doc.addPage();
      cursorY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(99, 102, 241);
    doc.text('KEY TAKEAWAYS', margin, cursorY);
    cursorY += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);

    for (const point of keyPoints) {
      const pointLines = doc.splitTextToSize(`• ${point}`, maxLineWidth - 5);
      for (const pl of pointLines) {
        if (cursorY > 270) {
          doc.addPage();
          cursorY = 20;
        }
        doc.text(pl, margin + 4, cursorY);
        cursorY += 6;
      }
      cursorY += 2;
    }
  }

  // Keywords
  if (keywords.length > 0) {
    cursorY += 6;
    if (cursorY > 270) {
      doc.addPage();
      cursorY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Keywords: ${keywords.join(', ')}`, margin, cursorY);
  }

  const safeFilename = title.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
  doc.save(`${safeFilename}_Summary.pdf`);
}
