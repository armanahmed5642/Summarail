import React, { useState } from 'react';
import {
  Settings,
  User,
  Sliders,
  Shield,
  Sun,
  Moon,
  LogOut,
  Save,
  Check,
  AlertTriangle,
  Camera,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { SummaryLength, SummaryStyle } from '../types';

export const SettingsPage: React.FC = () => {
  const { user, updateUserProfile, updateUserPreferences, logout, deleteAccount } = useAuth();
  const { theme, setTheme } = useTheme();
  const { success, error } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [profileImage, setProfileImage] = useState(user?.profile_image || '');
  const [defaultLength, setDefaultLength] = useState<SummaryLength>(
    user?.preferences?.default_summary_length || 'medium'
  );
  const [defaultStyle, setDefaultStyle] = useState<SummaryStyle>(
    user?.preferences?.default_summary_style || 'bullet_points'
  );

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await updateUserProfile(name, profileImage);
    } catch {
      // handled in context
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPrefs(true);
    try {
      await updateUserPreferences({
        theme,
        default_summary_length: defaultLength,
        default_summary_style: defaultStyle,
      });
    } catch {
      // handled in context
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      error('New password must be at least 6 characters.');
      return;
    }
    try {
      await api.updatePassword({ currentPassword, newPassword });
      success('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      error(err.message || 'Failed to update password.');
    }
  };

  const handleConfirmDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
    } catch (err: any) {
      error(err.message || 'Failed to delete account.');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Profile Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          <User className="w-5 h-5 text-indigo-500" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Profile Settings
          </h3>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              <img
                src={profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                alt="Profile"
                className="w-20 h-20 rounded-2xl object-cover ring-4 ring-indigo-500/20 shadow-md"
              />
            </div>

            <div className="flex-1 w-full space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Avatar Image URL
              </label>
              <input
                type="url"
                value={profileImage}
                onChange={e => setProfileImage(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Display Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address (Read-only)
              </label>
              <input
                type="email"
                disabled
                value={user?.email || 'demo@summarai.com'}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingProfile ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Preferences Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          <Sliders className="w-5 h-5 text-indigo-500" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Summarization & Theme Preferences
          </h3>
        </div>

        <form onSubmit={handleSavePreferences} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Theme switcher */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Interface Theme
              </label>
              <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    theme === 'light'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-700 text-cyan-400 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  <span>Dark</span>
                </button>
              </div>
            </div>

            {/* Default Length */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Default Summary Length
              </label>
              <select
                value={defaultLength}
                onChange={e => setDefaultLength(e.target.value as SummaryLength)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="short">Short (50-90 words)</option>
                <option value="medium">Medium (120-220 words)</option>
                <option value="detailed">Detailed (250-450 words)</option>
              </select>
            </div>

            {/* Default Style */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Default Summary Tone
              </label>
              <select
                value={defaultStyle}
                onChange={e => setDefaultStyle(e.target.value as SummaryStyle)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="bullet_points">Bullet Points</option>
                <option value="paragraph">Paragraph</option>
                <option value="executive">Executive Summary</option>
                <option value="simple">Simple Language</option>
                <option value="academic">Academic Style</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSavingPrefs}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Preferences</span>
            </button>
          </div>
        </form>
      </div>

      {/* Account Security & Sign Out */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          <Shield className="w-5 h-5 text-indigo-500" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Security & Session
          </h3>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all"
          >
            Update Password
          </button>
        </form>

        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Sign Out</h4>
            <p className="text-xs text-slate-400 mt-0.5">End your current session on this device.</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Danger Zone: Delete Account */}
      <div className="p-6 sm:p-8 rounded-3xl bg-rose-50/30 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="text-base font-bold">Danger Zone</h3>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Delete Account</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-md">
              Permanently delete your account, saved summaries, documents, flashcards, and quizzes. This action cannot be undone.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Delete Account</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Account?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Are you sure you want to delete your account? All your generated summaries, documents, flashcards, and quizzes will be permanently deleted.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAccount}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Permanently Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
