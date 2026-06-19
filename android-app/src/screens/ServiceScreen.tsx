import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import { fetchServices } from '../api/client';
import type { StatusService } from '../api/types';

const DONE = ['Selesai', 'Tidak Bisa Diperbaiki', 'Dibatalkan'];

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { fg: string; bg: string }> = {
    Selesai:              { fg: '#15803D', bg: '#F0FDF4' },
    'Dalam Pengerjaan':   { fg: '#2563EB', bg: '#EFF6FF' },
    Menunggu:             { fg: '#EA580C', bg: '#FFF7ED' },
    'Tidak Bisa Diperbaiki': { fg: '#DC2626', bg: '#FEF2F2' },
    Dibatalkan:           { fg: '#9aa0a6', bg: '#F3F4F6' },
  };
  const c = colors[status] ?? { fg: '#5f6368', bg: '#F3F4F6' };
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.fg }]}>{status}</Text>
    </View>
  );
}

function ServiceCard({ item }: { item: StatusService }) {
  const isDone = DONE.includes(item.status_service);
  return (
    <View style={[styles.card, isDone && { opacity: 0.65 }]}>
      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>No. {item.nomor_tanda_terima}</Text>
          <Text style={styles.cardSub}>SN: {item.nomor_seri}</Text>
        </View>
        <StatusBadge status={item.status_service} />
      </View>
      {item.created_at && (
        <Text style={styles.date}>
          📅 {new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>
      )}
    </View>
  );
}

export default function ServiceScreen() {
  const [data, setData] = useState<StatusService[]>([]);
  const [filtered, setFiltered] = useState<StatusService[]>([]);
  const [query, setQuery] = useState('');
  const [showDone, setShowDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchServices();
      const d = res.data ?? [];
      setData(d);
    } catch {
      // keep
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const q = query.toLowerCase();
    let d = showDone ? data : data.filter(s => !DONE.includes(s.status_service));
    if (q) d = d.filter(s => s.nomor_tanda_terima.includes(q) || s.nomor_seri.includes(q));
    setFiltered(d);
  }, [query, data, showDone]);

  const aktif = data.filter(s => !DONE.includes(s.status_service)).length;

  if (loading) return <View style={styles.center}><ActivityIndicator color="#FFE500" size="large" /></View>;

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Cari no. tanda terima atau SN…"
          placeholderTextColor="#9aa0a6"
        />
        <TouchableOpacity
          style={[styles.toggleBtn, showDone && styles.toggleBtnActive]}
          onPress={() => setShowDone(v => !v)}
        >
          <Text style={[styles.toggleText, showDone && styles.toggleTextActive]}>
            {showDone ? 'Semua' : `Aktif (${aktif})`}
          </Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id_service ?? item.nomor_tanda_terima}
        renderItem={({ item }) => <ServiceCard item={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#FFE500" />}
        contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔧</Text>
            <Text style={styles.emptyText}>Tidak ada data service</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEF0F2', gap: 8 },
  searchInput: {
    backgroundColor: '#F5F7FA', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#1A1A1A', borderWidth: 1, borderColor: '#E8EAED',
  },
  toggleBtn: { alignSelf: 'flex-start', backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  toggleBtnActive: { backgroundColor: '#FFE500' },
  toggleText: { fontSize: 12, fontWeight: '700', color: '#5f6368' },
  toggleTextActive: { color: '#1A1A1A' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04, elevation: 2,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  cardSub: { fontSize: 11, color: '#9aa0a6', marginTop: 2 },
  date: { fontSize: 12, color: '#5f6368' },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#9aa0a6', fontWeight: '600' },
});
