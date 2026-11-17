import React, { useState } from 'react';
import { Sidebar, NavigationTab } from './Sidebar';
import { Navbar } from './Navbar';
import { X } from 'lucide-react';

interface AppLayoutProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenLanding: () => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentTab,
  onSelectTab,
  onOpenLanding,
  children,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSelectTab = (tab: NavigationTab) => {
    onSelectTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans antialiased selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      {/* Desktop Sidebar */}
      <div className="hidden md:block shrink-0">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
          onOpenLanding={onOpenLanding}
        />
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-slate-900/60 backdrop-blur-sm flex">
          <div className="relative w-72 max-w-xs h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <Sidebar
              currentTab={currentTab}
              onSelectTab={handleSelectTab}
              isCollapsed={false}
              onToggleCollapse={() => setIsMobileMenuOpen(false)}
              onOpenLanding={() => {
                setIsMobileMenuOpen(false);
                onOpenLanding();
              }}
            />
          </div>
          <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
        </div>
      )}

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'
        }`}
      >
        <Navbar
          currentTab={currentTab}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onNewSummary={() => handleSelectTab('text-summarizer')}
          onNavigate={handleSelectTab}
          onOpenLanding={onOpenLanding}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
