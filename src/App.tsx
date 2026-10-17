import React from 'react';
import { useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { PriorityColumns } from './components/dashboard/PriorityColumns';

export const App: React.FC = () => {
  const { activeView } = useApp();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090b] text-[#f4f4f5]">
      {/* Left Navigation Sidebar */}
      <Sidebar />

      {/* Main Command Center Surface */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {activeView === 'dashboard' ? (
            <>
              {/* Central Priority Columns */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold tracking-tight text-zinc-100">
                    Prioritized Responsibilities
                  </h2>
                  <span className="text-xs text-zinc-400 font-mono">
                    Tri-Bucket Multi-Factor Allocation
                  </span>
                </div>
                <PriorityColumns />
              </div>
            </>
          ) : (
            <div className="bg-[#121215] border border-[#27272a] rounded-xl p-8 text-center text-zinc-400">
              <h3 className="text-lg font-semibold text-white mb-2">Simulated Integrations Feeds</h3>
              <p className="text-sm text-zinc-500 max-w-md mx-auto">
                Incoming responsibilities from Gmail, Canvas, Calendar, and Tasks are connected. Full integration management view will be activated in Slice 6.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;

