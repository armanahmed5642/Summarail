import React, { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  Download,
  Copy,
  Check,
  CheckCircle2,
  BookmarkCheck,
  ListOrdered,
  Lightbulb,
  FileText,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { api, downloadAsTxt, downloadAsPdf, GeneratedNotesResponse } from '../services/api';
import { useToast } from '../context/ToastContext';
import { NavigationTab } from '../components/layout/Sidebar';

interface NotesGeneratorProps {
  initialText?: string;
  onNavigateToTab?: (tab: NavigationTab, initialText?: string) => void;
}

export const NotesGenerator: React.FC<NotesGeneratorProps> = ({ initialText = '', onNavigateToTab }) => {
  const [text, setText] = useState(initialText);
  const [title, setTitle] = useState('');
  const [format, setFormat] = useState<'quick_revision' | 'detailed' | 'exam_prep'>('detailed');
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState<GeneratedNotesResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const { success, error } = useToast();

  const handleGenerate = async () => {
    if (!text.trim() || text.trim().split(/\s+/).length < 15) {
      error('Please provide at least 15 words of text to generate study notes.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await api.generateNotes({
        text,
        format,
        title: title.trim() || undefined,
      });

      setNotes(data);
      success('Study notes synthesized!');
    } catch (err: any) {
      error(err.message || 'Failed to generate study notes.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!notes) return;
    const body = `${notes.title}\nFormat: ${notes.format}\n\nOVERVIEW:\n${notes.executiveSummary}\n\n` +
      notes.sections.map(s => `${s.heading}\n${s.content}\n` + (s.keyTerms ? s.keyTerms.map(t => `- ${t.term}: ${t.definition}`).join('\n') : '')).join('\n\n') +
      `\n\nKEY TAKEAWAYS:\n${notes.keyTakeaways.map(t => `• ${t}`).join('\n')}` +
      (notes.examTips && notes.examTips.length ? `\n\nEXAM TIPS:\n${notes.examTips.map(t => `★ ${t}`).join('\n')}` : '');
    
    navigator.clipboard.writeText(body);
    setCopied(true);
    success('Notes copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!notes) return;
    const body = `${notes.title}\n==============================\nFormat: ${notes.format}\n\nOVERVIEW:\n${notes.executiveSummary}\n\n` +
      notes.sections.map(s => `## ${s.heading}\n${s.content}\n` + (s.keyTerms ? '\nKey Terms:\n' + s.keyTerms.map(t => `* ${t.term}: ${t.definition}`).join('\n') : '')).join('\n\n') +
      `\n\nKEY TAKEAWAYS:\n${notes.keyTakeaways.map(t => `• ${t}`).join('\n')}` +
      (notes.examTips && notes.examTips.length ? `\n\nEXAM PREPARATION TIPS:\n${notes.examTips.map(t => `★ ${t}`).join('\n')}` : '');
    
    downloadAsTxt(`${notes.title.replace(/\s+/g, '_')}_notes`, body);
    success('Downloaded notes as TXT');
  };

  const handleDownloadPdf = () => {
    if (!notes) return;
    const combinedContent = `${notes.executiveSummary}\n\n` +
      notes.sections.map(s => `[${s.heading}]\n${s.content}`).join('\n\n');
    downloadAsPdf(notes.title, combinedContent, notes.keyTakeaways, ['Study Notes', notes.format]);
    success('Downloaded notes as PDF');
  };

  return (
    <div className="space-y-6">
      {/* Configuration Box */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <BookOpen className="w-5 h-5 text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            AI Study Notes Generator
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              id: 'quick_revision',
              label: 'Quick Revision Notes',
              desc: 'High-frequency formulas, core axioms, and 5-minute refresher summaries.',
            },
            {
              id: 'detailed',
              label: 'Detailed Study Notes',
              desc: 'Hierarchical topic-by-topic explanations with complete theoretical context.',
            },
            {
              id: 'exam_prep',
              label: 'Exam Preparation Notes',
              desc: 'Anticipated exam traps, high-yield definitions, and memorization cues.',
            },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFormat(f.id as any)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                format === f.id
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-sm ring-1 ring-indigo-500/30'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold">{f.label}</span>
                {format === f.id && <BookmarkCheck className="w-4 h-4 text-indigo-600 dark:text-cyan-400" />}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                {f.desc}
              </p>
            </button>
          ))}
        </div>

        <div className="space-y-3 pt-2">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Optional Subject / Chapter Title (e.g. Organic Chemistry - Reaction Mechanisms)"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste textbook excerpts, lecture transcripts, or article text here to generate structured study notes..."
            rows={6}
            className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-400 font-mono">
            {text.trim().split(/\s+/).filter(Boolean).length} words
          </span>

          <button
            onClick={handleGenerate}
            disabled={isLoading || !text.trim()}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Structuring Study Notes...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Notes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated Notes Display */}
      {notes && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800 gap-4">
            <div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-cyan-400 uppercase tracking-wider">
                {notes.format.replace('_', ' ')}
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1.5">
                {notes.title}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Copy"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={handleDownloadTxt}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 transition-colors"
              >
                Download TXT
              </button>
              <button
                onClick={handleDownloadPdf}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
              >
                Export PDF
              </button>
            </div>
          </div>

          {/* Overview */}
          <div className="p-5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-800/40">
            <h4 className="text-xs font-bold text-indigo-600 dark:text-cyan-400 uppercase tracking-wider mb-2">
              Executive Concept Overview
            </h4>
            <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
              {notes.executiveSummary}
            </p>
          </div>

          {/* Structured Sections */}
          <div className="space-y-6">
            {notes.sections.map((sec, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-3"
              >
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-cyan-400 flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </span>
                  <span>{sec.heading}</span>
                </h4>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {sec.content}
                </p>

                {/* Key Terms */}
                {sec.keyTerms && sec.keyTerms.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Crucial Definitions:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {sec.keyTerms.map((term, tIdx) => (
                        <div
                          key={tIdx}
                          className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-xs"
                        >
                          <span className="font-bold text-indigo-600 dark:text-cyan-400 mr-1.5">
                            {term.term}:
                          </span>
                          <span className="text-slate-600 dark:text-slate-300">{term.definition}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Key Takeaways */}
          {notes.keyTakeaways && notes.keyTakeaways.length > 0 && (
            <div className="p-5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/40 dark:border-emerald-800/30 space-y-2">
              <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>High-Yield Takeaways</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                {notes.keyTakeaways.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Exam Tips if present */}
          {notes.examTips && notes.examTips.length > 0 && (
            <div className="p-5 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-800/30 space-y-2">
              <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4" />
                <span>Exam Strategy & Pitfalls</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                {notes.examTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold shrink-0">★</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Learning Handoff */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs text-slate-400">Master these study notes:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigateToTab?.('flashcards', notes.executiveSummary)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-100 transition-colors flex items-center gap-1.5"
              >
                <Layers className="w-4 h-4" />
                <span>Create Flashcards</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateToTab?.('quiz-generator', notes.executiveSummary)}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 text-xs font-bold hover:bg-cyan-100 transition-colors flex items-center gap-1.5"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Generate Quiz</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
