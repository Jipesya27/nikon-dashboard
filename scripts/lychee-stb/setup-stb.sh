#!/bin/bash
# Setup Lychee di STB HG680P — jalankan sebagai root

NAS_IP="192.168.18.145"
NAS_SHARE="/volume2/photo"
MOUNT_POINT="/mnt/photos"

echo "=== 1. Install dependensi ==="
apt update && apt install -y nfs-common docker.io docker-compose

echo "=== 2. Buat folder ==="
mkdir -p /opt/lychee/db /opt/lychee/conf /opt/lychee/logs
mkdir -p $MOUNT_POINT

echo "=== 3. Mount NFS dari Synology ==="
mount -t nfs $NAS_IP:$NAS_SHARE $MOUNT_POINT

echo "=== 4. Tambahkan ke /etc/fstab agar auto-mount saat reboot ==="
FSTAB_ENTRY="$NAS_IP:$NAS_SHARE $MOUNT_POINT nfs defaults,_netdev 0 0"
grep -qxF "$FSTAB_ENTRY" /etc/fstab || echo "$FSTAB_ENTRY" >> /etc/fstab

echo "=== 5. Start Docker service ==="
systemctl enable docker
systemctl start docker

echo "=== 6. Deploy Lychee ==="
cd "$(dirname "$0")"
docker compose up -d

echo ""
echo "=== Selesai! Akses di: http://192.168.18.63:3010 ==="
