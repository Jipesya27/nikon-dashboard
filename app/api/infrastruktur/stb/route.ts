import { NextResponse } from 'next/server';
import os from 'os';
import { execSync } from 'child_process';

export const runtime = 'nodejs';

function getDiskUsage() {
  try {
    const out = execSync("df -k / | awk 'NR==2{print $2,$3,$4}'", { timeout: 3000 }).toString().trim();
    const [total, used, free] = out.split(' ').map(Number);
    return { total: total * 1024, used: used * 1024, free: free * 1024 };
  } catch {
    return { total: 0, used: 0, free: 0 };
  }
}

export async function GET() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const disk = getDiskUsage();
  const cpus = os.cpus();
  const loadAvg = os.loadavg();

  return NextResponse.json({
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    cpu: {
      model: cpus[0]?.model.trim() || 'Unknown',
      cores: cpus.length,
      loadAvg: loadAvg.map((l: number) => Math.round(l * 100) / 100),
      usagePercent: Math.min(100, Math.round((loadAvg[0] / cpus.length) * 100)),
    },
    memory: {
      total: totalMem,
      used: totalMem - freeMem,
      free: freeMem,
      usedPercent: Math.round(((totalMem - freeMem) / totalMem) * 100),
    },
    disk: {
      ...disk,
      usedPercent: disk.total > 0 ? Math.round((disk.used / disk.total) * 100) : 0,
    },
    uptime: {
      system: Math.round(os.uptime()),
      process: Math.round(process.uptime()),
    },
    timestamp: new Date().toISOString(),
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  });
}
