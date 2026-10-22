import { AxisLogo } from './components/shared/AxisLogo';
import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import { SignIn } from './components/SignIn';
import { Sidebar } from './components/layout/Sidebar';
import { CalmHeader } from './components/dashboard/CalmHeader';
import { HeroFocusCard } from './components/dashboard/HeroFocusCard';
import { ComingUpSection } from './components/dashboard/ComingUpSection';
import { LaterSection } from './components/dashboard/LaterSection';
import { TodayScheduleWidget } from './components/dashboard/TodayScheduleWidget';
import { TodayFocusCapacityWidget } from './components/dashboard/TodayFocusCapacityWidget';
import { AIEngineWidget } from './components/dashboard/AIEngineWidget';
import { TaskReasonModal } from './components/dashboard/TaskReasonModal';
import { AIAssistantDrawer } from './components/assistant/AIAssistantDrawer';
import { ChatBubble } from './components/assistant/ChatBubble';
import TimelineView from './components/dashboard/TimelineView';
import GraphView from './components/dashboard/GraphView';
import { IntegrationsPage } from './components/integrations/IntegrationsPage';


export const App: React.FC = () => {
  const { user, activeView, loading } = useApp();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [dashView, setDashView] = useState<'list' | 'graph'>('list');

  // Show a clean loading screen while workspace initialises
  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-zinc-400">
          <AxisLogo className="w-8 h-8 text-violet-400 animate-pulse" />
          <p className="text-sm font-mono tracking-wide">Loading workspace…</p>
        </div>
      </div>
    );
  }

  // Dedicated Login / Register view if not authenticated
  if (!user) {
    return <SignIn />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090b] text-[#f4f4f5]">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Workspace Surface */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
          {/* Keep greeting and briefing state alive while navigating sections. */}
          <div hidden={activeView !== 'dashboard'}>
            <CalmHeader dashView={dashView} setDashView={setDashView} />
          </div>
          {activeView === 'dashboard' ? (
            <>
              {dashView === 'graph' ? (
                /* ── Graph / orbit view ──────────────────────────────── */
                <div className="animate-fade-scale">
                  <GraphView />
                </div>
              ) : (
                /* ── List view (default) ─────────────────────────────── */
                <div className="flex flex-col">
                  {/* 2-Column Dashboard Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Primary Focus & Task Lists Column */}
                    <div className="lg:col-span-7 flex flex-col gap-6 animate-slide-left [animation-delay:60ms]">
                      <HeroFocusCard />
                      <ComingUpSection />
                      <LaterSection />
                    </div>

                    {/* Right Context & Schedule Column */}
                    <div className="lg:col-span-5 flex flex-col gap-6 animate-slide-right [animation-delay:100ms]">
                      <TodayScheduleWidget />
                      <TodayFocusCapacityWidget />
                      <AIEngineWidget onOpenAssistant={() => setIsAssistantOpen(true)} />
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : activeView === 'timeline' ? (
            <TimelineView />
          ) : (
            <IntegrationsPage />
          )}
        </main>
      </div>

      {/* Transparent AI Score & Reasoning Modal */}
      <TaskReasonModal />

      {/* Conversational AI Copilot Drawer */}
      <AIAssistantDrawer
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
      />

      {/* Floating LLM Chat Bubble */}
      <ChatBubble
        isOpen={isAssistantOpen}
        onToggle={() => setIsAssistantOpen(prev => !prev)}
      />
    </div>
  );
};

export default App;
