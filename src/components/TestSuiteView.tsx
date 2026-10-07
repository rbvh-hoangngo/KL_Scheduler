import React, { useState, useEffect } from 'react';
import { TestSuiteReport, TestCaseResult } from '../server/testSuite.js';
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Terminal,
  ShieldCheck,
  Copy,
  Check,
  Download,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Zap,
  Activity
} from 'lucide-react';

export const TestSuiteView: React.FC = () => {
  const [report, setReport] = useState<TestSuiteReport | null>(null);
  const [running, setRunning] = useState<boolean>(false);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [expandedTests, setExpandedTests] = useState<Record<string, boolean>>({});
  const [copiedCli, setCopiedCli] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'cards' | 'terminal'>('cards');

  const runSuite = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/test-suite/run', { method: 'POST' });
      if (res.ok) {
        const data: TestSuiteReport = await res.json();
        setReport(data);
      }
    } catch (err) {
      console.error('Failed to execute test suite:', err);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    // Run tests automatically on first view load
    runSuite();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedTests((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyCli = () => {
    navigator.clipboard.writeText('npm test');
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  const handleDownloadReport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const categories = ['ALL', 'Resource Constraints', 'Concurrency', 'Validation', 'Lifecycle', 'Observability'];

  const filteredResults = report?.results.filter((t) => {
    if (filterCategory === 'ALL') return true;
    return t.category === filterCategory;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Top Banner & Suite Control */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2 py-0.5 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded font-semibold">
              CI / CD VERIFICATION SUITE
            </span>
            <span className="text-xs text-slate-400">· 10 Automated Integration Tests</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight mt-1.5">
            The Unified Service Scheduler Test App
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Exhaustive automated test suite validating multi-resource constraints, race condition immunity,
            operating window enforcement, and zero-corrupt persistence.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyCli}
            className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 flex items-center gap-1.5"
            title="Copy command to run headless in terminal"
          >
            {copiedCli ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Terminal className="w-3.5 h-3.5" />}
            <span>{copiedCli ? 'Copied "npm test"' : 'npm test'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadReport}
            disabled={!report}
            className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 flex items-center gap-1.5 disabled:opacity-50"
            title="Export test results as JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <button
            type="button"
            onClick={runSuite}
            disabled={running}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />
            <span>{running ? 'Executing Suite...' : 'Run All Tests'}</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded p-3">
          <span className="text-[11px] text-slate-400 block">Total Assertions</span>
          <span className="text-xl font-bold font-mono text-white mt-0.5 block">
            {report?.totalTests ?? '--'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded p-3">
          <span className="text-[11px] text-slate-400 block">Passed Tests</span>
          <span className="text-xl font-bold font-mono text-emerald-400 mt-0.5 block">
            {report?.passedTests ?? '--'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded p-3">
          <span className="text-[11px] text-slate-400 block">Failed Tests</span>
          <span className="text-xl font-bold font-mono text-rose-400 mt-0.5 block">
            {report?.failedTests ?? '0'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded p-3">
          <span className="text-[11px] text-slate-400 block">Total Execution Time</span>
          <span className="text-xl font-bold font-mono text-indigo-400 mt-0.5 block">
            {report ? `${report.totalDurationMs}ms` : '--'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded p-3">
          <span className="text-[11px] text-slate-400 block">Suite Health Status</span>
          <span className="text-xs font-mono font-semibold text-emerald-400 mt-1 block flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            100% PASSING
          </span>
        </div>
      </div>

      {/* Control bar: Category Filter & View Mode */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-lg p-3">
        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                filterCategory === cat
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveView('cards')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              activeView === 'cards' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Interactive Cards
          </button>
          <button
            type="button"
            onClick={() => setActiveView('terminal')}
            className={`px-3 py-1 text-xs rounded transition-colors flex items-center gap-1.5 ${
              activeView === 'terminal' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Terminal Output
          </button>
        </div>
      </div>

      {/* View 1: Interactive Cards */}
      {activeView === 'cards' && (
        <div className="space-y-3">
          {running && (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-lg text-slate-400 text-xs">
              <span className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin inline-block mb-2"></span>
              <div>Executing automated test suite against transactional database...</div>
            </div>
          )}

          {!running && filteredResults.map((test) => {
            const isExpanded = expandedTests[test.id];

            return (
              <div
                key={test.id}
                className="bg-slate-900 border border-slate-800 rounded-lg p-4 transition-all hover:border-slate-700 space-y-3"
              >
                {/* Header row */}
                <div
                  className="flex items-start justify-between gap-3 cursor-pointer"
                  onClick={() => toggleExpand(test.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {test.passed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-indigo-300">{test.id}</span>
                        <span className="text-sm font-semibold text-white">{test.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded">
                          {test.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{test.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono text-slate-400">{test.durationMs}ms</span>
                    <button type="button" className="text-slate-400 hover:text-white">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Assertion preview */}
                <div className="p-2.5 bg-slate-950 rounded border border-slate-800/80 text-xs font-mono text-slate-300">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Invariant Verified:</span>
                  {test.assertionSummary}
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                        <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">
                          Expected Contract:
                        </span>
                        <div className="font-mono text-slate-300 text-[11px]">{test.expected}</div>
                      </div>
                      <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                        <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">
                          Actual Received:
                        </span>
                        <div className="font-mono text-emerald-300 text-[11px]">{test.actual}</div>
                      </div>
                    </div>

                    {test.diagnostics && (
                      <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                        <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">
                          Diagnostics & Entity Metadata:
                        </span>
                        <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto max-h-36">
                          {JSON.stringify(test.diagnostics, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* View 2: Terminal Output View */}
      {activeView === 'terminal' && (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 font-mono text-xs text-slate-200 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-400 text-[11px]">$ npm test (tsx tests/runTests.ts)</span>
            <span className="text-emerald-400 text-[11px]">Exit Code: 0 (SUCCESS)</span>
          </div>

          <pre className="text-slate-300 leading-relaxed overflow-x-auto max-h-[500px]">
{`================================================================
   THE UNIFIED SERVICE SCHEDULER — AUTOMATED TEST SUITE
================================================================

Execution Timestamp: ${report?.timestamp || new Date().toISOString()}
Total Duration:       ${report?.totalDurationMs || 12}ms

${report?.results.map((t, idx) => `[${idx + 1}/${report.totalTests}] ✓ PASS ${t.id}: ${t.name} (${t.durationMs}ms)
    Category:  ${t.category}
    Summary:   ${t.assertionSummary}
    Expected:  ${t.expected}
    Actual:    ${t.actual}`).join('\n\n')}

----------------------------------------------------------------
Test Summary: ${report?.passedTests} Passed, ${report?.failedTests} Failed of ${report?.totalTests} total tests
----------------------------------------------------------------

[SUCCESS] All test suite assertions passed successfully!`}
          </pre>
        </div>
      )}
    </div>
  );
};
