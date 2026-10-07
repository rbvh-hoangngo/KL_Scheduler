import React, { useState } from 'react';
import { SYSTEM_DESIGN_MARKDOWN } from '../server/systemDesignDoc.js';
import {
  Cpu,
  Layers,
  ArrowRight,
  Copy,
  Download,
  Check,
  Server,
  Database,
  Shield,
  Activity,
  Sparkles,
  Lock,
  GitBranch
} from 'lucide-react';

export const SystemDesignView: React.FC = () => {
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedComponent, setSelectedComponent] = useState<string>('allocator');

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(SYSTEM_DESIGN_MARKDOWN);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([SYSTEM_DESIGN_MARKDOWN], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'UNIFIED_SERVICE_SCHEDULER_SYSTEM_DESIGN.md';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Banner & Export Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-medium px-2 py-0.5 bg-indigo-950 border border-indigo-800 text-indigo-300 rounded">
              RFC-014 · ARCHITECTURE BLUEPRINT
            </span>
            <span className="text-xs text-slate-400">· Production Standard v1.0</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-2">
            The Unified Service Scheduler — System Design
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Deterministic resource-constrained booking architecture with dual physical-bay & certified-technician allocation.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors flex items-center gap-2"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Markdown!' : 'Copy Full Markdown'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadMarkdown}
            className="px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .md</span>
          </button>
        </div>
      </div>

      {/* Interactive System Architecture Canvas */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
              1. System Architecture Diagram
            </h2>
            <p className="text-xs text-slate-400">
              Multi-tiered topology showing Ingress, Sliding Slot Matrix, Transactional Allocation, and Storage.
            </p>
          </div>
          <span className="text-xs font-mono text-indigo-400">Interactive Model</span>
        </div>

        {/* Visual Architecture Canvas */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 relative overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
            {/* Tier 1: Client & Integration */}
            <div
              onClick={() => setSelectedComponent('client')}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                selectedComponent === 'client'
                  ? 'border-indigo-500 bg-indigo-950/40 shadow-md ring-1 ring-indigo-500/50'
                  : 'border-slate-800 bg-slate-900 hover:border-slate-700'
              }`}
            >
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">
                Tier 01: Client & Ingress
              </div>
              <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Server className="w-4 h-4 text-indigo-400" />
                Customer & Ops Portal
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Booking UI, Dispatcher Gantt board, OpenAPI cURL sandbox, W3C trace injection.
              </p>
            </div>

            {/* Tier 2: Availability Engine */}
            <div
              onClick={() => setSelectedComponent('availability')}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                selectedComponent === 'availability'
                  ? 'border-indigo-500 bg-indigo-950/40 shadow-md ring-1 ring-indigo-500/50'
                  : 'border-slate-800 bg-slate-900 hover:border-slate-700'
              }`}
            >
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">
                Tier 02: Query Engine
              </div>
              <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" />
                Availability Service
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Sliding 30-min window sweep, shift compliance checking, real-time bay/tech free counters.
              </p>
            </div>

            {/* Tier 3: Transactional Allocator */}
            <div
              onClick={() => setSelectedComponent('allocator')}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                selectedComponent === 'allocator'
                  ? 'border-indigo-500 bg-indigo-950/40 shadow-md ring-1 ring-indigo-500/50'
                  : 'border-slate-800 bg-slate-900 hover:border-slate-700'
              }`}
            >
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">
                Tier 03: Core Engine
              </div>
              <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-amber-400" />
                Allocation Engine
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Facility mutex lock, Least-Slack heuristic, atomic dual-resource reservation, 409 Conflict.
              </p>
            </div>

            {/* Tier 4: Storage & WAL */}
            <div
              onClick={() => setSelectedComponent('storage')}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                selectedComponent === 'storage'
                  ? 'border-indigo-500 bg-indigo-950/40 shadow-md ring-1 ring-indigo-500/50'
                  : 'border-slate-800 bg-slate-900 hover:border-slate-700'
              }`}
            >
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">
                Tier 04: Persistence
              </div>
              <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Database className="w-4 h-4 text-cyan-400" />
                ACID Storage & WAL
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Persistent storage, atomic temp-file swap (fs.renameSync), immutable audit trail.
              </p>
            </div>
          </div>

          {/* Interactive Inspector Panel for Selected Node */}
          <div className="mt-5 p-4 bg-slate-900/90 rounded border border-slate-800 text-xs space-y-2">
            {selectedComponent === 'client' && (
              <div>
                <span className="font-semibold text-indigo-300 block mb-1">
                  Component Detail: Client & Ingress Layer
                </span>
                <p className="text-slate-300">
                  Handles TLS termination, validates RFC-7807 problem details, generates W3C Distributed Trace IDs
                  (<code className="font-mono text-indigo-300">X-Trace-Id</code>), and enforces input sanitization on VIN and Customer data before passing requests to domain services.
                </p>
              </div>
            )}
            {selectedComponent === 'availability' && (
              <div>
                <span className="font-semibold text-emerald-300 block mb-1">
                  Component Detail: Availability Query Service
                </span>
                <p className="text-slate-300">
                  Computes the intersection of available Service Bays (<code className="font-mono text-emerald-300">requiredBayCapability</code>)
                  and active Technicians (<code className="font-mono text-emerald-300">requiredSkill</code>) across discrete 30-minute intervals. Returns diagnostic reason strings (e.g. "All 2 EV bays occupied") to help clients choose viable times.
                </p>
              </div>
            )}
            {selectedComponent === 'allocator' && (
              <div>
                <span className="font-semibold text-amber-300 block mb-1">
                  Component Detail: Resource Allocation & Mutex Engine
                </span>
                <p className="text-slate-300">
                  Enforces strict mutual exclusion via per-dealership transactional mutex queues. Executes the <strong>Least-Slack Allocation Heuristic</strong>:
                  when multiple bays qualify, assigns the least-capable bay to conserve hyper-specialized EV and alignment bays for downstream jobs. Emits 409 Conflict upon resource exhaustion.
                </p>
              </div>
            )}
            {selectedComponent === 'storage' && (
              <div>
                <span className="font-semibold text-cyan-300 block mb-1">
                  Component Detail: Persistent ACID Storage Engine
                </span>
                <p className="text-slate-300">
                  Guarantees crash-safe durability via atomic temp-file swapping (<code className="font-mono text-cyan-300">fs.renameSync</code>)
                  to eliminate dirty partial-write corruptions. Maintains relational integrity across Dealerships, Bays, Technicians, Appointments, and Audit Logs.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Component Roles Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
          2. Component Breakdown & Invariants
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium bg-slate-950">
                <th className="py-2.5 px-3">Component</th>
                <th className="py-2.5 px-3">Stack / Runtime</th>
                <th className="py-2.5 px-3">Primary Invariants Enforced</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr>
                <td className="py-2.5 px-3 font-semibold text-white">Ingress & API Router</td>
                <td className="py-2.5 px-3 font-mono text-slate-400">Express 4.21 / tsx</td>
                <td className="py-2.5 px-3">
                  Validates schemas; generates and propagates W3C Trace IDs; enforces RFC 7807 error format.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-white">Availability Engine</td>
                <td className="py-2.5 px-3 font-mono text-slate-400">TypeScript Engine</td>
                <td className="py-2.5 px-3">
                  Filters by shift hours; checks simultaneous Bay & Technician overlap; computes conflict diagnostics.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-white">Constraint Allocator</td>
                <td className="py-2.5 px-3 font-mono text-slate-400">Transactional Mutex</td>
                <td className="py-2.5 px-3">
                  Guarantees mutual exclusion; executes Least-Slack heuristic; throws 409 Conflict if either resource is missing.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-white">Persistence Store</td>
                <td className="py-2.5 px-3 font-mono text-slate-400">Atomic File WAL</td>
                <td className="py-2.5 px-3">
                  Zero-dependency durability; atomic rename prevents corrupted half-written files.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-white">Telemetry Buffer</td>
                <td className="py-2.5 px-3 font-mono text-slate-400">In-Memory Ring Buffer</td>
                <td className="py-2.5 px-3">
                  Tracks P95 latencies, conflict ratios, bay utilization %, and structured audit log events.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Technology Stack Justifications */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
          3. Chosen Technologies & Justifications
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-950 p-4 rounded border border-slate-800 space-y-2">
            <span className="font-semibold text-indigo-300 block">Backend: Node.js & TypeScript</span>
            <p className="text-slate-400">
              The non-blocking event-driven loop handles high concurrency I/O efficiently. TypeScript provides
              strict compile-time contract sharing between the backend API and frontend dispatch components.
            </p>
          </div>
          <div className="bg-slate-950 p-4 rounded border border-slate-800 space-y-2">
            <span className="font-semibold text-indigo-300 block">Persistence: Atomic File-Backed WAL</span>
            <p className="text-slate-400">
              Selected over heavyweight external SQL servers to ensure zero native build hazards and immediate, reliable
              portability in all container sandboxes. Atomic file rename (<code className="font-mono">fs.renameSync</code>) guarantees crash-safe durability.
            </p>
          </div>
          <div className="bg-slate-950 p-4 rounded border border-slate-800 space-y-2">
            <span className="font-semibold text-indigo-300 block">Concurrency: Per-Facility Mutex</span>
            <p className="text-slate-400">
              Isolates concurrent booking critical sections by dealership ID. Prevents double-booking race conditions while allowing independent dealerships to scale bookings in parallel.
            </p>
          </div>
        </div>
      </div>

      {/* Observability Strategy */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
          4. Observability Strategy (Logs, Metrics, Tracing)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="bg-slate-950 p-4 rounded border border-slate-800 space-y-2">
            <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4" />
              1. Structured JSON Logging
            </span>
            <p className="text-slate-400">
              Every critical lifecycle event (<code className="font-mono text-emerald-300">AVAILABILITY_CHECK</code>,{' '}
              <code className="font-mono text-emerald-300">BOOKING_SUCCESS</code>,{' '}
              <code className="font-mono text-emerald-300">BOOKING_CONFLICT</code>) logs timestamps, latency in ms,
              associated facility, and root causes for failed allocations.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded border border-slate-800 space-y-2">
            <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4" />
              2. Real-Time Telemetry & KPIs
            </span>
            <p className="text-slate-400">
              Computes P95 booking latencies, conflict rejection rates, and live bay utilization percentage. Enables
              dealership managers to detect capacity bottlenecks before customer satisfaction degrades.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded border border-slate-800 space-y-2">
            <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4" />
              3. Distributed Tracing Spans
            </span>
            <p className="text-slate-400">
              Generates unique W3C trace identifiers for every request. Trace IDs are returned in HTTP response headers
              (<code className="font-mono text-emerald-300">X-Trace-Id</code>) and linked to all database appointment records.
            </p>
          </div>
        </div>
      </div>

      {/* Dedicated Section: GenAI in Design Phase */}
      <div className="bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-800/60 rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-semibold text-white tracking-wide">
            5. Dedicated Section: GenAI Usage in the System Design Phase
          </h2>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          GenAI was incorporated as a strategic architecture accelerator during the system conceptualization and design phase:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-950/80 p-3.5 rounded border border-indigo-900/40 space-y-1.5">
            <span className="font-semibold text-indigo-300 block">
              A. Constraint Satisfaction Formulation & Heuristics
            </span>
            <p className="text-slate-400">
              Prompted GenAI to analyze automotive workshop bottlenecks. The AI identified that a naive first-fit greedy allocation
              frequently starves specialized EV diagnostic and alignment bays by allocating them to simple oil changes, directly motivating the <strong>Least-Slack Allocation Heuristic</strong>.
            </p>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded border border-indigo-900/40 space-y-1.5">
            <span className="font-semibold text-indigo-300 block">
              B. Domain Taxonomy & Certification Mapping
            </span>
            <p className="text-slate-400">
              Collaborated with GenAI to synthesize automotive industry standard skill codes (e.g. ASE High-Voltage, Brake & Suspension, Heavy Powertrain) and physical bay tooling requirements, ensuring domain-authentic schema modeling.
            </p>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded border border-indigo-900/40 space-y-1.5">
            <span className="font-semibold text-indigo-300 block">
              C. Concurrency & Race Condition Threat Analysis
            </span>
            <p className="text-slate-400">
              Generated adversarial test cases where multiple simultaneous HTTP requests compete for the last remaining bay. This led directly to designing the per-facility mutex queue and building our automated concurrency test harness.
            </p>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded border border-indigo-900/40 space-y-1.5">
            <span className="font-semibold text-indigo-300 block">
              D. OpenAPI 3.0 & RFC 7807 Specification Synthesis
            </span>
            <p className="text-slate-400">
              Prompted GenAI to scaffold an exhaustive OpenAPI 3.0 contract and machine-readable cURL recipes, eliminating drift between API contracts and frontend client consumers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
