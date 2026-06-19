import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { fetchClaims, fetchGaransi, fetchServices, fetchPeminjaman, fetchChatContacts } from '../api/client';
import type { ClaimPromo, Garansi, StatusService, PeminjamanBarang } from '../api/types';

type AnyNav = NavigationProp<Record<string, object | undefined>>;

interface Stats {
  totalKonsumen: number;
  totalKlaim: number;
  klaimBelumCek: number;
  totalGaransi: number;
  garansiMenunggu: number;
  serviceAktif: number;
  peminjamanAktif: number;
}

const DONE_STATUSES = ['Selesai', 'Tidak Bisa Diperbaiki', 'Dibatalkan'];

function getClaimColor(c: ClaimPromo): string {
  if (!c.validasi_by_mkt || c.validasi_by_mkt === '') return 'Putih';
  if (c.validasi_by_mkt === 'Tidak Valid') return 'Merah';
  if (c.validasi_by_mkt === 'Hold') return 'Orange';
  if (c.validasi_by_mkt === 'Valid' && (!c.validasi_by_fa || c.validasi_by_fa === '')) return 'Biru';
  if (c.validasi_by_fa === 'Valid' && !c.nomor_resi) return 'Pink';
  if (c.nomor_resi && !c.status_resi) return 'Hijau';
  if (c.status_resi === 'terkirim') return 'Teal';
  return 'Putih';
}

function KpiCard({ label, value, color, onPress }: { label: string; value: number; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.kpiCard, { borderTopColor: color, borderTopWidth: 3 }]} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function AlertCard({ icon, title, sub, onPress }: { icon: string; title: string; sub: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.alertCard} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.alertIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.alertTitle}>{title}</Text>
        <Text style={styles.alertSub}>{sub}</Text>
      </View>
      <Text style={{ color: '#d0d4d8', fontSize: 18 }}>›</Text>
    </TouchableOpacity>
  );
}

function QuickBtn({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quickBtn} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.quickIcon}>{icon}</Text>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { karyawan } = useAuth();
  const navigation = useNavigation<AnyNav>();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [claimRes, garansiRes, serviceRes, peminjamanRes, konsumenRes] = await Promise.allSettled([
        fetchClaims(1, 'all', ''),
        fetchGaransi(),
        fetchServices(),
        fetchPeminjaman(),
        fetchChatContacts(),
      ]);

      const claims: ClaimPromo[] = claimRes.status === 'fulfilled' ? (claimRes.value.claims ?? []) : [];
      const garansi: Garansi[] = garansiRes.status === 'fulfilled' ? (garansiRes.value.data ?? []) : [];
      const services: StatusService[] = serviceRes.status === 'fulfilled' ? (serviceRes.value.data ?? []) : [];
      const peminjaman: PeminjamanBarang[] = peminjamanRes.status === 'fulfilled' ? (peminjamanRes.value.data ?? []) : [];
      const konsumen = konsumenRes.status === 'fulfilled' ? (konsumenRes.value.data ?? []) : [];

      setStats({
        totalKonsumen: konsumen.length,
        totalKlaim: claims.length,
        klaimBelumCek: claims.filter(c => getClaimColor(c) === 'Putih').length,
        totalGaransi: garansi.length,
        garansiMenunggu: garansi.filter(g => g.status_validasi === 'Menunggu').length,
        serviceAktif: services.filter(s => !DONE_STATUSES.includes(s.status_service)).length,
        peminjamanAktif: peminjaman.filter(p => p.status_peminjaman === 'aktif').length,
      });
    } catch {
      // partial data ok
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const today = new Date().toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
  });

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFE500" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Halo, {karyawan?.nama_karyawan?.split(' ')[0] ?? 'Admin'} 👋</Text>
          <Text style={styles.date}>{today}</Text>
        </View>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{karyawan?.role ?? ''}</Text>
        </View>
      </View>

      {loading && !stats ? (
        <ActivityIndicator color="#FFE500" style={{ marginTop: 40 }} size="large" />
      ) : stats ? (
        <>
          {/* KPI Grid */}
          <Text style={styles.sectionTitle}>Ringkasan</Text>
          <View style={styles.kpiGrid}>
            <KpiCard label="Konsumen" value={stats.totalKonsumen} color="#FFE500" onPress={() => navigation.navigate('Chat', undefined)} />
            <KpiCard label="Klaim" value={stats.totalKlaim} color="#EF4444" onPress={() => navigation.navigate('Claims', undefined)} />
            <KpiCard label="Garansi" value={stats.totalGaransi} color="#22C55E" onPress={() => navigation.navigate('Garansi', undefined)} />
            <KpiCard label="Service" value={stats.serviceAktif} color="#7C3AED" onPress={() => navigation.navigate('Service', undefined)} />
          </View>

          {/* Alerts */}
          {(stats.klaimBelumCek > 0 || stats.garansiMenunggu > 0 || stats.peminjamanAktif > 0) && (
            <>
              <Text style={styles.sectionTitle}>Perlu Perhatian</Text>
              {stats.klaimBelumCek > 0 && (
                <AlertCard
                  icon="📋"
                  title={`${stats.klaimBelumCek} klaim belum dicek`}
                  sub="Perlu validasi marketing"
                  onPress={() => navigation.navigate('Claims', undefined)}
                />
              )}
              {stats.garansiMenunggu > 0 && (
                <AlertCard
                  icon="🛡️"
                  title={`${stats.garansiMenunggu} garansi menunggu`}
                  sub="Verifikasi pendaftaran garansi"
                  onPress={() => navigation.navigate('Garansi', undefined)}
                />
              )}
              {stats.peminjamanAktif > 0 && (
                <AlertCard
                  icon="📦"
                  title={`${stats.peminjamanAktif} peminjaman aktif`}
                  sub="Barang aset sedang dipinjam"
                  onPress={() => navigation.navigate('Peminjaman', undefined)}
                />
              )}
            </>
          )}

          {/* Quick Menu */}
          <Text style={styles.sectionTitle}>Menu Cepat</Text>
          <View style={styles.quickGrid}>
            <QuickBtn icon="💬" label="Chat" onPress={() => navigation.navigate('Chat', undefined)} />
            <QuickBtn icon="📅" label="Events" onPress={() => navigation.navigate('Events', undefined)} />
            <QuickBtn icon="📋" label="Klaim" onPress={() => navigation.navigate('Claims', undefined)} />
            <QuickBtn icon="🛡️" label="Garansi" onPress={() => navigation.navigate('Garansi', undefined)} />
            <QuickBtn icon="🔧" label="Service" onPress={() => navigation.navigate('Service', undefined)} />
            <QuickBtn icon="💰" label="Biaya" onPress={() => navigation.navigate('ExpenseClaims', undefined)} />
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 16, paddingBottom: 32 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, marginBottom: 20,
  },
  greeting: { fontSize: 17, fontWeight: '700', color: '#fff' },
  date: { fontSize: 12, color: '#9aa0a6', marginTop: 2 },
  roleBadge: { backgroundColor: '#FFE500', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  roleText: { fontSize: 11, fontWeight: '800', color: '#1A1A1A' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 10, marginTop: 4 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  kpiCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  kpiValue: { fontSize: 28, fontWeight: '900', color: '#1A1A1A' },
  kpiLabel: { fontSize: 12, color: '#9aa0a6', fontWeight: '600', marginTop: 4 },
  alertCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, elevation: 2,
  },
  alertIcon: { fontSize: 24 },
  alertTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  alertSub: { fontSize: 12, color: '#9aa0a6', marginTop: 2 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  quickBtn: {
    width: '30%', backgroundColor: '#fff', borderRadius: 12, padding: 14,
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, elevation: 2,
  },
  quickIcon: { fontSize: 24, marginBottom: 6 },
  quickLabel: { fontSize: 11, fontWeight: '600', color: '#5f6368' },
});
