import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle,
  Copy,
  Download,
  Sparkles,
  Layers,
  HelpCircle,
  Check,
  RotateCcw,
} from 'lucide-react';
import { api, downloadAsTxt, downloadAsPdf, SummarizePdfResponse } from '../services/api';
import { useToast } from '../context/ToastContext';
import { NavigationTab } from '../components/layout/Sidebar';

interface PdfSummarizerProps {
  onNavigateToTab?: (tab: NavigationTab, initialText?: string) => void;
}

export const PdfSummarizer: React.FC<PdfSummarizerProps> = ({ onNavigateToTab }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedError, setScannedError] = useState<{ message: string; pageCount?: number } | null>(null);
  const [result, setResult] = useState<SummarizePdfResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error } = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isTxt = file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');

    if (!isPdf && !isTxt) {
      error('Please select a valid PDF (.pdf) or Text (.txt) document.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      error('File size exceeds the 25MB maximum limit.');
      return;
    }

    setSelectedFile(file);
    setScannedError(null);
    setResult(null);
  };

  const handleProcess = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setUploadProgress(20);
    setScannedError(null);

    const progressTimer = setInterval(() => {
      setUploadProgress(prev => (prev < 90 ? prev + 15 : prev));
    }, 400);

    try {
      const data = await api.summarizePdf(selectedFile, {
        length: 'detailed',
        style: 'executive',
      });

      if (!data || typeof data.summary !== 'string' || !data.summary.trim()) {
        throw new Error('The server returned an empty summary for this document. Please try again.');
      }

      const summaryText = data.summary.trim();
      const summaryWords = summaryText.split(/\s+/).filter(Boolean).length;
      const normalizedOriginalWords = Number.isFinite(Number(data.originalWordCount))
        ? Number(data.originalWordCount)
        : summaryWords;
      const normalizedSummaryWords = Number.isFinite(Number(data.summaryWordCount))
        ? Number(data.summaryWordCount)
        : summaryWords;
      const normalizedCompression = Number.isFinite(Number(data.compressionRatio))
        ? Number(data.compressionRatio)
        : normalizedOriginalWords > 0
          ? Math.max(0, Math.min(99, Math.round((1 - normalizedSummaryWords / normalizedOriginalWords) * 100)))
          : 0;

      const normalized: SummarizePdfResponse = {
        ...data,
        title: typeof data.title === 'string' && data.title.trim() ? data.title.trim() : `Summary: ${selectedFile.name}`,
        summary: summaryText,
        keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints.filter(Boolean).map(String) : [],
        keywords: Array.isArray(data.keywords) ? data.keywords.filter(Boolean).map(String) : [],
        filename: typeof data.filename === 'string' && data.filename.trim() ? data.filename : selectedFile.name,
        fileSize: Number.isFinite(Number(data.fileSize)) ? Number(data.fileSize) : selectedFile.size,
        pageCount: Number.isFinite(Number(data.pageCount)) && Number(data.pageCount) > 0 ? Number(data.pageCount) : 1,
        originalWordCount: normalizedOriginalWords,
        summaryWordCount: normalizedSummaryWords,
        compressionRatio: normalizedCompression,
      };

      clearInterval(progressTimer);
      setUploadProgress(100);
      setResult(normalized);
      success(`Successfully digested ${normalized.filename} (${normalized.pageCount} ${normalized.pageCount === 1 ? 'page' : 'pages'})!`);
    } catch (err: any) {
      clearInterval(progressTimer);
      setUploadProgress(0);
      if (err.message && err.message.includes('scanned image')) {
        setScannedError({
          message: err.message,
          pageCount: 1,
        });
      } else {
        error(err.message || 'Failed to extract and summarize PDF.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const keyPointsText = (result.keyPoints || []).map(p => `• ${p}`).join('\n');
    const content = `${result.title}\n\n${result.summary}${keyPointsText ? `\n\nKey Points:\n${keyPointsText}` : ''}`;
    navigator.clipboard.writeText(content);
    setCopied(true);
    success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!result) return;
    const baseName = (result.filename || selectedFile?.name || 'document').replace(/\.(pdf|txt)$/i, '');
    downloadAsTxt(`${baseName}_summary`, result.summary || '');
    success('Downloaded summary TXT');
  };

  const handleDownloadPdf = () => {
    if (!result) return;
    downloadAsPdf(
      result.title || 'Document Summary',
      result.summary || '',
      Array.isArray(result.keyPoints) ? result.keyPoints : [],
      Array.isArray(result.keywords) ? result.keywords : []
    );
    success('Downloaded PDF summary');
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="max-w-2xl mx-auto text-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.txt,application/pdf,text/plain"
            className="hidden"
          />

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-8 sm:p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[1.01]'
                : 'border-slate-200 dark:border-slate-700/80 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-800/20'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-cyan-400 mx-auto mb-4 shadow-inner">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Drag and drop your PDF here, or <span className="text-indigo-600 dark:text-cyan-400 underline">browse</span>
            </h3>
            <p className="mt-1.5 text-xs text-slate-400 max-w-sm mx-auto">
              Supports textbooks, research papers, reports, and dissertation drafts up to 25MB (PDF or TXT).
            </p>

            {selectedFile && (
              <div
                onClick={e => e.stopPropagation()}
                className="mt-6 inline-flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-left max-w-md mx-auto"
              >
                <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready to analyze
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-xs text-slate-400 hover:text-rose-500 px-2 py-1"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {selectedFile && !result && (
            <div className="mt-6 flex flex-col items-center">
              <button
                onClick={handleProcess}
                disabled={isProcessing}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing Document Chunks ({uploadProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Process & Summarize PDF</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Scanned PDF Warning Banner */}
      {scannedError && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-amber-400">
              Scanned Image PDF Detected
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              This document consists of scanned raster images without an embedded digital text layer. SummarAI's abstractive neural models require selectable text.
            </p>
            <p className="text-xs text-amber-300 font-semibold pt-1">
              Tip: Run your document through an OCR tool (like Adobe Acrobat or Google Drive OCR) or paste the extracted text directly in the Text Summarizer workspace.
            </p>
          </div>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-600 dark:text-cyan-400 uppercase tracking-wider">
                  Document Intelligence Brief
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {Number(result.pageCount ?? 1)} {Number(result.pageCount ?? 1) === 1 ? 'Page' : 'Pages'} Processed
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {result.title || 'Document Summary'}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setResult(null);
                  setSelectedFile(null);
                  setUploadProgress(0);
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Upload Another</span>
              </button>
              <button
                onClick={handleCopy}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Copy Summary"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={handleDownloadTxt}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 transition-colors"
              >
                TXT
              </button>
              <button
                onClick={handleDownloadPdf}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>
            </div>
          </div>

          {result.fallbackNotice && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-200">
              {result.fallbackNotice}
            </div>
          )}

          {/* Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-bold">Source File</span>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                {result.filename || selectedFile?.name || 'Document'}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-bold">Page Count</span>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {Number(result.pageCount ?? 1)} {Number(result.pageCount ?? 1) === 1 ? 'Page' : 'Pages'}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-bold">Original Size</span>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {Number(result.originalWordCount ?? 0).toLocaleString()} Words
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-bold">Compression</span>
              <p className="text-xs font-bold text-emerald-500 mt-0.5">
                {Number(result.compressionRatio ?? 0)}% Reduced
              </p>
            </div>
          </div>

          {/* Executive Synthesis */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Executive Synthesis
            </h4>
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
              {result.summary}
            </div>
          </div>

          {/* Key Points */}
          {result.keyPoints && result.keyPoints.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-indigo-600 dark:text-cyan-400 uppercase tracking-wider">
                Crucial Findings & Chapter Key Points
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {result.keyPoints.map((pt, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-200 flex items-start gap-2.5"
                  >
                    <CheckCircle className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                    <span>{pt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Keywords */}
          {result.keywords && result.keywords.length > 0 && (
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 mr-2">Indexing Tags:</span>
              {result.keywords.map((kw, i) => (
                <span
                  key={i}
                  className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  #{kw}
                </span>
              ))}
            </div>
          )}

          {/* Learning Handoffs */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs text-slate-400">Continue studying this document:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigateToTab?.('flashcards', result.summary)}
                className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-100 transition-colors flex items-center gap-1.5"
              >
                <Layers className="w-4 h-4" />
                <span>Create Flashcards</span>
              </button>
              <button
                onClick={() => onNavigateToTab?.('quiz-generator', result.summary)}
                className="px-3 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 text-xs font-bold hover:bg-cyan-100 transition-colors flex items-center gap-1.5"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Take Comprehension Quiz</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
