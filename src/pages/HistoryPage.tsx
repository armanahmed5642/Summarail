import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  FileText,
  FileSpreadsheet,
  Globe,
  BookOpen,
  Calendar,
  Trash2,
  Edit2,
  Check,
  Download,
  Copy,
  ExternalLink,
  X,
  Sparkles,
  Layers,
  HelpCircle,
  Camera,
} from 'lucide-react';
import { api, downloadAsTxt, downloadAsPdf } from '../services/api';
import { Summary, SummaryType } from '../types';
import { useToast } from '../context/ToastContext';
import { NavigationTab } from '../components/layout/Sidebar';

interface HistoryPageProps {
  onOpenSummary?: (summary: Summary) => void;
  onNavigateToTab?: (tab: NavigationTab, initialText?: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onOpenSummary, onNavigateToTab }) => {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Summary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [loading, setLoading] = useState(true);

  const { success, error } = useToast();

  useEffect(() => {
    loadHistory();
  }, [typeFilter]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getHistory(typeFilter, search);
      setSummaries(data);
    } catch {
      error('Failed to load summary history.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadHistory();
  };

  const handlePromptDelete = (item: Summary, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete(item);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteHistoryItem(itemToDelete._id);
      success('Summary deleted from history.');
      setSummaries(prev => prev.filter(s => s._id !== itemToDelete._id));
      if (selectedSummary?._id === itemToDelete._id) {
        setSelectedSummary(null);
      }
      setItemToDelete(null);
    } catch {
      error('Failed to delete summary.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStartEdit = (summary: Summary, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(summary._id);
    setEditTitle(summary.title);
  };

  const handleSaveTitle = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editTitle.trim()) return;
    try {
      const updated = await api.updateHistoryItem(id, editTitle.trim());
      setSummaries(prev => prev.map(s => (s._id === id ? updated : s)));
      if (selectedSummary?._id === id) {
        setSelectedSummary(updated);
      }
      setEditingId(null);
      success('Title updated.');
    } catch {
      error('Failed to update title.');
    }
  };

  const getTypeIcon = (type: SummaryType) => {
    switch (type) {
      case 'pdf':
        return <FileSpreadsheet className="w-4 h-4 text-purple-500" />;
      case 'image':
        return <Camera className="w-4 h-4 text-cyan-500" />;
      case 'article':
        return <Globe className="w-4 h-4 text-pink-500" />;
      case 'notes':
        return <BookOpen className="w-4 h-4 text-emerald-500" />;
      default:
        return <FileText className="w-4 h-4 text-indigo-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Search Bar */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search summaries by title or tag..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </form>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Items' },
            { id: 'text', label: 'Text' },
            { id: 'pdf', label: 'PDFs' },
            { id: 'image', label: 'Images' },
            { id: 'article', label: 'Articles' },
            { id: 'notes', label: 'Study Notes' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setTypeFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                typeFilter === f.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* History Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Loading summary library...</p>
        </div>
      ) : summaries.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm max-w-md mx-auto">
          <History className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">No summaries found</h3>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or generate your first summary.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {summaries.map(item => (
            <div
              key={item._id}
              onClick={() => setSelectedSummary(item)}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    {getTypeIcon(item.summary_type)}
                    <span>{item.summary_type}</span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => handleStartEdit(item, e)}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      title="Edit title"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={e => handlePromptDelete(item, e)}
                      className="p-1 text-slate-400 hover:text-rose-500"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {editingId === item._id ? (
                  <div className="flex items-center gap-1 mb-2" onClick={e => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="flex-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700"
                      autoFocus
                    />
                    <button
                      onClick={e => handleSaveTitle(item._id, e)}
                      className="p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors">
                    {item.title}
                  </h4>
                )}

                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                  {item.summary}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(item.created_at).toLocaleDateString()}
                </span>

                {item.compression_ratio > 0 && (
                  <span className="font-semibold text-emerald-500">
                    {item.compression_ratio}% compressed
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedSummary && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-cyan-400 uppercase tracking-wider">
                  {selectedSummary.summary_type} • {selectedSummary.summary_length}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1.5">
                  {selectedSummary.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Saved on {new Date(selectedSummary.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadAsTxt(selectedSummary.title, selectedSummary.summary)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold hover:bg-slate-200 transition-colors"
                >
                  TXT
                </button>
                <button
                  onClick={() => downloadAsPdf(selectedSummary.title, selectedSummary.summary, selectedSummary.key_points, selectedSummary.keywords)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
                >
                  PDF
                </button>
                <button
                  onClick={() => setSelectedSummary(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Generated Summary
                </h4>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {selectedSummary.summary}
                </div>
              </div>

              {selectedSummary.key_points && selectedSummary.key_points.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-indigo-600 dark:text-cyan-400 uppercase tracking-wider mb-2">
                    Key Points & Takeaways
                  </h4>
                  <ul className="space-y-1.5">
                    {selectedSummary.key_points.map((pt, i) => (
                      <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedSummary.original_text && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Original Source Text Preview
                  </h4>
                  <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400 font-mono max-h-40 overflow-y-auto leading-relaxed">
                    {selectedSummary.original_text}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with Learning Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-400">Study tools for this summary:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = selectedSummary.summary;
                    setSelectedSummary(null);
                    onNavigateToTab?.('flashcards', text);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-100 transition-colors flex items-center gap-1.5"
                >
                  <Layers className="w-4 h-4" />
                  <span>Create Flashcards</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = selectedSummary.summary;
                    setSelectedSummary(null);
                    onNavigateToTab?.('quiz-generator', text);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 text-xs font-bold hover:bg-cyan-100 transition-colors flex items-center gap-1.5"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Create Quiz</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const s = selectedSummary;
                    setSelectedSummary(null);
                    onOpenSummary?.(s);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Open in Workspace</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Summary?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                Are you sure you want to delete "{itemToDelete.title}"?
              </p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
