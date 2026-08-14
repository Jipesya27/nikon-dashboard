'use client';

import React from 'react';

export type ImmichMlMode = 'dell' | 'laptop' | 'unknown' | null;

export interface InfrastrukturTabProps {
  onRefresh: () => void;
  immichMlLoading: boolean;
  immichMlSwitching: boolean;
  immichMlMode: ImmichMlMode;
  immichMlError: string;
  switchImmichMl: (mode: 'dell' | 'laptop') => Promise<void> | void;
}

export default function InfrastrukturTab({
  onRefresh,
  immichMlLoading,
  immichMlSwitching,
  immichMlMode,
  immichMlError,
  switchImmichMl,
}: InfrastrukturTabProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </div>
          Monitoring Infrastruktur
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-bold hover:bg-gray-700 transition"
          >
            <svg className="w-4 h-4 inline-block mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>Refresh
          </button>
        </div>
      </div>

      {/* Synology */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-3 h-3 rounded-md bg-blue-400" />
          <h3 className="text-lg font-bold text-gray-900">Synology DS223J — <span className="font-mono text-gray-600">192.168.18.169</span></h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {[
            { label: 'PostgreSQL', detail: 'port 5433', status: 'Aktif' },
            { label: 'MinIO', detail: 'port 9010/9011', status: 'Aktif' },
            { label: 'Wetty (SSH)', detail: 'port 7681', status: 'Aktif' },
            { label: 'Cloudflared', detail: 'tunnel nikon-synology', status: 'HEALTHY' },
            { label: 'Cloud Sync', detail: 'Google Drive → /dashboard/backups', status: 'Up to date' },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-3">
              <div className="font-bold text-gray-800">{s.label}</div>
              <div className="text-gray-500 text-xs mt-0.5">{s.detail}</div>
              <div className="mt-2 inline-flex items-center gap-1 text-xs text-green-700 font-semibold">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-md" />{s.status}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cloudflare Tunnel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-3 h-3 rounded-md bg-orange-400" />
          <h3 className="text-lg font-bold text-gray-900">Cloudflare Tunnel — <span className="font-mono text-sm font-normal text-gray-500">Proxmox Dell OptiPlex 5060</span></h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {[
            { hostname: 'proxmox.altanikindo.web.id', target: 'localhost:8006', desc: 'Proxmox Web UI (HTTPS)' },
            { hostname: 'monitorproxmox.altanikindo.web.id', target: 'localhost:19999', desc: 'Netdata monitoring' },
            { hostname: 'immich.altanikindo.web.id', target: '192.168.18.210:2283', desc: 'Immich (CT 100)' },
            { hostname: 'casaos.altanikindo.web.id', target: '192.168.18.178:81', desc: 'CasaOS (CT 102)' },
            { hostname: 'uptime.altanikindo.web.id', target: '192.168.18.178:3001', desc: 'Uptime Kuma (CT 102)' },
            { hostname: 'files.altanikindo.web.id', target: '192.168.18.188:80', desc: 'Nextcloud (CT 103)' },
          ].map(r => (
            <div key={r.hostname} className="bg-gray-50 rounded-xl p-3 flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-orange-400 rounded-md mt-1.5 shrink-0" />
              <div>
                <div className="font-mono font-bold text-gray-800 text-xs">{r.hostname}</div>
                <div className="text-gray-500 text-xs">→ {r.target}</div>
                <div className="text-gray-400 text-xs mt-0.5">{r.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Immich ML Mode */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">Immich Machine Learning</h3>
            <p className="text-xs text-gray-500">Worker aktif untuk face recognition &amp; smart search</p>
          </div>
          {immichMlLoading && (
            <svg className="animate-spin w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
          )}
        </div>
        <div className="flex gap-3 mb-3">
          <button
            onClick={() => switchImmichMl('dell')}
            disabled={immichMlSwitching || immichMlMode === 'dell'}
            className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-bold transition-all ${immichMlMode === 'dell' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-white'} disabled:cursor-not-allowed`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              <span>Dell PC</span>
              {immichMlMode === 'dell' && <span className="ml-1 text-xs bg-blue-500 text-white rounded-md px-1.5 py-0.5">Aktif</span>}
            </div>
            <div className="text-xs font-normal mt-1 opacity-70">CPU · localhost:3003</div>
          </button>
          <button
            onClick={() => switchImmichMl('laptop')}
            disabled={immichMlSwitching || immichMlMode === 'laptop'}
            className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-bold transition-all ${immichMlMode === 'laptop' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-white'} disabled:cursor-not-allowed`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              <span>Laptop GPU</span>
              {immichMlMode === 'laptop' && <span className="ml-1 text-xs bg-purple-500 text-white rounded-md px-1.5 py-0.5">Aktif</span>}
            </div>
            <div className="text-xs font-normal mt-1 opacity-70">RTX 3050 · 192.168.18.145:3003</div>
          </button>
        </div>
        {immichMlSwitching && (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-1">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
            Mengganti worker ML...
          </div>
        )}
        {immichMlError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-xs">{immichMlError}</div>
        )}
        {immichMlMode === 'laptop' && !immichMlError && !immichMlSwitching && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-700 text-xs flex items-start gap-2">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span>Mode GPU aktif — pastikan laptop menyala dan terhubung ke Tailscale sebelum pakai Immich</span>
          </div>
        )}
        {immichMlMode === null && !immichMlLoading && !immichMlError && (
          <div className="text-xs text-gray-400 pt-1">Tambahkan IMMICH_API_KEY dan IMMICH_URL ke .env untuk mengaktifkan fitur ini</div>
        )}
      </div>
    </div>
  );
}
