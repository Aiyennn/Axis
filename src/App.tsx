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

export const App: React.FC = () => {
  const { activeView } = useApp();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090b] text-[#f4f4f5]">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Workspace Surface */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
          {activeView === 'dashboard' ? (
            <>
              {/* Calm Header */}
              <CalmHeader />

              {/* 2-Column Dashboard Layout matching user design */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Primary Focus & Task Lists Column (8 cols) */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  {/* Hero "YOUR FOCUS" Card */}
                  <HeroFocusCard />

                  {/* "Coming Up" (Do Next) Section */}
                  <ComingUpSection />

                  {/* "Later" (Do Later) Section */}
                  <LaterSection />
                </div>

                {/* Right Context & Schedule Column (4 cols) */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  {/* Today's Schedule Timeline Widget */}
                  <TodayScheduleWidget />

                  {/* Today's Focus Capacity Widget */}
                  <TodayFocusCapacityWidget />

                  {/* AI Engine Status & Trigger Widget */}
                  <AIEngineWidget onOpenAssistant={() => setIsAssistantOpen(true)} />
                </div>
              </div>
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
