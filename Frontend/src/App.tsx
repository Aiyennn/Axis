import React, { useState } from 'react';
import { useApp } from './context/AppContext';
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
import DailyBriefing from './components/dashboard/DailyBriefing';
import GraphView from './components/dashboard/GraphView';

export const App: React.FC = () => {
  const { activeView } = useApp();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [dashView, setDashView] = useState<'list' | 'graph'>('list');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090b] text-[#f4f4f5]">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Workspace Surface */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
          {activeView === 'dashboard' ? (
            <>
              {/* Calm Header containing top utility status, toggle, greeting & summary */}
              <CalmHeader dashView={dashView} setDashView={setDashView} />

              {dashView === 'graph' ? (
                /* ── Graph / orbit view ──────────────────────────────── */
                <div className="animate-fade-scale">
                  <GraphView />
                </div>
              ) : (
                /* ── List view (default) ─────────────────────────────── */
                <div className="flex flex-col">
                  {/* Daily Briefing Banner — slide in */}
                  <div className="animate-slide-left">
                    <DailyBriefing />
                  </div>

                  {/* 2-Column Dashboard Layout matching user design */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Primary Focus & Task Lists Column (slide in from left) */}
                    <div className="lg:col-span-7 flex flex-col gap-6 animate-slide-left [animation-delay:60ms]">
                      {/* Hero "YOUR FOCUS" Card */}
                      <HeroFocusCard />

                      {/* "Coming Up" (Do Next) Section */}
                      <ComingUpSection />

                      {/* "Later" (Do Later) Section */}
                      <LaterSection />
                    </div>

                    {/* Right Context & Schedule Column (slide in from right) */}
                    <div className="lg:col-span-5 flex flex-col gap-6 animate-slide-right [animation-delay:100ms]">
                      {/* Today's Schedule Timeline Widget */}
                      <TodayScheduleWidget />

                      {/* Today's Focus Capacity Widget */}
                      <TodayFocusCapacityWidget />

                      {/* AI Engine Status & Trigger Widget */}
                      <AIEngineWidget onOpenAssistant={() => setIsAssistantOpen(true)} />
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-8 text-center text-zinc-400">
              <h3 className="text-lg font-bold text-white mb-2">Simulated Integrations Feeds</h3>
              <p className="text-sm text-zinc-500 max-w-md mx-auto">
                Incoming responsibilities from Gmail, Canvas, Calendar, and Tasks are connected. Full integrations manager will be activated in Slice 6.
              </p>
            </div>
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
    </div>
  );
};

export default App;
