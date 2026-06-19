import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { fetchEventRegistrations } from '../api/client';
import type { EventRegistration } from '../api/types';
import type { EventsStackParamList } from '../navigation';

type Route = RouteProp<EventsStackParamList, 'EventDetail'>;

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  terdaftar: { label: 'Terdaftar', color: '#15803D', bg: '#F0FDF4' },
  menunggu_validasi: { label: 'Menunggu', color: '#EA580C', bg: '#FFF7ED' },
  ditolak: { label: 'Ditolak', color: '#DC2626', bg: '#FEF2F2' },
};

function RegItem({ reg }: { reg: EventRegistration }) {
  const s = STATUS_LABEL[reg.status_pendaftaran ?? ''] ?? { label: reg.status_pendaftaran ?? '—', color: '#9aa0a6', bg: '#F3F4F6' };
  return (
    <View style={styles.regItem}>
      <View style={{ flex: 1 }}>
        <Text style={styles.regName}>{reg.nama_lengkap ?? '—'}</Text>
        <Text style={styles.regWa}>{reg.nomor_wa ?? '—'}</Text>
        {reg.tipe_kamera && <Text style={styles.regCamera}>📷 {reg.tipe_kamera}</Text>}
        {reg.is_attended && <Text style={styles.attended}>✅ Hadir</Text>}
      </View>
      <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
        <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
      </View>
    </View>
  );
}

export default function EventDetailScreen() {
  const route = useRoute<Route>();
  const { eventId, title } = route.params;
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const load = useCallback(async () => {
    try {
      const res = await fetchEventRegistrations(eventId);
      setRegistrations(res.data ?? []);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const counts = {
    all: registrations.length,
    terdaftar: registrations.filter(r => r.status_pendaftaran === 'terdaftar').length,
    menunggu_validasi: registrations.filter(r => r.status_pendaftaran === 'menunggu_validasi').length,
    ditolak: registrations.filter(r => r.status_pendaftaran === 'ditolak').length,
    attended: registrations.filter(r => r.is_attended).length,
  };

  const displayList = filter === 'all' ? registrations : registrations.filter(r => r.status_pendaftaran === filter);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#FFE500" size="large" /></View>;
  }

  return (
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#FFE500" />}
    >
      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { key: 'all', label: 'Total', count: counts.all },
          { key: 'terdaftar', label: 'Diterima', count: counts.terdaftar },
          { key: 'menunggu_validasi', label: 'Menunggu', count: counts.menunggu_validasi },
          { key: 'attended', label: 'Hadir', count: counts.attended },
        ].map(s => (
          <TouchableOpacity
            key={s.key}
            style={[styles.statCard, filter === s.key && styles.statCardActive]}
            onPress={() => setFilter(s.key)}
          >
            <Text style={[styles.statNum, filter === s.key && styles.statNumActive]}>{s.count}</Text>
            <Text style={[styles.statLabel, filter === s.key && styles.statLabelActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <View style={styles.list}>
        {displayList.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Tidak ada data</Text>
          </View>
        ) : displayList.map((reg, i) => (
          <RegItem key={reg.id ?? i} reg={reg} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 8, padding: 12 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: 'transparent',
    shadowColor: '#000', shadowOpacity: 0.04, elevation: 2,
  },
  statCardActive: { borderColor: '#FFE500', backgroundColor: '#FFFDE7' },
  statNum: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  statNumActive: { color: '#A88600' },
  statLabel: { fontSize: 10, color: '#9aa0a6', fontWeight: '600', marginTop: 2 },
  statLabelActive: { color: '#A88600' },
  list: { padding: 12, paddingTop: 0, gap: 8 },
  regItem: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row',
    alignItems: 'flex-start', gap: 10,
    shadowColor: '#000', shadowOpacity: 0.04, elevation: 1,
  },
  regName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  regWa: { fontSize: 12, color: '#9aa0a6', marginTop: 2 },
  regCamera: { fontSize: 12, color: '#5f6368', marginTop: 4 },
  attended: { fontSize: 12, color: '#15803D', fontWeight: '600', marginTop: 4 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 10, fontWeight: '700' },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 14, color: '#9aa0a6' },
});
