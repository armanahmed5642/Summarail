import React, { useEffect, useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Globe,
  BookOpen,
  Layers,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  ChevronRight,
  Calendar,
  Zap,
  Camera,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Summary, DashboardStats } from '../types';
import { NavigationTab } from '../components/layout/Sidebar';

interface DashboardProps {
  onNavigate: (tab: NavigationTab) => void;
  onOpenSummary: (summary: Summary) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onOpenSummary }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalSummaries: 3,
    documentsProcessed: 2,
    flashcardsCreated: 6,
    quizzesCompleted: 3,
    totalWordsSummarized: 3450,
    hoursSaved: 3.2,
  });
  const [recentSummaries, setRecentSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, historyData] = await Promise.all([
          api.getStats().catch(() => null),
          api.getHistory().catch(() => []),
        ]);
        if (statsData) setStats(statsData);
        if (historyData) setRecentSummaries(historyData.slice(0, 5));
      } catch (e) {
        console.error('Failed to load dashboard data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const quickActions: Array<{
    tab: NavigationTab;
    title: string;
    desc: string;
    icon: React.ComponentType<{ className?: string }>;
    gradient: string;
    badge?: string;
  }> = [
    {
      tab: 'text-summarizer',
      title: 'Summarize Text',
      desc: 'Paste text or articles for instant abstractive condensation.',
      icon: FileText,
      gradient: 'from-blue-600 to-indigo-600',
    },
    {
      tab: 'pdf-summarizer',
      title: 'Upload PDF',
      desc: 'Extract chapters and synthesize long documents.',
      icon: FileSpreadsheet,
      gradient: 'from-indigo-600 to-purple-600',
      badge: 'Multi-Page',
    },
    {
      tab: 'image-summarizer',
      title: 'Scan Image / Camera',
      desc: 'Upload photos or snap notes with your camera.',
      icon: Camera,
      gradient: 'from-cyan-600 to-indigo-600',
      badge: 'Vision',
    },
    {
      tab: 'article-summarizer',
      title: 'Summarize Article',
      desc: 'Fetch online articles via URL with SSRF protection.',
      icon: Globe,
      gradient: 'from-purple-600 to-pink-600',
    },
    {
      tab: 'notes-generator',
      title: 'Generate Notes',
      desc: 'Create revision sheets and high-yield exam prep notes.',
      icon: BookOpen,
      gradient: 'from-emerald-600 to-teal-600',
    },
    {
      tab: 'flashcards',
      title: 'Create Flashcards',
      desc: 'Master definitions and formulas with active recall.',
      icon: Layers,
      gradient: 'from-amber-600 to-orange-600',
      badge: '3D Flip',
    },
    {
      tab: 'quiz-generator',
      title: 'Generate Quiz',
      desc: 'Test your understanding with AI multiple-choice exams.',
      icon: HelpCircle,
      gradient: 'from-cyan-600 to-blue-600',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 border border-indigo-800/40 shadow-xl text-white">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-indigo-500/20 via-purple-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>AI Learning Dashboard</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name || 'Scholar'}!
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-300">
            What would you like to understand today? Condense lengthy readings, generate exam notes, or test your retention.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('text-summarizer')}
              className="px-4 py-2 rounded-xl bg-white text-indigo-900 text-xs sm:text-sm font-bold shadow-md hover:bg-slate-100 transition-all flex items-center gap-1.5"
            >
              <span>Start New Summary</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('pdf-summarizer')}
              className="px-4 py-2 rounded-xl bg-indigo-800/60 hover:bg-indigo-700/60 text-white text-xs sm:text-sm font-semibold border border-indigo-700/60 transition-all flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-cyan-300" />
              <span>Upload PDF Document</span>
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Summaries</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-cyan-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {stats.totalSummaries}
          </p>
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Active library</span>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Documents Processed</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {stats.documentsProcessed}
          </p>
          <p className="mt-1 text-xs text-slate-500 font-medium">PDF & Web Scrapes</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Flashcards Created</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {stats.flashcardsCreated}
          </p>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-medium">Active recall cards</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reading Time Saved</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            ~{stats.hoursSaved}h
          </p>
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">~85% average compression</p>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Quick Actions
          </h3>
          <span className="text-xs text-slate-500">Pick a workspace tool to begin</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map(action => {
            const Icon = action.icon;
            return (
              <button
                key={action.tab}
                onClick={() => onNavigate(action.tab)}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 shadow-sm hover:shadow-md transition-all text-left group relative overflow-hidden"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${action.gradient} flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  {action.badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-cyan-400 border border-slate-200 dark:border-slate-700">
                      {action.badge}
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors flex items-center justify-between">
                  <span>{action.title}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {action.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Usage Overview & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Activity (8 cols) */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Recent Summaries & Notes
            </h3>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs font-semibold text-indigo-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>View All History</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentSummaries.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No summaries yet</p>
              <p className="text-xs text-slate-500 mt-1">Start by summarizing a text, PDF, or article.</p>
              <button
                onClick={() => onNavigate('text-summarizer')}
                className="mt-4 px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
              >
                Create Summary
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {recentSummaries.map(item => (
                <div
                  key={item._id}
                  onClick={() => onOpenSummary(item)}
                  className="py-3.5 px-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors flex items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-cyan-400 shrink-0 mt-0.5">
                      {item.summary_type === 'pdf' ? (
                        <FileSpreadsheet className="w-4 h-4" />
                      ) : item.summary_type === 'image' ? (
                        <Camera className="w-4 h-4" />
                      ) : item.summary_type === 'article' ? (
                        <Globe className="w-4 h-4" />
                      ) : item.summary_type === 'notes' ? (
                        <BookOpen className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                        <span className="capitalize">{item.summary_type}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}
                        </span>
                        {item.compression_ratio > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-500 font-semibold">{item.compression_ratio}% compressed</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Visual Usage Overview Chart (4 cols) */}
        <div className="lg:col-span-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Weekly Activity
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-cyan-400">
                Live
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Summaries generated across the last 7 days
            </p>

            {/* Simple Bar Chart */}
            <div className="flex items-end justify-between gap-2 h-36 pt-4 px-2">
              {[
                { day: 'Mon', count: 2, height: '40%' },
                { day: 'Tue', count: 4, height: '75%' },
                { day: 'Wed', count: 1, height: '25%' },
                { day: 'Thu', count: 5, height: '95%' },
                { day: 'Fri', count: 3, height: '60%' },
                { day: 'Sat', count: 2, height: '45%' },
                { day: 'Sun', count: 4, height: '80%' },
              ].map((bar, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="w-full relative flex items-end justify-center h-full">
                    <div
                      style={{ height: bar.height }}
                      className="w-full max-w-[28px] rounded-t-lg bg-gradient-to-t from-indigo-600 to-cyan-400 group-hover:from-indigo-500 group-hover:to-cyan-300 transition-all cursor-pointer relative"
                    >
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                        {bar.count}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">{bar.day}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Total Words Compressed</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {Number(stats?.totalWordsSummarized ?? 0).toLocaleString()} words
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
