import { NextRequest, NextResponse } from 'next/server';
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

// CORS preflight — this endpoint is polled cross-origin (e.g. from
// backup.altanikindo.web.id), so browsers send an OPTIONS request first
// because of the custom x-infra-secret header.
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'x-infra-secret',
    },
  });
}

export async function GET(req: NextRequest) {
  // Cross-origin caller (different domain than this deployment) — cookies
  // can't be used here (sameSite:strict admin_session never reaches a
  // different domain), so this route is gated by a shared secret instead,
  // same pattern as app/api/internal/lychee-notify. Fails closed: with no
  // secret configured, nobody gets in.
  const secret = req.headers.get('x-infra-secret');
  if (!process.env.INFRA_MONITOR_SECRET || secret !== process.env.INFRA_MONITOR_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
