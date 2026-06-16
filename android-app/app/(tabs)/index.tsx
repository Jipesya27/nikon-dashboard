import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { getSession, logout } from '@/lib/auth';
import { sbRead } from '@/lib/api';
import { NIKON_YELLOW, NIKON_BLACK } from '@/constants/config';

interface Stats {
  pesanMasuk: number;
  menungguValidasi: number;
  acaraAktif: number;
  sudahHadir: number;
}

export default function HomeScreen() {
  const [nama, setNama] = useState('');
  const [stats, setStats] = useState<Stats>({ pesanMasuk: 0, menungguValidasi: 0, acaraAktif: 0, sudahHadir: 0 });
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    const session = await getSession();
    if (session?.karyawan) {
      setNama(session.karyawan.nama_karyawan);
    }
    try {
      const [regs, attended] = await Promise.all([
        sbRead<{ id: string }>({
          table: 'event_registrations',
          select: 'id',
          filters: [{ col: 'status_pendaftaran', op: 'eq', val: 'menunggu_validasi' }],
          limit: 100,
        }),
        sbRead<{ id: string }>({
          table: 'event_registrations',
          select: 'id',
          filters: [{ col: 'is_attended', op: 'eq', val: true }],
          limit: 100,
        }),
      ]);
      setStats({
        pesanMasuk: 0,
        menungguValidasi: regs.length,
        acaraAktif: 0,
        sudahHadir: attended.length,
      });
    } catch {
      // stats load failure is non-critical
    }
  }

  async function handleLogout() {
    Alert.alert('Logout', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar', style: 'destructive', onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        }
      },
    ]);
  }

  useEffect(() => { loadData(); }, []);

  function onRefresh() {
    setRefreshing(true);
    loadData().finally(() => setRefreshing(false));
  }

  const cards = [
    { label: 'Pesan WA', value: 'Lihat', emoji: '💬', color: '#25D366', route: '/(tabs)/messages' },
    { label: 'Menunggu Validasi', value: stats.menungguValidasi, emoji: '🎫', color: '#f59e0b', route: '/(tabs)/events' },
    { label: 'Scan Absensi', value: 'Buka', emoji: '📷', color: '#6366f1', route: '/(tabs)/attendance' },
    { label: 'Sudah Hadir', value: stats.sudahHadir, emoji: '✅', color: '#10b981', route: null },
  ] as const;

  return (
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={NIKON_BLACK} />}
    >
      <View style={styles.banner}>
        <Text style={styles.greeting}>Halo, {nama || '...'} 👋</Text>
        <Text style={styles.subGreeting}>Nikon Dashboard</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Keluar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {cards.map((c) => (
          <TouchableOpacity
            key={c.label}
            style={[styles.card, { borderLeftColor: c.color }]}
            onPress={() => c.route && router.push(c.route as never)}
            activeOpacity={c.route ? 0.7 : 1}
          >
            <Text style={styles.cardEmoji}>{c.emoji}</Text>
            <Text style={styles.cardValue}>{String(c.value)}</Text>
            <Text style={styles.cardLabel}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.version}>Nikon Dashboard v1.0 · Alta Nikon Indo</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f5f5' },
  banner: { backgroundColor: NIKON_YELLOW, padding: 24, paddingTop: 48 },
  greeting: { fontSize: 22, fontWeight: '800', color: NIKON_BLACK },
  subGreeting: { fontSize: 14, color: '#444', marginTop: 4 },
  logoutBtn: { marginTop: 12, alignSelf: 'flex-start', backgroundColor: NIKON_BLACK, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  logoutText: { color: NIKON_YELLOW, fontWeight: '700', fontSize: 13 },
  grid: { padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 16, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardEmoji: { fontSize: 28, marginBottom: 8 },
  cardValue: { fontSize: 22, fontWeight: '800', color: NIKON_BLACK },
  cardLabel: { fontSize: 12, color: '#666', marginTop: 4, fontWeight: '500' },
  version: { textAlign: 'center', color: '#999', fontSize: 11, marginVertical: 24 },
});
