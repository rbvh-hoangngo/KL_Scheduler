import React from 'react';
import { Calendar, Cpu, Layers, Terminal, Activity, RotateCcw, Wrench, CheckCircle2 } from 'lucide-react';

export type ActiveTab = 'booking' | 'resources' | 'ledger' | 'system-design' | 'api-sandbox' | 'harness' | 'test-suite';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onResetDatabase: () => void;
  isResetting: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onResetDatabase,
  isResetting
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Mark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base font-semibold tracking-tight text-white block leading-none">
              The Unified Service Scheduler
            </span>
            <span className="text-xs text-slate-400 mt-1 block">
              Resource-Constrained Dealership Engine
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 overflow-x-auto py-1">
          <button
            onClick={() => onSelectTab('booking')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'booking'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Booking Portal
          </button>

          <button
            onClick={() => onSelectTab('resources')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'resources'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Resource Board
          </button>

          <button
            onClick={() => onSelectTab('ledger')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'ledger'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Appointments
          </button>

          <button
            onClick={() => onSelectTab('system-design')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'system-design'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            System Design
          </button>

          <button
            onClick={() => onSelectTab('api-sandbox')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'api-sandbox'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            REST & OpenAPI
          </button>

          <button
            onClick={() => onSelectTab('harness')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'harness'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Race Harness
          </button>

          <button
            onClick={() => onSelectTab('test-suite')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'test-suite'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Test Suite Studio
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onResetDatabase}
            disabled={isResetting}
            title="Reset database to baseline realistic seed data"
            className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Reset Seed DB</span>
          </button>
        </div>
      </div>
    </header>
  );
};
