import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fetchClaims, sbWrite, sendWAMessage } from '../api/client';
import type { ClaimPromo } from '../api/types';
import type { MainTabParamList } from '../navigation';

type Nav = NativeStackNavigationProp<MainTabParamList>;

const WARNA: Record<string, { label: string; fg: string; bg: string; accent: string }> = {
  Semua:  { label: 'Semua',         fg: '#fff',    bg: '#374151', accent: '#374151' },
  Putih:  { label: 'Belum Dicek',   fg: '#4B5563', bg: '#F3F4F6', accent: '#9CA3AF' },
  Merah:  { label: 'Tidak Valid',   fg: '#DC2626', bg: '#FEF2F2', accent: '#EF4444' },
  Orange: { label: 'Hold',          fg: '#EA580C', bg: '#FFF7ED', accent: '#F97316' },
  Biru:   { label: 'Tunggu FA',     fg: '#2563EB', bg: '#EFF6FF', accent: '#3B82F6' },
  Pink:   { label: 'Tunggu Resi',   fg: '#DB2777', bg: '#FDF4FF', accent: '#EC4899' },
  Hijau:  { label: 'Selesai',       fg: '#15803D', bg: '#F0FDF4', accent: '#22C55E' },
  Teal:   { label: 'Resi Terkirim', fg: '#0F766E', bg: '#F0FDFA', accent: '#14B8A6' },
};

function getColor(c: ClaimPromo): string {
  const mkt = c.validasi_by_mkt ?? '';
  const fa = c.validasi_by_fa ?? '';
  if (!mkt) return 'Putih';
  if (mkt === 'Tidak Valid') return 'Merah';
  if (mkt === 'Hold') return 'Orange';
  if (mkt === 'Valid' && !fa) return 'Biru';
  if (fa === 'Valid' && !c.nomor_resi) return 'Pink';
  if (c.nomor_resi) return 'Hijau';
  return 'Putih';
}

function ChipRow({ filter, onSelect }: { filter: string; onSelect: (k: string) => void }) {
  return (
    <View style={styles.chipRow}>
      {Object.entries(WARNA).map(([key, w]) => (
        <TouchableOpacity
          key={key}
          style={[styles.chip, filter === key && { backgroundColor: w.bg }]}
          onPress={() => onSelect(key)}
        >
          <Text style={[styles.chipText, filter === key && { color: w.fg, fontWeight: '700' }]}>{w.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ClaimCard({ claim, onPress }: { claim: ClaimPromo; onPress: () => void }) {
  const w = WARNA[getColor(claim)] ?? WARNA.Putih;
  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: w.accent, borderLeftWidth: 4 }]}
      onPress={onPress} activeOpacity={0.8}
    >
      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{claim.nama_pendaftar ?? claim.nomor_wa}</Text>
          <Text style={styles.cardSub}>{claim.nomor_wa} · SN: {claim.nomor_seri}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: w.bg }]}>
          <Text style={[styles.badgeText, { color: w.fg }]}>{w.label}</Text>
        </View>
      </View>
      <View style={styles.cardMeta}>
        <Text style={styles.metaText}>📦 {claim.tipe_barang}</Text>
        {claim.jenis_promosi && <Text style={styles.metaText}> · {claim.jenis_promosi}</Text>}
      </View>
    </TouchableOpacity>
  );
}

function ClaimDetailModal({
  claim, onClose, onSendStatus,
}: { claim: ClaimPromo; onClose: () => void; onSendStatus: () => void }) {
  const w = WARNA[getColor(claim)] ?? WARNA.Putih;
  const fields: { k: string; v: string }[] = [
    { k: 'Tipe Barang', v: claim.tipe_barang },
    { k: 'Nomor Seri', v: claim.nomor_seri },
    { k: 'Jenis Promo', v: claim.jenis_promosi ?? '—' },
    { k: 'Nama Toko', v: claim.nama_toko ?? '—' },
    { k: 'Tgl Pembelian', v: claim.tanggal_pembelian },
    { k: 'Validasi MKT', v: claim.validasi_by_mkt ?? '—' },
    { k: 'Validasi FA', v: claim.validasi_by_fa ?? '—' },
    { k: 'Catatan MKT', v: claim.catatan_mkt ?? '—' },
    { k: 'Resi', v: claim.nomor_resi ? `${claim.nama_jasa_pengiriman ?? ''} ${claim.nomor_resi}`.trim() : '—' },
    { k: 'Penerima', v: claim.nama_penerima_claim ?? '—' },
    { k: 'Alamat', v: claim.alamat_pengiriman ?? '—' },
  ];

  return (
    <View style={styles.detail}>
      {/* Back header */}
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.detailName}>{claim.nama_pendaftar ?? claim.nomor_wa}</Text>
          <Text style={styles.detailSub}>{claim.nomor_wa}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: w.bg }]}>
          <Text style={[styles.badgeText, { color: w.fg }]}>{w.label}</Text>
        </View>
      </View>

      <FlatList
        data={fields}
        keyExtractor={item => item.k}
        renderItem={({ item }) => (
          <View style={styles.fieldRow}>
            <Text style={styles.fieldKey}>{item.k}</Text>
            <Text style={styles.fieldVal}>{item.v}</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        ListFooterComponent={
          <View style={{ gap: 10, marginTop: 16 }}>
            <TouchableOpacity style={styles.actionBtn} onPress={onSendStatus}>
              <Text style={styles.actionBtnText}>Kirim Status ke Konsumen</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

export default function ClaimsScreen() {
  const [claims, setClaims] = useState<ClaimPromo[]>([]);
  const [filter, setFilter] = useState('Semua');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<ClaimPromo | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchClaims(1, 'all', '');
      setClaims(res.claims ?? []);
    } catch {
      // keep
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = claims.filter(c => {
    const colorOk = filter === 'Semua' || getColor(c) === filter;
    const q = query.toLowerCase();
    const searchOk = !q ||
      (c.nama_pendaftar ?? '').toLowerCase().includes(q) ||
      c.nomor_wa.includes(q) ||
      c.nomor_seri.includes(q) ||
      (c.tipe_barang ?? '').toLowerCase().includes(q);
    return colorOk && searchOk;
  });

  const handleSendStatus = async () => {
    if (!selected) return;
    const w = WARNA[getColor(selected)] ?? WARNA.Putih;
    const msg = `Halo kak ${selected.nama_pendaftar ?? ''},\n\nUpdate status klaim promo Anda:\n*Status:* ${w.label}\n*Barang:* ${selected.tipe_barang}\n*SN:* ${selected.nomor_seri}${selected.nomor_resi ? `\n*Resi:* ${selected.nama_jasa_pengiriman ?? ''} ${selected.nomor_resi}` : ''}\n\nTerima kasih 🙏`;
    try {
      await sendWAMessage(selected.nomor_wa, msg);
      Alert.alert('Berhasil', 'Status berhasil dikirim ke konsumen.');
    } catch (err: unknown) {
      Alert.alert('Gagal', err instanceof Error ? err.message : 'Coba lagi.');
    }
  };

  if (selected) {
    return <ClaimDetailModal claim={selected} onClose={() => setSelected(null)} onSendStatus={handleSendStatus} />;
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#FFE500" size="large" /></View>;
  }

  return (
    <View style={styles.root}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Cari nama, SN, toko…"
          placeholderTextColor="#9aa0a6"
        />
      </View>
      <ChipRow filter={filter} onSelect={setFilter} />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id_claim ?? String(Math.random())}
        renderItem={({ item }) => <ClaimCard claim={item} onPress={() => setSelected(item)} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#FFE500" />}
        contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
        ListHeaderComponent={
          <Text style={styles.count}>{filtered.length}/{claims.length} klaim</Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>Tidak ada klaim</Text>
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEF0F2' },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: '#F3F4F6' },
  chipText: { fontSize: 11, color: '#5f6368', fontWeight: '600' },
  count: { fontSize: 12, color: '#9aa0a6', marginBottom: 8, fontWeight: '600' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04, elevation: 2,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  cardName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  cardSub: { fontSize: 11, color: '#9aa0a6', marginTop: 2, fontFamily: 'monospace' },
  cardMeta: { flexDirection: 'row' },
  metaText: { fontSize: 12, color: '#5f6368' },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  // Detail
  detail: { flex: 1, backgroundColor: '#F5F7FA' },
  detailHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    backgroundColor: '#1A1A1A', gap: 10,
  },
  backBtn: { padding: 4 },
  backArrow: { color: '#FFE500', fontSize: 22, fontWeight: '700' },
  detailName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  detailSub: { fontSize: 11, color: '#9aa0a6' },
  fieldRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  fieldKey: { fontSize: 13, color: '#9aa0a6', fontWeight: '600' },
  fieldVal: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', textAlign: 'right', maxWidth: '58%' },
  actionBtn: { backgroundColor: '#FFE500', borderRadius: 12, padding: 14, alignItems: 'center' },
  actionBtnText: { fontSize: 15, fontWeight: '800', color: '#1A1A1A' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#9aa0a6', fontWeight: '600' },
});
