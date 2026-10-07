import React, { useState } from 'react';
import { OPENAPI_SPEC } from '../server/openApiSpec.js';
import { Terminal, Copy, Check, Play, FileJson, ArrowRight, Server } from 'lucide-react';

interface EndpointDefinition {
  method: 'GET' | 'POST' | 'PATCH';
  path: string;
  summary: string;
  defaultParams?: Record<string, string>;
  defaultBody?: any;
}

const ENDPOINTS: EndpointDefinition[] = [
  {
    method: 'GET',
    path: '/api/health',
    summary: 'System health, persistent database status, and uptime'
  },
  {
    method: 'GET',
    path: '/api/dealerships',
    summary: 'List dealerships, facility codes, and operating hours'
  },
  {
    method: 'GET',
    path: '/api/service-types',
    summary: 'Service catalog with durations and required physical capabilities'
  },
  {
    method: 'GET',
    path: '/api/availability',
    summary: 'Query real-time slot availability for dealership and service on a date',
    defaultParams: {
      dealershipId: 'dlr_metro_central',
      serviceTypeId: 'srv_ev_battery_diag',
      date: new Date().toISOString().split('T')[0]
    }
  },
  {
    method: 'POST',
    path: '/api/appointments',
    summary: 'Resource-constrained booking with atomic Bay & Technician allocation',
    defaultBody: {
      dealershipId: 'dlr_metro_central',
      serviceTypeId: 'srv_ev_battery_diag',
      startTime: `${new Date().toISOString().split('T')[0]}T13:00:00.000Z`,
      customer: {
        name: 'Sarah Connor',
        email: 's.connor@example.com',
        phone: '(206) 555-0199'
      },
      vehicle: {
        vin: '5YJ3E1EB8NF129031',
        make: 'Tesla',
        model: 'Model 3',
        year: 2023,
        fuelType: 'EV',
        licensePlate: 'WA-ELEC01'
      },
      notes: 'Customer requesting battery thermal test.'
    }
  },
  {
    method: 'GET',
    path: '/api/appointments',
    summary: 'List confirmed appointment records'
  },
  {
    method: 'GET',
    path: '/api/metrics',
    summary: 'Observability metrics, P95 latency, and recent audit logs'
  },
  {
    method: 'GET',
    path: '/api/openapi.json',
    summary: 'Full OpenAPI 3.0 specification document'
  }
];

export const ApiSandbox: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDefinition>(ENDPOINTS[3]); // Availability by default
  const [params, setParams] = useState<Record<string, string>>(ENDPOINTS[3].defaultParams || {});
  const [requestBody, setRequestBody] = useState<string>(
    JSON.stringify(ENDPOINTS[3].defaultBody || {}, null, 2)
  );

  const [executing, setExecuting] = useState<boolean>(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseTimeMs, setResponseTimeMs] = useState<number | null>(null);
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>({});
  const [responseData, setResponseData] = useState<any | null>(null);
  const [copiedCurl, setCopiedCurl] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'sandbox' | 'openapi'>('sandbox');

  const handleSelectEndpoint = (ep: EndpointDefinition) => {
    setSelectedEndpoint(ep);
    setParams(ep.defaultParams || {});
    setRequestBody(ep.defaultBody ? JSON.stringify(ep.defaultBody, null, 2) : '');
    setResponseStatus(null);
    setResponseData(null);
  };

  // Construct target URL
  const buildUrl = () => {
    let url = selectedEndpoint.path;
    if (selectedEndpoint.method === 'GET' && Object.keys(params).length > 0) {
      const q = new URLSearchParams(params).toString();
      url += `?${q}`;
    }
    return url;
  };

  // Build copyable cURL string
  const generateCurl = () => {
    const fullUrl = `${window.location.origin}${buildUrl()}`;
    if (selectedEndpoint.method === 'GET') {
      return `curl -X GET "${fullUrl}" \\\n  -H "Accept: application/json"`;
    } else if (selectedEndpoint.method === 'POST') {
      return `curl -X POST "${fullUrl}" \\\n  -H "Content-Type: application/json" \\\n  -d '${requestBody.replace(/'/g, "\\'")}'`;
    } else {
      return `curl -X ${selectedEndpoint.method} "${fullUrl}"`;
    }
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(generateCurl());
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  // Execute request
  const handleExecute = async () => {
    setExecuting(true);
    setResponseStatus(null);
    setResponseData(null);
    const start = performance.now();

    try {
      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'X-Trace-Id': `trc_curl_${Date.now()}`
        }
      };

      if (selectedEndpoint.method === 'POST' && requestBody) {
        options.body = requestBody;
      }

      const res = await fetch(buildUrl(), options);
      const elapsed = Math.round(performance.now() - start);
      setResponseStatus(res.status);
      setResponseTimeMs(elapsed);

      const headersObj: Record<string, string> = {};
      res.headers.forEach((val, key) => {
        headersObj[key] = val;
      });
      setResponseHeaders(headersObj);

      const json = await res.json();
      setResponseData(json);
    } catch (err: any) {
      setResponseStatus(500);
      setResponseData({ error: 'EXECUTION_FAILED', message: err.message });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">
            RESTful API Contract & Interactive Test Harness
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Test backend endpoints live, inspect OpenAPI 3.0 specifications, and copy ready-to-use cURL commands.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded">
          <button
            onClick={() => setViewMode('sandbox')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              viewMode === 'sandbox'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Interactive Sandbox & cURL
          </button>
          <button
            onClick={() => setViewMode('openapi')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              viewMode === 'openapi'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            OpenAPI 3.0 Contract (JSON)
          </button>
        </div>
      </div>

      {viewMode === 'openapi' ? (
        /* OpenAPI Specification Preview */
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <FileJson className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-white uppercase tracking-wider">
                OpenAPI 3.0.3 Contract Definition
              </span>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(JSON.stringify(OPENAPI_SPEC, null, 2))}
              className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Full OpenAPI Spec</span>
            </button>
          </div>

          <pre className="p-4 bg-slate-950 rounded border border-slate-800 text-xs font-mono text-slate-300 max-h-[600px] overflow-auto leading-relaxed">
            {JSON.stringify(OPENAPI_SPEC, null, 2)}
          </pre>
        </div>
      ) : (
        /* Sandbox Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Endpoint Directory (4 cols) */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block px-1 pb-2 border-b border-slate-800">
              REST Endpoints
            </span>

            <div className="space-y-1.5 pt-2">
              {ENDPOINTS.map((ep) => {
                const isSelected =
                  selectedEndpoint.path === ep.path && selectedEndpoint.method === ep.method;
                return (
                  <button
                    key={`${ep.method}-${ep.path}`}
                    type="button"
                    onClick={() => handleSelectEndpoint(ep)}
                    className={`w-full text-left p-2.5 rounded transition-all border ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-950/40 text-white'
                        : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-950'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          ep.method === 'GET'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : ep.method === 'POST'
                            ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {ep.method}
                      </span>
                      <span className="font-semibold text-white truncate">{ep.path}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 truncate">{ep.summary}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Request Config & Execution (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Request Builder */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                      selectedEndpoint.method === 'GET'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : selectedEndpoint.method === 'POST'
                        ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {selectedEndpoint.method}
                  </span>
                  <span className="font-mono text-xs text-white font-semibold">{buildUrl()}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCurl}
                    className="px-2.5 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 flex items-center gap-1.5"
                  >
                    {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCurl ? 'Copied cURL' : 'Copy cURL'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExecute}
                    disabled={executing}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{executing ? 'Executing...' : 'Send Request'}</span>
                  </button>
                </div>
              </div>

              {/* Query Parameters (if GET) */}
              {selectedEndpoint.method === 'GET' && Object.keys(params).length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
                    Query Parameters
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {Object.entries(params).map(([key, value]) => (
                      <div key={key}>
                        <label className="block text-[11px] text-slate-500 mb-1 font-mono">{key}</label>
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => setParams({ ...params, [key]: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* JSON Body (if POST) */}
              {selectedEndpoint.method === 'POST' && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
                    JSON Request Payload
                  </span>
                  <textarea
                    rows={8}
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {/* cURL Display */}
              <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-500 block uppercase tracking-wider">
                  Generated cURL Snippet:
                </span>
                <pre className="text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
                  {generateCurl()}
                </pre>
              </div>
            </div>

            {/* Response Inspector */}
            {responseStatus !== null && (
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        responseStatus >= 200 && responseStatus < 300
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : responseStatus === 409
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      HTTP {responseStatus}
                    </span>
                    {responseTimeMs !== null && (
                      <span className="text-xs text-slate-400 font-mono">
                        Latency: {responseTimeMs}ms
                      </span>
                    )}
                  </div>
                  {responseHeaders['x-trace-id'] && (
                    <span className="text-xs text-indigo-400 font-mono">
                      Trace: {responseHeaders['x-trace-id']}
                    </span>
                  )}
                </div>

                <pre className="p-4 bg-slate-950 rounded border border-slate-800 text-xs font-mono text-slate-200 max-h-[400px] overflow-auto">
                  {JSON.stringify(responseData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
