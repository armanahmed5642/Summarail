import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { NavigationTab } from './components/layout/Sidebar';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { TextSummarizer } from './pages/TextSummarizer';
import { PdfSummarizer } from './pages/PdfSummarizer';
import { ImageSummarizer } from './pages/ImageSummarizer';
import { ArticleSummarizer } from './pages/ArticleSummarizer';
import { NotesGenerator } from './pages/NotesGenerator';
import { FlashcardsPage } from './pages/FlashcardsPage';
import { QuizPage } from './pages/QuizPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Summary } from './types';

function MainApp() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [view, setView] = useState<'landing' | 'auth' | 'app'>('landing');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [transferText, setTransferText] = useState<string>('');
  const [activeSummaryForWorkspace, setActiveSummaryForWorkspace] = useState<Summary | null>(null);

  const handleNavigateToTab = (tab: NavigationTab, initialText?: string) => {
    setActiveSummaryForWorkspace(null);
    if (initialText) {
      setTransferText(initialText);
    }
    setCurrentTab(tab);
    setView('app');
  };

  const handleOpenSummary = (summary: Summary) => {
    setActiveSummaryForWorkspace(summary);
    setTransferText(summary.original_text || summary.summary);
    setCurrentTab('text-summarizer');
    setView('app');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          SummarAI
        </span>
      </div>
    );
  }

  // 1. Landing Page View
  if (view === 'landing') {
    return (
      <LandingPage
        onGetStarted={() => {
          if (isAuthenticated) {
            setView('app');
          } else {
            setAuthMode('signup');
            setView('auth');
          }
        }}
        onTryDemo={(tab?: NavigationTab) => {
          if (tab) {
            setCurrentTab(tab);
          }
          setView('app');
        }}
        onLogin={() => {
          setAuthMode('login');
          setView('auth');
        }}
      />
    );
  }

  // 2. Auth Page View
  if (view === 'auth') {
    return (
      <AuthPage
        initialMode={authMode}
        onSuccess={() => setView('app')}
        onBackToLanding={() => setView('landing')}
      />
    );
  }

  // 3. Main Workspace Dashboard
  return (
    <AppLayout
      currentTab={currentTab}
      onSelectTab={tab => {
        setCurrentTab(tab);
        setActiveSummaryForWorkspace(null);
        if (tab !== 'flashcards' && tab !== 'quiz-generator' && tab !== 'notes-generator') {
          setTransferText('');
        }
      }}
      onOpenLanding={() => setView('landing')}
    >
      <ErrorBoundary
        key={currentTab}
        fallbackTitle="This workspace encountered an error"
        onReset={() => setCurrentTab('dashboard')}
      >
        {currentTab === 'dashboard' && (
          <Dashboard
            onNavigate={handleNavigateToTab}
            onOpenSummary={handleOpenSummary}
          />
        )}

        {currentTab === 'text-summarizer' && (
          <TextSummarizer
            onNavigateToTab={handleNavigateToTab}
            initialText={transferText}
            initialSummary={activeSummaryForWorkspace}
          />
        )}

        {currentTab === 'pdf-summarizer' && (
          <PdfSummarizer
            onNavigateToTab={handleNavigateToTab}
          />
        )}

        {currentTab === 'image-summarizer' && (
          <ImageSummarizer
            onNavigateToTab={handleNavigateToTab}
          />
        )}

        {currentTab === 'article-summarizer' && (
          <ArticleSummarizer
            onNavigateToTab={handleNavigateToTab}
          />
        )}

        {currentTab === 'notes-generator' && (
          <NotesGenerator
            initialText={transferText}
            onNavigateToTab={handleNavigateToTab}
          />
        )}

        {currentTab === 'flashcards' && (
          <FlashcardsPage
            initialText={transferText}
          />
        )}

        {currentTab === 'quiz-generator' && (
          <QuizPage
            initialText={transferText}
          />
        )}

        {currentTab === 'history' && (
          <HistoryPage
            onOpenSummary={handleOpenSummary}
            onNavigateToTab={handleNavigateToTab}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsPage />
        )}
      </ErrorBoundary>
    </AppLayout>
  );
}

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="SummarAI encountered an unexpected error">
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <MainApp />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
