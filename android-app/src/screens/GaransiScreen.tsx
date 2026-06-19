import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import { fetchGaransi } from '../api/client';
import type { Garansi } from '../api/types';

const STATUS_MAP: Record<string, { label: string; fg: string; bg: string }> = {
  Menunggu: { label: 'Menunggu', fg: '#EA580C', bg: '#FFF7ED' },
  Valid:     { label: 'Valid',    fg: '#15803D', bg: '#F0FDF4' },
  'Tidak Valid': { label: 'Tidak Valid', fg: '#DC2626', bg: '#FEF2F2' },
};

function GaransiCard({ item, onPress }: { item: Garansi; onPress: () => void }) {
  const s = STATUS_MAP[item.status_validasi] ?? { label: item.status_validasi, fg: '#9aa0a6', bg: '#F3F4F6' };
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{item.nama_pendaftar ?? item.nomor_wa ?? '—'}</Text>
          <Text style={styles.cardSub}>SN: {item.nomor_seri}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: s.bg }]}>
          <Text style={[styles.badgeText, { color: s.fg }]}>{s.label}</Text>
        </View>
      </View>
      <View style={styles.cardMeta}>
        <Text style={styles.metaText}>📷 {item.tipe_barang}</Text>
        {item.jenis_garansi && <Text style={styles.metaText}> · {item.jenis_garansi} · {item.lama_garansi}</Text>}
      </View>
      {item.nama_toko && <Text style={styles.shopText}>🏪 {item.nama_toko}</Text>}
    </TouchableOpacity>
  );
}

function GaransiDetail({ item, onClose }: { item: Garansi; onClose: () => void }) {
  const s = STATUS_MAP[item.status_validasi] ?? { label: item.status_validasi, fg: '#9aa0a6', bg: '#F3F4F6' };
  const fields = [
    { k: 'Nama Pendaftar', v: item.nama_pendaftar ?? '—' },
    { k: 'Nomor WA', v: item.nomor_wa ?? '—' },
    { k: 'Nomor Seri', v: item.nomor_seri },
    { k: 'Tipe Barang', v: item.tipe_barang },
    { k: 'Jenis Garansi', v: item.jenis_garansi },
    { k: 'Lama Garansi', v: item.lama_garansi },
    { k: 'Nama Toko', v: item.nama_toko ?? '—' },
    { k: 'Tgl Pembelian', v: item.tanggal_pembelian ?? '—' },
    { k: 'Status', v: item.status_validasi },
    { k: 'Validasi MKT', v: item.validasi_by_mkt ?? '—' },
    { k: 'Catatan', v: item.catatan_mkt ?? '—' },
  ];

  return (
    <View style={styles.detail}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.detailTitle}>{item.nama_pendaftar ?? 'Detail Garansi'}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: s.bg }]}>
          <Text style={[styles.badgeText, { color: s.fg }]}>{s.label}</Text>
        </View>
      </View>
      <FlatList
        data={fields}
        keyExtractor={f => f.k}
        renderItem={({ item: f }) => (
          <View style={styles.fieldRow}>
            <Text style={styles.fieldKey}>{f.k}</Text>
            <Text style={styles.fieldVal}>{f.v}</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 16 }}
      />
    </View>
  );
}

export default function GaransiScreen() {
  const [data, setData] = useState<Garansi[]>([]);
  const [filtered, setFiltered] = useState<Garansi[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Garansi | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchGaransi();
      const d = res.data ?? [];
      setData(d);
      setFiltered(d);
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
    if (!q) { setFiltered(data); return; }
    setFiltered(data.filter(g =>
      (g.nama_pendaftar ?? '').toLowerCase().includes(q) ||
      g.nomor_seri.includes(q) ||
      g.tipe_barang.toLowerCase().includes(q),
    ));
  }, [query, data]);

  if (selected) return <GaransiDetail item={selected} onClose={() => setSelected(null)} />;

  if (loading) return <View style={styles.center}><ActivityIndicator color="#FFE500" size="large" /></View>;

  return (
    <View style={styles.root}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Cari nama, SN, tipe barang…"
          placeholderTextColor="#9aa0a6"
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id_garansi ?? String(Math.random())}
        renderItem={({ item }) => <GaransiCard item={item} onPress={() => setSelected(item)} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#FFE500" />}
        contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🛡️</Text>
            <Text style={styles.emptyText}>Tidak ada garansi</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchRow: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEF0F2' },
  searchInput: {
    backgroundColor: '#F5F7FA', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#1A1A1A', borderWidth: 1, borderColor: '#E8EAED',
  },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04, elevation: 2,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  cardName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  cardSub: { fontSize: 11, color: '#9aa0a6', marginTop: 2 },
  cardMeta: { flexDirection: 'row' },
  metaText: { fontSize: 12, color: '#5f6368' },
  shopText: { fontSize: 12, color: '#5f6368', marginTop: 4 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  detail: { flex: 1, backgroundColor: '#F5F7FA' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#1A1A1A', gap: 10 },
  backBtn: { padding: 4 },
  backArrow: { color: '#FFE500', fontSize: 22, fontWeight: '700' },
  detailTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  fieldRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  fieldKey: { fontSize: 13, color: '#9aa0a6', fontWeight: '600' },
  fieldVal: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', textAlign: 'right', maxWidth: '60%' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#9aa0a6', fontWeight: '600' },
});
