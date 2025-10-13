"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

type SystemStatus = {
  rpc: string;
  database: string;
  alchemy: string;
  timestamp: string;
};

type SourceCode = {
  repository: string;
  backend: string;
  commitHash: string;
  buildDate: string | null;
};

type LastDrawing = {
  roundId: string;
  drawingDate: string;
  distributionDate: string | null;
  prizePoolSol: number;
  eligibleParticipants: number;
  winners: Record<string, string | null>;
  audit: {
    blockhash: string | null;
    slot: number | null;
    seed: string | null;
  } | null;
};

type Operation = {
  roundId: string;
  action: string;
  timestamp: string;
  status: string;
  details: any;
};

type Transaction = {
  signature: string;
  roundId: string;
  type: string;
  timestamp: string;
  solscanUrl: string;
};

type TransparencyData = {
  systemStatus: SystemStatus;
  sourceCode: SourceCode;
  lastDrawing: LastDrawing | null;
  recentOperations: Operation[];
  onChainTransactions: Transaction[];
};

export default function TransparencyPortalPage() {
  const [data, setData] = useState<TransparencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/transparency')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch transparency data');
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10 text-white">
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-400">Loading transparency data...</div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10 text-white">
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-red-400">Error loading transparency data: {error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 text-white">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-3">Transparency Portal</h1>
        <p className="text-slate-300 text-lg leading-relaxed max-w-4xl">
          Transparency is a top priority for Solotto as Solana's first on-chain lottery system.
          We provide direct access to our backend functions and scripts in the{' '}
          <a
            href={data.sourceCode.backend}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-semibold"
          >
            Solotto dApp GitHub Repo
          </a>
          {' '}and a dedicated History & Audit Module with detailed information regarding all lottery drawings.
          Below are additional transparency artifacts providing even more visibility into our operations.
        </p>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        {/* Transparency Dashboard API */}
        <button
          onClick={() => scrollToSection('dashboard-api')}
          className="group rounded-xl border border-primary/30 bg-gradient-to-br from-night-900/80 to-night-800/60 p-6 text-left transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20"
        >
          <div className="mb-3 flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-primary">Transparency Dashboard API</h3>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Real-time operational data including system health, recent operations, and on-chain transaction history.
          </p>
        </button>

        {/* Swagger/OpenAPI Documentation */}
        <button
          onClick={() => scrollToSection('swagger-docs')}
          className="group rounded-xl border border-primary/30 bg-gradient-to-br from-night-900/80 to-night-800/60 p-6 text-left transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20"
        >
          <div className="mb-3 flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-primary">Swagger/OpenAPI Documentation</h3>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Interactive API documentation with complete endpoint schemas and testing capabilities.
          </p>
        </button>

        {/* Comprehensive Documentation */}
        <button
          onClick={() => scrollToSection('comprehensive-docs')}
          className="group rounded-xl border border-primary/30 bg-gradient-to-br from-night-900/80 to-night-800/60 p-6 text-left transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20"
        >
          <div className="mb-3 flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-primary">Comprehensive Documentation</h3>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Full technical documentation covering architecture, workflows, verification methods, and security measures.
          </p>
        </button>
      </div>

      {/* System Status Section */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold text-primary mb-4">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatusCard label="RPC" status={data.systemStatus.rpc} />
          <StatusCard label="Database" status={data.systemStatus.database} />
          <StatusCard label="Alchemy API" status={data.systemStatus.alchemy} />
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Last updated: {new Date(data.systemStatus.timestamp).toLocaleString()}
        </p>
      </div>

      {/* Last Drawing Section */}
      {data.lastDrawing && (
        <div className="mb-10">
          <h2 className="text-2xl font-semibold text-primary mb-4">Latest Drawing</h2>
          <div className="rounded-xl border border-primary/20 bg-night-900/60 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-slate-400 mb-1">Round ID</div>
                <Link
                  href={`/history/${data.lastDrawing.roundId}`}
                  className="text-primary font-mono text-sm hover:underline"
                >
                  {data.lastDrawing.roundId}
                </Link>
              </div>
              <div>
                <div className="text-sm text-slate-400 mb-1">Prize Pool</div>
                <div className="text-white font-semibold">{data.lastDrawing.prizePoolSol.toFixed(6)} SOL</div>
              </div>
              <div>
                <div className="text-sm text-slate-400 mb-1">Drawing Date</div>
                <div className="text-white">{new Date(data.lastDrawing.drawingDate).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-slate-400 mb-1">Eligible Participants</div>
                <div className="text-white">{data.lastDrawing.eligibleParticipants}</div>
              </div>
            </div>

            {/* Winners */}
            <div className="mt-6">
              <div className="text-sm text-slate-400 mb-3">Winners by Tier</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(data.lastDrawing.winners).map(([tier, winner]) => (
                  <div key={tier} className="rounded-lg bg-night-800/80 p-3">
                    <div className="text-xs text-slate-500 mb-1">{tier.toUpperCase()}</div>
                    <div className="text-xs text-white font-mono break-all">
                      {winner || <span className="text-slate-600">No winner</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Audit Trail */}
            {data.lastDrawing.audit && (
              <div className="mt-6 rounded-lg border border-primary/20 bg-night-800/40 p-4">
                <div className="text-sm font-semibold text-primary mb-3">Audit Trail (Verifiable Randomness)</div>
                <div className="space-y-2 text-xs">
                  {data.lastDrawing.audit.blockhash && (
                    <div>
                      <span className="text-slate-400">Blockhash:</span>
                      <span className="ml-2 text-white font-mono break-all">{data.lastDrawing.audit.blockhash}</span>
                    </div>
                  )}
                  {data.lastDrawing.audit.slot && (
                    <div>
                      <span className="text-slate-400">Slot:</span>
                      <span className="ml-2 text-white font-mono">{data.lastDrawing.audit.slot}</span>
                    </div>
                  )}
                  {data.lastDrawing.audit.seed && (
                    <div>
                      <span className="text-slate-400">Seed:</span>
                      <span className="ml-2 text-white font-mono break-all">{data.lastDrawing.audit.seed}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transparency Dashboard API Section */}
      <div id="dashboard-api" className="mb-10 scroll-mt-20">
        <h2 className="text-2xl font-semibold text-primary mb-4">Transparency Dashboard API</h2>
        <div className="rounded-xl border border-primary/20 bg-night-900/60 p-6">
          <p className="text-slate-300 mb-4">
            The Transparency Dashboard API provides real-time access to operational data, system health metrics,
            recent lottery operations, and on-chain transaction history.
          </p>

          <div className="mb-4">
            <div className="text-sm text-slate-400 mb-2">Endpoint</div>
            <code className="block rounded-lg bg-night-800 px-4 py-3 text-sm text-primary font-mono break-all">
              {window.location.origin}/api/v1/transparency
            </code>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/api/transparency"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-badge-gradient px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              View Live Data
            </a>
            <button
              onClick={() => {
                fetch('/api/transparency')
                  .then(r => r.json())
                  .then(data => {
                    const json = JSON.stringify(data, null, 2);
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `transparency_${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  });
              }}
              className="rounded-lg border border-primary/25 bg-night-800 px-4 py-2 text-sm font-semibold text-primary hover:bg-night-700 transition-colors"
            >
              Download JSON
            </button>
          </div>

          {/* Recent Operations Preview */}
          {data.recentOperations.length > 0 && (
            <div className="mt-6">
              <div className="text-sm font-semibold text-slate-300 mb-3">Recent Operations</div>
              <div className="space-y-2">
                {data.recentOperations.slice(0, 5).map((op, idx) => (
                  <div key={idx} className="rounded-lg bg-night-800/80 p-3 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-primary capitalize">{op.action}</span>
                      <span className="text-slate-500">{new Date(op.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="text-slate-400">
                      Round: <span className="text-white font-mono">{op.roundId.substring(0, 16)}...</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Swagger/OpenAPI Documentation Section */}
      <div id="swagger-docs" className="mb-10 scroll-mt-20">
        <h2 className="text-2xl font-semibold text-primary mb-4">Swagger/OpenAPI Documentation</h2>
        <div className="rounded-xl border border-primary/20 bg-night-900/60 p-6">
          <p className="text-slate-300 mb-4">
            Interactive API documentation powered by Swagger UI. Browse all endpoints, view request/response schemas,
            and test API calls directly in your browser.
          </p>

          <div className="mb-4">
            <div className="text-sm text-slate-400 mb-2">Documentation URL</div>
            <code className="block rounded-lg bg-night-800 px-4 py-3 text-sm text-primary font-mono break-all">
              {window.location.origin.replace(':3000', ':4000')}/api/v1/docs
            </code>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={`${window.location.origin.replace(':3000', ':4000')}/api/v1/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-badge-gradient px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Open API Docs
            </a>
          </div>

          <div className="mt-6 rounded-lg border border-primary/10 bg-night-800/40 p-4">
            <div className="text-sm font-semibold text-slate-300 mb-2">Features</div>
            <ul className="text-sm text-slate-400 space-y-1 list-disc list-inside">
              <li>Complete endpoint documentation with descriptions</li>
              <li>Request/response schemas for all API calls</li>
              <li>Interactive "Try it out" functionality</li>
              <li>Authentication examples and security definitions</li>
              <li>Organized by workflow stages (Control, Snapshot, Drawing, etc.)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Comprehensive Documentation Section */}
      <div id="comprehensive-docs" className="mb-10 scroll-mt-20">
        <h2 className="text-2xl font-semibold text-primary mb-4">Comprehensive Documentation</h2>
        <div className="rounded-xl border border-primary/20 bg-night-900/60 p-6">
          <p className="text-slate-300 mb-4">
            Full technical documentation covering the backend architecture, lottery workflow, randomness generation algorithm,
            audit trails, security measures, and user verification instructions.
          </p>

          <div className="mb-4">
            <div className="text-sm text-slate-400 mb-2">Documentation Files</div>
            <div className="space-y-2">
              <a
                href={`${data.sourceCode.backend}/blob/main/TRANSPARENCY.md`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg bg-night-800 px-4 py-3 text-sm hover:bg-night-700 transition-colors"
              >
                <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-white font-mono">TRANSPARENCY.md</span>
                <span className="ml-auto text-xs text-slate-500">Main documentation</span>
              </a>
              <a
                href={`${data.sourceCode.backend}/blob/main/README_TRANSPARENCY.md`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg bg-night-800 px-4 py-3 text-sm hover:bg-night-700 transition-colors"
              >
                <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-white font-mono">README_TRANSPARENCY.md</span>
                <span className="ml-auto text-xs text-slate-500">Quick start guide</span>
              </a>
              <a
                href={`${data.sourceCode.backend}/blob/main/PRODUCTION_CHECKLIST.md`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg bg-night-800 px-4 py-3 text-sm hover:bg-night-700 transition-colors"
              >
                <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span className="text-white font-mono">PRODUCTION_CHECKLIST.md</span>
                <span className="ml-auto text-xs text-slate-500">Mainnet deployment</span>
              </a>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={data.sourceCode.backend}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-badge-gradient px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              View on GitHub
            </a>
          </div>

          <div className="mt-6 rounded-lg border border-primary/10 bg-night-800/40 p-4">
            <div className="text-sm font-semibold text-slate-300 mb-2">Documentation Topics</div>
            <ul className="text-sm text-slate-400 space-y-1 list-disc list-inside">
              <li>Architecture overview and technology stack</li>
              <li>Complete lottery workflow (Control → Snapshot → Drawing → Harvest → Distribution)</li>
              <li>Randomness generation using Solana blockhash + timestamp</li>
              <li>Database audit trails and on-chain verification</li>
              <li>Security measures and authentication</li>
              <li>User verification instructions and FAQ</li>
            </ul>
          </div>
        </div>
      </div>

      {/* On-Chain Transactions */}
      {data.onChainTransactions.length > 0 && (
        <div className="mb-10">
          <h2 className="text-2xl font-semibold text-primary mb-4">Recent On-Chain Transactions</h2>
          <div className="rounded-xl border border-primary/20 bg-night-900/60 p-6">
            <div className="space-y-2">
              {data.onChainTransactions.slice(0, 5).map((tx, idx) => (
                <div key={idx} className="rounded-lg bg-night-800/80 p-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-xs text-slate-400 mb-1">Signature</div>
                      <a
                        href={tx.solscanUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary font-mono hover:underline break-all"
                      >
                        {tx.signature}
                      </a>
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(tx.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <a
              href="/history"
              className="mt-4 inline-block text-sm text-primary hover:underline"
            >
              View all transactions in History →
            </a>
          </div>
        </div>
      )}

      {/* Source Code Info */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-night-900/80 to-night-800/60 p-6">
        <h2 className="text-xl font-semibold text-primary mb-4">Source Code Verification</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-slate-400 mb-1">Repository</div>
            <a
              href={data.sourceCode.repository}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline break-all"
            >
              {data.sourceCode.repository}
            </a>
          </div>
          <div>
            <div className="text-slate-400 mb-1">Backend Source</div>
            <a
              href={data.sourceCode.backend}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline break-all"
            >
              {data.sourceCode.backend}
            </a>
          </div>
          <div>
            <div className="text-slate-400 mb-1">Commit Hash</div>
            <div className="text-white font-mono">{data.sourceCode.commitHash}</div>
          </div>
          <div>
            <div className="text-slate-400 mb-1">Build Date</div>
            <div className="text-white">{data.sourceCode.buildDate || 'Not available'}</div>
          </div>
        </div>
      </div>
    </main>
  );
}

function StatusCard({ label, status }: { label: string; status: string }) {
  const isHealthy = status === 'healthy';
  const isDegraded = status === 'degraded';
  const statusColor = isHealthy ? 'text-green-400' : isDegraded ? 'text-yellow-400' : 'text-slate-400';
  const bgColor = isHealthy ? 'bg-green-500/10' : isDegraded ? 'bg-yellow-500/10' : 'bg-slate-500/10';
  const borderColor = isHealthy ? 'border-green-500/20' : isDegraded ? 'border-yellow-500/20' : 'border-slate-500/20';

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} p-4`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-300">{label}</span>
        <span className={`text-xs font-semibold uppercase ${statusColor}`}>{status}</span>
      </div>
    </div>
  );
}
