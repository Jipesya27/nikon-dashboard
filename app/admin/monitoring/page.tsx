'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StbDisk {
  filesystem: string;
  mount: string;
  total_kb: number;
  used_kb: number;
  free_kb: number;
  percent: number;
  error?: string;
}

interface StbNetIface {
  rx_bytes: number;
  tx_bytes: number;
  rx_packets: number;
  tx_packets: number;
}

interface DockerContainer {
  name: string;
  status: string;
  image: string;
  ports: string;
  running: boolean;
  error?: string;
}

interface StbData {
  cpu_percent: number;
  memory: {
    total_kb: number;
    used_kb: number;
    available_kb: number;
    cached_kb: number;
    percent: number;
  };
  disks: StbDisk[];
  network: Record<string, StbNetIface>;
  temperature: { zones: Record<string, number>; cpu_freq_mhz: number | null };
  load: { load1: number; load5: number; load15: number };
  uptime_seconds: number;
  docker: DockerContainer[];
  hostname: string;
  timestamp: number;
}

interface SynologyData {
  utilization: {
    cpu: { user_load: number; system_load: number; other_load: number; idle: number };
    memory: { real_usage: number; total: number; avail_real: number };
    network: { device: string; rx: number; tx: number }[];
  } | null;
  storage: {
    volumes: { id: string; size_total_byte: string; size_used_byte: string; device_type: string; status: string }[];
    disks: { id: string; model: string; status: string; size_total: string; temp: number }[];
  } | null;
  info: {
    model: string;
    serial: string;
    firmware_ver: string;
    up_time: string;
    cpu_serial_num: string;
  } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

function fmtUptime(secs: number) {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}h ${h}j ${m}m`;
  if (h > 0) return `${h}j ${m}m`;
  return `${m}m`;
}

function pctColor(pct: number) {
  if (pct < 60) return '#22c55e';
  if (pct < 80) return '#f59e0b';
  return '#ef4444';
}

function tempColor(t: number) {
  if (t < 50) return '#22c55e';
  if (t < 70) return '#f59e0b';
  return '#ef4444';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusDot({ online }: { online: boolean }) {
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      {online && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{ backgroundColor: '#22c55e' }} />
      )}
      <span className="relative inline-flex rounded-full h-2.5 w-2.5"
        style={{ backgroundColor: online ? '#22c55e' : '#6b7280' }} />
    </span>
  );
}

function GaugeBar({ pct, label, sub }: { pct: number; label: string; sub: string }) {
  const color = pctColor(pct);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="font-mono font-semibold" style={{ color }}>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full bg-gray-700 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
      </div>
      <div className="text-xs text-gray-500">{sub}</div>
    </div>
  );
}

const SPARKLINE_LEN = 40;

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <div className="h-10" />;
  const max = Math.max(...values, 1);
  const w = 200, h = 40;
  const pts = values.map((v, i) => {
    const x = (i / (SPARKLINE_LEN - 1)) * w;
    const y = h - (v / max) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function Card({ title, badge, children, className = '' }: {
  title: string; badge?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`rounded-xl border border-gray-700 bg-gray-900 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
        {badge}
      </div>
      {children}
    </div>
  );
}

// ─── STB Panel ────────────────────────────────────────────────────────────────

function StbPanel({ data, prevNet, online }: {
  data: StbData | null;
  prevNet: React.MutableRefObject<{ iface: string; rx: number; tx: number; ts: number } | null>;
  online: boolean;
}) {
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [netHistory, setNetHistory] = useState<{ rx: number[]; tx: number[] }>({ rx: [], tx: [] });
  const [netRate, setNetRate] = useState<{ rxBps: number; txBps: number } | null>(null);

  useEffect(() => {
    if (!data) return;

    setCpuHistory(h => [...h.slice(-(SPARKLINE_LEN - 1)), data.cpu_percent]);

    // network rate
    const ifaces = Object.keys(data.network).filter(n => n !== 'lo');
    const iface = ifaces.find(n => n.startsWith('eth')) ?? ifaces[0];
    if (iface) {
      const net = data.network[iface];
      const now = data.timestamp;
      if (prevNet.current && prevNet.current.iface === iface) {
        const dt = now - prevNet.current.ts;
        if (dt > 0) {
          const rxBps = (net.rx_bytes - prevNet.current.rx) / dt;
          const txBps = (net.tx_bytes - prevNet.current.tx) / dt;
          setNetRate({ rxBps, txBps });
          setNetHistory(h => ({
            rx: [...h.rx.slice(-(SPARKLINE_LEN - 1)), rxBps],
            tx: [...h.tx.slice(-(SPARKLINE_LEN - 1)), txBps],
          }));
        }
      }
      prevNet.current = { iface, rx: net.rx_bytes, tx: net.tx_bytes, ts: now };
    }
  }, [data, prevNet]);

  const mainTemp = data
    ? Math.max(...Object.values(data.temperature.zones))
    : null;

  const mainIface = data
    ? (Object.keys(data.network).find(n => n.startsWith('eth')) ?? Object.keys(data.network)[0])
    : null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <StatusDot online={online} />
        <span className="text-xs text-gray-400 font-mono">
          {data?.hostname ?? 'HG680-P'} · 192.168.18.63
        </span>
        {data && (
          <span className="ml-auto text-xs text-gray-500">
            ↑ {fmtUptime(data.uptime_seconds)}
          </span>
        )}
      </div>

      {!data && (
        <div className="text-center py-8 text-gray-500 text-sm">
          {online ? 'Memuat...' : 'Tidak dapat terhubung ke STB'}
        </div>
      )}

      {data && (
        <>
          {/* CPU + Temp row */}
          <div className="grid grid-cols-2 gap-3">
            <Card title="CPU">
              <GaugeBar pct={data.cpu_percent} label="" sub={`Load ${data.load.load1.toFixed(2)}`} />
              <Sparkline values={cpuHistory} color="#FFE500" />
            </Card>
            <Card title="Suhu">
              <div className="flex flex-col items-center justify-center py-1">
                <span className="text-3xl font-bold font-mono" style={{ color: mainTemp ? tempColor(mainTemp) : '#6b7280' }}>
                  {mainTemp != null ? `${mainTemp}°` : '--'}
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  {data.temperature.cpu_freq_mhz ? `${data.temperature.cpu_freq_mhz} MHz` : 'CPU'}
                </span>
                {Object.entries(data.temperature.zones).map(([zone, t]) => (
                  <div key={zone} className="text-xs text-gray-600 font-mono">
                    {zone}: {t}°C
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* RAM */}
          <Card title="RAM">
            <GaugeBar
              pct={data.memory.percent}
              label=""
              sub={`${fmtBytes(data.memory.used_kb * 1024)} / ${fmtBytes(data.memory.total_kb * 1024)} · Cache ${fmtBytes(data.memory.cached_kb * 1024)}`}
            />
          </Card>

          {/* Disks */}
          <Card title="Storage">
            <div className="space-y-2">
              {data.disks.filter(d => !d.error).map(disk => (
                <GaugeBar
                  key={disk.mount}
                  pct={disk.percent}
                  label={disk.mount}
                  sub={`${fmtBytes(disk.used_kb * 1024)} / ${fmtBytes(disk.total_kb * 1024)}`}
                />
              ))}
            </div>
          </Card>

          {/* Network */}
          {mainIface && (
            <Card title={`Network · ${mainIface}`}>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <div className="text-xs text-gray-500">↓ Download</div>
                  <div className="text-sm font-mono font-semibold text-green-400">
                    {netRate ? `${fmtBytes(netRate.rxBps)}/s` : '--'}
                  </div>
                  <Sparkline values={netHistory.rx} color="#22c55e" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">↑ Upload</div>
                  <div className="text-sm font-mono font-semibold text-blue-400">
                    {netRate ? `${fmtBytes(netRate.txBps)}/s` : '--'}
                  </div>
                  <Sparkline values={netHistory.tx} color="#60a5fa" />
                </div>
              </div>
              {mainIface && data.network[mainIface] && (
                <div className="text-xs text-gray-600 font-mono">
                  Total RX: {fmtBytes(data.network[mainIface].rx_bytes)} · TX: {fmtBytes(data.network[mainIface].tx_bytes)}
                </div>
              )}
            </Card>
          )}

          {/* Docker */}
          <Card title="Docker Containers">
            <div className="space-y-1">
              {data.docker.filter(c => !c.error).map(c => (
                <div key={c.name} className="flex items-center gap-2 py-1 border-b border-gray-800 last:border-0">
                  <span className={`text-xs ${c.running ? 'text-green-400' : 'text-gray-500'}`}>●</span>
                  <span className="text-xs font-mono text-gray-300 flex-1 truncate">{c.name}</span>
                  <span className="text-xs text-gray-500 truncate max-w-[120px]">{c.status}</span>
                </div>
              ))}
              {data.docker.length === 0 && (
                <div className="text-xs text-gray-600">Tidak ada container</div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Synology Panel ───────────────────────────────────────────────────────────

function SynologyPanel({ data, online }: { data: SynologyData | null; online: boolean }) {
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [netHistory, setNetHistory] = useState<{ rx: number[]; tx: number[] }>({ rx: [], tx: [] });

  useEffect(() => {
    if (!data?.utilization) return;
    const cpu = data.utilization.cpu;
    const pct = (cpu.user_load ?? 0) + (cpu.system_load ?? 0);
    setCpuHistory(h => [...h.slice(-(SPARKLINE_LEN - 1)), pct]);

    const net = data.utilization.network?.[0];
    if (net) {
      setNetHistory(h => ({
        rx: [...h.rx.slice(-(SPARKLINE_LEN - 1)), net.rx ?? 0],
        tx: [...h.tx.slice(-(SPARKLINE_LEN - 1)), net.tx ?? 0],
      }));
    }
  }, [data]);

  const cpu = data?.utilization?.cpu;
  const cpuPct = cpu ? (cpu.user_load + cpu.system_load) : 0;
  const mem = data?.utilization?.memory;
  const memPct = mem && mem.total > 0 ? ((mem.total - mem.avail_real) / mem.total * 100) : 0;
  const net = data?.utilization?.network?.[0];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <StatusDot online={online} />
        <span className="text-xs text-gray-400 font-mono">
          DS223J · 192.168.18.169
        </span>
        {data?.info?.up_time && (
          <span className="ml-auto text-xs text-gray-500">
            ↑ {data.info.up_time}
          </span>
        )}
      </div>

      {data?.info && (
        <div className="text-xs text-gray-600 font-mono">
          {data.info.model} · DSM {data.info.firmware_ver}
        </div>
      )}

      {!data && (
        <div className="text-center py-8 text-gray-500 text-sm">
          {online ? 'Memuat...' : 'Tidak dapat terhubung ke Synology'}
        </div>
      )}

      {data && (
        <>
          {/* CPU */}
          <Card title="CPU">
            {cpu ? (
              <>
                <GaugeBar pct={cpuPct} label="" sub={`User ${cpu.user_load}% · Sys ${cpu.system_load}% · Idle ${cpu.idle}%`} />
                <Sparkline values={cpuHistory} color="#FFE500" />
              </>
            ) : <div className="text-xs text-gray-600">Data tidak tersedia</div>}
          </Card>

          {/* RAM */}
          <Card title="RAM">
            {mem ? (
              <GaugeBar
                pct={memPct}
                label=""
                sub={`Dipakai ${fmtBytes((mem.total - mem.avail_real) * 1024)} / ${fmtBytes(mem.total * 1024)}`}
              />
            ) : <div className="text-xs text-gray-600">Data tidak tersedia</div>}
          </Card>

          {/* Volumes */}
          {data.storage?.volumes && data.storage.volumes.length > 0 && (
            <Card title="Volumes">
              <div className="space-y-2">
                {data.storage.volumes.map(vol => {
                  const total = parseInt(vol.size_total_byte) || 0;
                  const used = parseInt(vol.size_used_byte) || 0;
                  const pct = total > 0 ? (used / total) * 100 : 0;
                  return (
                    <div key={vol.id}>
                      <GaugeBar
                        pct={pct}
                        label={`${vol.id} (${vol.device_type})`}
                        sub={`${fmtBytes(used)} / ${fmtBytes(total)} · ${vol.status}`}
                      />
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Disks */}
          {data.storage?.disks && data.storage.disks.length > 0 && (
            <Card title="Disk HDDs">
              <div className="space-y-1">
                {data.storage.disks.map(disk => (
                  <div key={disk.id} className="flex items-center justify-between py-1 border-b border-gray-800 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono text-gray-300 truncate">{disk.id}</div>
                      <div className="text-xs text-gray-600 truncate">{disk.model}</div>
                    </div>
                    <div className="text-right ml-2">
                      {disk.temp != null && (
                        <span className="text-xs font-mono" style={{ color: tempColor(disk.temp) }}>
                          {disk.temp}°C
                        </span>
                      )}
                      <div className="text-xs text-gray-500">{fmtBytes(parseInt(disk.size_total) || 0)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Network */}
          {net && (
            <Card title={`Network · ${net.device ?? 'eth0'}`}>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <div className="text-xs text-gray-500">↓ Download</div>
                  <div className="text-sm font-mono font-semibold text-green-400">
                    {fmtBytes((net.rx ?? 0) * 1024)}/s
                  </div>
                  <Sparkline values={netHistory.rx} color="#22c55e" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">↑ Upload</div>
                  <div className="text-sm font-mono font-semibold text-blue-400">
                    {fmtBytes((net.tx ?? 0) * 1024)}/s
                  </div>
                  <Sparkline values={netHistory.tx} color="#60a5fa" />
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MonitoringPage() {
  const [stbData, setStbData] = useState<StbData | null>(null);
  const [stbOnline, setStbOnline] = useState(false);
  const [stbError, setStbError] = useState<string | null>(null);

  const [synData, setSynData] = useState<SynologyData | null>(null);
  const [synOnline, setSynOnline] = useState(false);
  const [synError, setSynError] = useState<string | null>(null);

  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(4);
  const [paused, setPaused] = useState(false);

  const stbPrevNet = useRef<{ iface: string; rx: number; tx: number; ts: number } | null>(null);

  const fetchStb = useCallback(async () => {
    try {
      const res = await fetch('/api/monitoring/stb', { cache: 'no-store' });
      const json = await res.json();
      if (json.ok) {
        setStbData(json.data);
        setStbOnline(true);
        setStbError(null);
      } else {
        setStbOnline(false);
        setStbError(json.error);
      }
    } catch {
      setStbOnline(false);
      setStbError('Fetch failed');
    }
  }, []);

  const fetchSynology = useCallback(async () => {
    try {
      const res = await fetch('/api/monitoring/synology', { cache: 'no-store' });
      const json = await res.json();
      if (json.ok) {
        setSynData(json.data);
        setSynOnline(true);
        setSynError(null);
      } else {
        setSynOnline(false);
        setSynError(json.error);
      }
    } catch {
      setSynOnline(false);
      setSynError('Fetch failed');
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([fetchStb(), fetchSynology()]);
    setLastUpdate(new Date());
  }, [fetchStb, fetchSynology]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(refresh, refreshInterval * 1000);
    return () => clearInterval(id);
  }, [refresh, refreshInterval, paused]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-5 rounded-sm" style={{ backgroundColor: '#FFE500' }} />
          <h1 className="font-bold text-base tracking-tight">System Monitor</h1>
        </div>

        <div className="ml-auto flex items-center gap-3 text-xs">
          {lastUpdate && (
            <span className="text-gray-500 font-mono hidden sm:block">
              {lastUpdate.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}
            </span>
          )}

          <select
            value={refreshInterval}
            onChange={e => setRefreshInterval(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300"
          >
            <option value={2}>2s</option>
            <option value={4}>4s</option>
            <option value={10}>10s</option>
            <option value={30}>30s</option>
          </select>

          <button
            onClick={() => setPaused(p => !p)}
            className={`px-2 py-1 rounded border text-xs ${paused
              ? 'border-yellow-500 text-yellow-400 bg-yellow-950'
              : 'border-gray-700 text-gray-400'}`}
          >
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>

          <button
            onClick={refresh}
            className="px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            ↺
          </button>
        </div>
      </div>

      {/* Error banners */}
      {stbError && (
        <div className="mx-4 mt-3 px-3 py-2 rounded bg-red-950 border border-red-800 text-red-300 text-xs font-mono">
          STB: {stbError}
        </div>
      )}
      {synError && (
        <div className="mx-4 mt-3 px-3 py-2 rounded bg-red-950 border border-red-800 text-red-300 text-xs font-mono">
          Synology: {synError}
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 max-w-6xl mx-auto">
        {/* STB column */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <StatusDot online={stbOnline} />
            <h2 className="font-semibold text-sm text-gray-300">HG680-P · STB</h2>
            <span className="text-xs text-gray-600">Armbian · S905X</span>
          </div>
          <StbPanel data={stbData} prevNet={stbPrevNet} online={stbOnline} />
        </div>

        {/* Synology column */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <StatusDot online={synOnline} />
            <h2 className="font-semibold text-sm text-gray-300">Synology DS223J · NAS</h2>
            <span className="text-xs text-gray-600">DiskStation</span>
          </div>
          <SynologyPanel data={synData} online={synOnline} />
        </div>
      </div>

      {/* Footer hint */}
      <div className="px-4 pb-6 text-center text-xs text-gray-700">
        Auto-refresh setiap {refreshInterval}s · Data dari jaringan lokal 192.168.18.x
      </div>
    </div>
  );
}
