import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import { fetchPeminjaman } from '../api/client';
import type { PeminjamanBarang } from '../api/types';

const STATUS_MAP: Record<string, { label: string; fg: string; bg: string; accent: string }> = {
  aktif:   { label: 'Aktif',   fg: '#2563EB', bg: '#EFF6FF', accent: '#3B82F6' },
  partial: { label: 'Partial', fg: '#EA580C', bg: '#FFF7ED', accent: '#F97316' },
  selesai: { label: 'Selesai', fg: '#15803D', bg: '#F0FDF4', accent: '#22C55E' },
};

function PeminjamanCard({ item, onPress }: { item: PeminjamanBarang; onPress: () => void }) {
  const s = STATUS_MAP[item.status_peminjaman] ?? STATUS_MAP.aktif;
  const items = Array.isArray(item.items_dipinjam) ? item.items_dipinjam : [];
  return (
    <TouchableOpacity style={[styles.card, { borderLeftColor: s.accent, borderLeftWidth: 4 }]} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{item.nama_peminjam}</Text>
          <Text style={styles.cardWa}>{item.nomor_wa_peminjam}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: s.bg }]}>
          <Text style={[styles.badgeText, { color: s.fg }]}>{s.label}</Text>
        </View>
      </View>
      <Text style={styles.cardItems}>📦 {items.length} item dipinjam</Text>
      {item.tanggal_estimasi_pengembalian && (
        <Text style={styles.cardDate}>🗓️ Est. kembali: {item.tanggal_estimasi_pengembalian}</Text>
      )}
    </TouchableOpacity>
  );
}

function PeminjamanDetail({ item, onClose }: { item: PeminjamanBarang; onClose: () => void }) {
  const s = STATUS_MAP[item.status_peminjaman] ?? STATUS_MAP.aktif;
  const items = Array.isArray(item.items_dipinjam) ? item.items_dipinjam : [];
  return (
    <View style={styles.detail}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.detailName}>{item.nama_peminjam}</Text>
          <Text style={styles.detailWa}>{item.nomor_wa_peminjam}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: s.bg }]}>
          <Text style={[styles.badgeText, { color: s.fg }]}>{s.label}</Text>
        </View>
      </View>
      <FlatList
        data={items}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item: it, index }) => (
          <View style={styles.itemRow}>
            <Text style={styles.itemName}>{index + 1}. {it.nama_barang}</Text>
            <Text style={styles.itemSn}>SN: {it.nomor_seri}</Text>
            <View style={[styles.badge, { backgroundColor: it.status_pengembalian === 'dikembalikan' ? '#F0FDF4' : '#EFF6FF' }]}>
              <Text style={[styles.badgeText, { color: it.status_pengembalian === 'dikembalikan' ? '#15803D' : '#2563EB' }]}>
                {it.status_pengembalian === 'dikembalikan' ? '✓ Kembali' : 'Dipinjam'}
              </Text>
            </View>
          </View>
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListHeaderComponent={
          <View>
            {[
              { k: 'Tgl Pinjam', v: item.tanggal_peminjaman ?? '—' },
              { k: 'Est. Kembali', v: item.tanggal_estimasi_pengembalian ?? '—' },
              { k: 'Tgl Kembali', v: item.tanggal_pengembalian ?? '—' },
            ].map(f => (
              <View key={f.k} style={styles.fieldRow}>
                <Text style={styles.fieldKey}>{f.k}</Text>
                <Text style={styles.fieldVal}>{f.v}</Text>
              </View>
            ))}
            <Text style={[styles.detailName, { marginTop: 16, marginBottom: 8, color: '#1A1A1A' }]}>Barang Dipinjam</Text>
          </View>
        }
      />
    </View>
  );
}

export default function PeminjamanScreen() {
  const [data, setData] = useState<PeminjamanBarang[]>([]);
  const [filtered, setFiltered] = useState<PeminjamanBarang[]>([]);
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<PeminjamanBarang | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchPeminjaman();
      setData(res.data ?? []);
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
    let d = showAll ? data : data.filter(p => p.status_peminjaman !== 'selesai');
    if (q) d = d.filter(p => p.nama_peminjam.toLowerCase().includes(q) || p.nomor_wa_peminjam.includes(q));
    setFiltered(d);
  }, [query, data, showAll]);

  if (selected) return <PeminjamanDetail item={selected} onClose={() => setSelected(null)} />;
  if (loading) return <View style={styles.center}><ActivityIndicator color="#FFE500" size="large" /></View>;

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Cari nama atau nomor WA…"
          placeholderTextColor="#9aa0a6"
        />
        <TouchableOpacity
          style={[styles.toggleBtn, showAll && styles.toggleBtnActive]}
          onPress={() => setShowAll(v => !v)}
        >
          <Text style={[styles.toggleText, showAll && { color: '#1A1A1A' }]}>
            {showAll ? 'Semua' : 'Aktif'}
          </Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id_peminjaman ?? String(Math.random())}
        renderItem={({ item }) => <PeminjamanCard item={item} onPress={() => setSelected(item)} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#FFE500" />}
        contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>Tidak ada peminjaman</Text>
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
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04, elevation: 2,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  cardName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  cardWa: { fontSize: 11, color: '#9aa0a6', marginTop: 2 },
  cardItems: { fontSize: 12, color: '#5f6368' },
  cardDate: { fontSize: 12, color: '#EA580C', marginTop: 4 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  detail: { flex: 1, backgroundColor: '#F5F7FA' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#1A1A1A', gap: 10 },
  backBtn: { padding: 4 },
  backArrow: { color: '#FFE500', fontSize: 22, fontWeight: '700' },
  detailName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  detailWa: { fontSize: 11, color: '#9aa0a6' },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  fieldKey: { fontSize: 13, color: '#9aa0a6', fontWeight: '600' },
  fieldVal: { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  itemRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  itemName: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  itemSn: { fontSize: 11, color: '#9aa0a6', marginTop: 2, marginBottom: 4 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#9aa0a6', fontWeight: '600' },
});
