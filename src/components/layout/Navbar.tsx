import React, { useState } from 'react';
import {
  Menu,
  Sun,
  Moon,
  Bell,
  Sparkles,
  ExternalLink,
  Plus,
  Check,
  User as UserIcon,
  LogOut,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { NavigationTab } from './Sidebar';

interface NavbarProps {
  currentTab: NavigationTab;
  onOpenMobileMenu: () => void;
  onNewSummary: () => void;
  onNavigate: (tab: NavigationTab) => void;
  onOpenLanding: () => void;
}

const TAB_TITLES: Record<NavigationTab, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Overview of your learning progress & summaries' },
  'text-summarizer': { title: 'AI Text Summarizer', subtitle: 'Condense articles, papers, and essays in seconds' },
  'pdf-summarizer': { title: 'PDF & Document Summarizer', subtitle: 'Extract text, split chapters, and summarize long PDFs' },
  'image-summarizer': { title: 'Image & Camera Summarizer', subtitle: 'Upload photos or snap notes with your camera for instant AI summaries' },
  'article-summarizer': { title: 'Article Summarizer', subtitle: 'Summarize web articles directly via URL or pasted text' },
  'notes-generator': { title: 'AI Notes Generator', subtitle: 'Turn content into structured revision & exam notes' },
  flashcards: { title: 'Interactive Flashcards', subtitle: 'Active recall decks with 3D flip and mastery tracking' },
  'quiz-generator': { title: 'AI Quiz Generator', subtitle: 'Generate dynamic multiple choice questions with explanations' },
  history: { title: 'Summary History', subtitle: 'Search, filter, edit, and export your saved summaries' },
  settings: { title: 'Account Settings', subtitle: 'Manage your profile and summarization preferences' },
};

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onOpenMobileMenu,
  onNewSummary,
  onNavigate,
  onOpenLanding,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);

  const notifications = [
    { id: 1, title: 'Gemini 3.8 Flash Online', time: 'Just now', desc: 'Accelerated summarization with zero latency.' },
    { id: 2, title: 'Multi-Chunk PDF Engine', time: '1h ago', desc: 'Supports long documents with hierarchical section synthesis.' },
    { id: 3, title: 'Interactive Flashcards', time: 'Yesterday', desc: 'Test your retention with active recall flip decks.' },
  ];

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-8">
      {/* Left: Mobile trigger & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
            {TAB_TITLES[currentTab]?.title || 'SummarAI'}
          </h1>
          <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400">
            {TAB_TITLES[currentTab]?.subtitle}
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick New Summary Button */}
        <button
          onClick={onNewSummary}
          className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm shadow-indigo-500/20 active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Summary</span>
        </button>

        {/* View Landing Link */}
        <button
          onClick={onOpenLanding}
          className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <span>Landing</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Updates & Notices</span>
                <button
                  type="button"
                  onClick={() => setUnreadCount(0)}
                  className="text-[10px] text-indigo-500 hover:text-indigo-600 dark:text-cyan-400 font-semibold cursor-pointer"
                >
                  {unreadCount > 0 ? 'Mark all read' : 'All caught up ✓'}
                </button>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.map(n => (
                  <div key={n.id} className="py-2.5 px-1 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{n.title}</span>
                      <span className="text-[10px] text-slate-400">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 p-1 rounded-full ring-2 ring-transparent hover:ring-indigo-500/30 transition-all"
          >
            <img
              src={user?.profile_image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'}
              alt={user?.name || 'User'}
              className="w-8 h-8 rounded-full object-cover"
            />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{user?.name || 'Alex Rivera'}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email || 'demo@summarai.com'}</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onNavigate('settings');
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2"
                >
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                  Account Settings
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
