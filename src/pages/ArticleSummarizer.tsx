import React, { useState } from 'react';
import {
  Globe,
  Sparkles,
  ExternalLink,
  Copy,
  Download,
  AlertCircle,
  Check,
  FileText,
  Layers,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { api, downloadAsTxt, downloadAsPdf, SummarizeArticleResponse } from '../services/api';
import { useToast } from '../context/ToastContext';
import { NavigationTab } from '../components/layout/Sidebar';

interface ArticleSummarizerProps {
  onNavigateToTab?: (tab: NavigationTab, initialText?: string) => void;
}

export const ArticleSummarizer: React.FC<ArticleSummarizerProps> = ({ onNavigateToTab }) => {
  const [url, setUrl] = useState('');
  const [manualText, setManualText] = useState('');
  const [activeTab, setActiveTab] = useState<'url' | 'manual'>('url');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SummarizeArticleResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const { success, error, info } = useToast();

  const handleFetchAndSummarize = async () => {
    if (activeTab === 'url') {
      if (!url.trim().startsWith('http://') && !url.trim().startsWith('https://')) {
        error('Please enter a valid URL starting with http:// or https://');
        return;
      }
    } else {
      if (!manualText.trim() || manualText.trim().split(/\s+/).length < 20) {
        error('Please paste at least 20 words of article text.');
        return;
      }
    }

    setIsLoading(true);
    try {
      const data = await api.summarizeArticle({
        url: activeTab === 'url' ? url.trim() : undefined,
        rawText: activeTab === 'manual' ? manualText.trim() : undefined,
        length: 'medium',
        style: 'bullet_points',
      });

      setResult(data);
      success('Article extracted and summarized!');
    } catch (err: any) {
      error(err.message || 'Article extraction failed. You can switch to the "Paste Article" tab as a fallback.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(`${result.title}\n\n${result.summary}`);
    setCopied(true);
    success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Input Box */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-500" />
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Web Article Summarizer
            </span>
          </div>

          {/* Mode Switch */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            <button
              onClick={() => setActiveTab('url')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'url'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Enter URL
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'manual'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Paste Fallback
            </button>
          </div>
        </div>

        {activeTab === 'url' ? (
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
              Article or Blog Post Web Address
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://example.com/blog/future-of-artificial-intelligence"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={handleFetchAndSummarize}
                disabled={isLoading || !url.trim()}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Fetching...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Fetch & Summarize</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span>Protected against SSRF and private intranet queries. Paywalled sites will fallback to manual text.</span>
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
              Paste Article Body Directly
            </label>
            <textarea
              value={manualText}
              onChange={e => setManualText(e.target.value)}
              placeholder="If the site requires a login or captcha, paste the article body directly here..."
              rows={6}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex justify-end">
              <button
                onClick={handleFetchAndSummarize}
                disabled={isLoading || !manualText.trim()}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? 'Synthesizing...' : 'Summarize Pasted Content'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Result Card */}
      {result && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-cyan-400">
                  {result.sourceDomain || 'Web Article'}
                </span>
                {result.sourceUrl && (
                  <a
                    href={result.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-400 hover:text-indigo-500 flex items-center gap-1"
                  >
                    <span>Visit original</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {result.articleTitle || result.title}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setUrl('');
                  setManualText('');
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
              >
                Analyze Another
              </button>
              <button
                onClick={handleCopy}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Copy"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={() => downloadAsTxt(result.title, result.summary)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 transition-colors"
              >
                TXT
              </button>
              <button
                onClick={() => downloadAsPdf(result.title, result.summary, result.keyPoints, result.keywords)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>
            </div>
          </div>

          {/* Summary body */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
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
            <div className="flex flex-wrap gap-1.5 pt-2">
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

          {/* Handoff */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Convert this article:</span>
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
                <span>Create Quiz</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
