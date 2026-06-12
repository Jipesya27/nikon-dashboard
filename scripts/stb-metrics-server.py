#!/usr/bin/env python3
"""
STB Metrics Server - jalankan di HG680-P (192.168.18.63)
Port: 9091

Deploy:
  scp scripts/stb-metrics-server.py root@192.168.18.63:/opt/stb-metrics/server.py
  ssh root@192.168.18.63
  pip3 install -q requests 2>/dev/null || true
  # Buat systemd service:
  cat > /etc/systemd/system/stb-metrics.service << 'EOF'
  [Unit]
  Description=STB Metrics HTTP Server
  After=network.target

  [Service]
  ExecStart=/usr/bin/python3 /opt/stb-metrics/server.py
  Restart=always
  RestartSec=5

  [Install]
  WantedBy=multi-user.target
  EOF
  systemctl daemon-reload && systemctl enable --now stb-metrics
"""

import json, subprocess, time, os, glob
from http.server import HTTPServer, BaseHTTPRequestHandler

_cpu_prev = None

def read_cpu_stat():
    with open('/proc/stat') as f:
        line = f.readline()
    vals = list(map(int, line.split()[1:8]))
    idle = vals[3] + vals[4]
    total = sum(vals)
    return idle, total

def get_cpu_percent():
    global _cpu_prev
    idle1, total1 = read_cpu_stat()
    if _cpu_prev:
        p_idle, p_total = _cpu_prev
        diff_idle = idle1 - p_idle
        diff_total = total1 - p_total
        pct = 100.0 * (1 - diff_idle / diff_total) if diff_total else 0
    else:
        time.sleep(0.2)
        idle2, total2 = read_cpu_stat()
        pct = 100.0 * (1 - (idle2 - idle1) / (total2 - total1))
        idle1, total1 = idle2, total2
    _cpu_prev = (idle1, total1)
    return round(pct, 1)

def get_memory():
    m = {}
    with open('/proc/meminfo') as f:
        for line in f:
            k, v = line.split(':')
            m[k.strip()] = int(v.strip().split()[0])  # kB
    total = m.get('MemTotal', 0)
    available = m.get('MemAvailable', 0)
    used = total - available
    return {
        'total_kb': total,
        'used_kb': used,
        'free_kb': m.get('MemFree', 0),
        'available_kb': available,
        'buffers_kb': m.get('Buffers', 0),
        'cached_kb': m.get('Cached', 0) + m.get('SReclaimable', 0),
        'percent': round(used / total * 100, 1) if total else 0,
    }

def get_disks():
    result = []
    try:
        out = subprocess.check_output(['df', '-k'], text=True, stderr=subprocess.DEVNULL)
        for line in out.split('\n')[1:]:
            parts = line.split()
            if len(parts) < 6:
                continue
            mount = parts[5]
            if mount in ('/', '/mnt/synology', '/boot', '/var') or mount.startswith('/mnt/'):
                total_kb = int(parts[1])
                used_kb = int(parts[2])
                free_kb = int(parts[3])
                result.append({
                    'filesystem': parts[0],
                    'mount': mount,
                    'total_kb': total_kb,
                    'used_kb': used_kb,
                    'free_kb': free_kb,
                    'percent': round(used_kb / total_kb * 100, 1) if total_kb else 0,
                })
    except Exception as e:
        result.append({'error': str(e)})
    return result

def get_network():
    result = {}
    with open('/proc/net/dev') as f:
        for line in f.readlines()[2:]:
            parts = line.split()
            if len(parts) < 10:
                continue
            iface = parts[0].rstrip(':')
            if iface == 'lo':
                continue
            result[iface] = {
                'rx_bytes': int(parts[1]),
                'tx_bytes': int(parts[9]),
                'rx_packets': int(parts[2]),
                'tx_packets': int(parts[10]),
                'rx_errors': int(parts[3]),
                'tx_errors': int(parts[11]),
            }
    return result

def get_temperatures():
    temps = {}
    for path in glob.glob('/sys/class/thermal/thermal_zone*/temp'):
        zone = path.split('/')[-2]
        try:
            with open(path) as f:
                temps[zone] = round(int(f.read().strip()) / 1000, 1)
        except:
            pass
    # CPU freq
    freq = None
    try:
        with open('/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq') as f:
            freq = int(f.read().strip()) // 1000  # MHz
    except:
        pass
    return {'zones': temps, 'cpu_freq_mhz': freq}

def get_load():
    with open('/proc/loadavg') as f:
        parts = f.read().split()
    return {
        'load1': float(parts[0]),
        'load5': float(parts[1]),
        'load15': float(parts[2]),
        'running_procs': parts[3],
    }

def get_uptime():
    with open('/proc/uptime') as f:
        secs = float(f.read().split()[0])
    return int(secs)

def get_docker_containers():
    try:
        out = subprocess.check_output(
            ['docker', 'ps', '-a', '--format', '{{.Names}}|{{.Status}}|{{.Image}}|{{.Ports}}'],
            text=True, stderr=subprocess.DEVNULL, timeout=3
        )
        containers = []
        for line in out.strip().split('\n'):
            if not line:
                continue
            parts = line.split('|')
            running = parts[1].startswith('Up') if len(parts) > 1 else False
            containers.append({
                'name': parts[0],
                'status': parts[1] if len(parts) > 1 else '',
                'image': parts[2] if len(parts) > 2 else '',
                'ports': parts[3] if len(parts) > 3 else '',
                'running': running,
            })
        return containers
    except Exception as e:
        return [{'error': str(e)}]

def get_all_metrics():
    return {
        'cpu_percent': get_cpu_percent(),
        'memory': get_memory(),
        'disks': get_disks(),
        'network': get_network(),
        'temperature': get_temperatures(),
        'load': get_load(),
        'uptime_seconds': get_uptime(),
        'docker': get_docker_containers(),
        'hostname': os.uname().nodename,
        'timestamp': int(time.time()),
    }

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/metrics':
            try:
                data = json.dumps(get_all_metrics())
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(data.encode())
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        elif self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'ok')
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, *args):
        pass  # silent

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', 9091), Handler)
    print('STB Metrics running on :9091/metrics')
    server.serve_forever()
