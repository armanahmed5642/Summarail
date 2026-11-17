import React from 'react';
import {
  LayoutDashboard,
  FileText,
  FileSpreadsheet,
  Globe,
  BookOpen,
  Layers,
  HelpCircle,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LogOut,
  Zap,
  Camera,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type NavigationTab =
  | 'dashboard'
  | 'text-summarizer'
  | 'pdf-summarizer'
  | 'image-summarizer'
  | 'article-summarizer'
  | 'notes-generator'
  | 'flashcards'
  | 'quiz-generator'
  | 'history'
  | 'settings';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenLanding?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  onOpenLanding,
}) => {
  const { user, logout } = useAuth();

  const navItems: Array<{ id: NavigationTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'text-summarizer', label: 'Text Summarizer', icon: FileText },
    { id: 'pdf-summarizer', label: 'PDF Summarizer', icon: FileSpreadsheet, badge: 'Smart' },
    { id: 'image-summarizer', label: 'Image & Camera', icon: Camera, badge: 'Vision' },
    { id: 'article-summarizer', label: 'Article Summarizer', icon: Globe },
    { id: 'notes-generator', label: 'AI Notes Generator', icon: BookOpen },
    { id: 'flashcards', label: 'Flashcards', icon: Layers },
    { id: 'quiz-generator', label: 'Quiz Generator', icon: HelpCircle, badge: 'AI' },
    { id: 'history', label: 'Summary History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 z-30 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800/80">
        <button
          onClick={onOpenLanding}
          className="flex items-center gap-3 group text-left transition-transform active:scale-95"
          title="Go to SummarAI Landing"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0 group-hover:rotate-6 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500 bg-clip-text text-transparent">
                Summar<span className="text-indigo-500 dark:text-cyan-400">AI</span>
              </span>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold leading-none">
                Intelligence Platform
              </p>
            </div>
          )}
        </button>

        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5 custom-scrollbar">
        {!isCollapsed && (
          <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Workspace
          </p>
        )}
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all relative group ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500 dark:text-slate-400 dark:group-hover:text-cyan-400 transition-colors'}`} />
              
              {!isCollapsed && (
                <span className="truncate flex-1 text-left">{item.label}</span>
              )}

              {!isCollapsed && item.badge && !isActive && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-cyan-400 border border-indigo-200/50 dark:border-indigo-800/50">
                  {item.badge}
                </span>
              )}

              {/* Tooltip on collapsed */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}

        {/* AI Capabilities Card in expanded mode */}
        {!isCollapsed && (
          <div className="pt-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-cyan-500/10 border border-indigo-200/40 dark:border-indigo-800/40 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-1.5">
                <Zap className="w-4 h-4 text-indigo-600 dark:text-cyan-400 animate-pulse" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Gemini 3.8 Intelligence</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Hierarchical document chunking, abstractive NLP, and active recall.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80">
        <div className={`flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors ${isCollapsed ? 'justify-center' : ''}`}>
          <img
            src={user?.profile_image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'}
            alt={user?.name || 'User'}
            className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500/20"
          />
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                {user?.name || 'Guest User'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {user?.email || 'demo@summarai.com'}
              </p>
            </div>
          )}
          {!isCollapsed && (
            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
