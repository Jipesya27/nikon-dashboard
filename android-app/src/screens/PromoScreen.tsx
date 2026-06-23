import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import { fetchPromos } from '../api/client';
import { Promosi } from '../api/types';

function fmtDate(d?: string | null) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return d; }
}

export default function PromoScreen() {
  const [promos, setPromos] = useState<Promosi[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'Semua' | 'Aktif' | 'Nonaktif'>('Semua');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchPromos();
      if (res.data) setPromos(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return promos.filter(p => {
      const statusOk = filter === 'Semua' || (filter === 'Aktif' ? p.status_aktif : !p.status_aktif);
      const searchOk = !q || (p.nama_promo || '').toLowerCase().includes(q) ||
        (p.tipe_produk || []).some(tp => (tp.nama_produk || '').toLowerCase().includes(q));
      return statusOk && searchOk;
    });
  }, [promos, filter, query]);

  const renderItem = ({ item }: { item: Promosi }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.promoName}>{item.nama_promo}</Text>
        <View style={[styles.statusBadge, { backgroundColor: item.status_aktif ? '#DCFCE7' : '#F1F3F4' }]}>
          <Text style={[styles.statusText, { color: item.status_aktif ? '#16A34A' : '#9aa0a6' }]}>
            {item.status_aktif ? 'AKTIF' : 'NONAKTIF'}
          </Text>
        </View>
      </View>

      <Text style={styles.dateRange}>
        📅 {fmtDate(item.tanggal_mulai)} s/d {fmtDate(item.tanggal_selesai)}
      </Text>

      <Text style={styles.sectionTitle}>Tipe Produk ({item.tipe_produk?.length || 0})</Text>
      <View style={styles.productList}>
        {(item.tipe_produk || []).map((tp, i) => (
          <View key={i} style={styles.productItem}>
            <View style={styles.dot} />
            <Text style={styles.productName}>{tp.nama_produk}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nama promo atau produk..."
          value={query}
          onChangeText={setQuery}
          placeholderTextColor="#9aa0a6"
        />
      </View>

      <View style={styles.chips}>
        {['Semua', 'Aktif', 'Nonaktif'].map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f as any)}
            style={[styles.chip, filter === f && styles.activeChip]}
          >
            <Text style={[styles.chipText, filter === f && styles.activeChipText]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator color="#FFE500" style={{ marginTop: 40 }} size="large" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id_promo || String(Math.random())}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor="#FFE500" />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Tidak ada promo ditemukan</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7FA' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', margin: 12, paddingHorizontal: 12,
    borderRadius: 12, height: 48, elevation: 2,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1A1A' },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginBottom: 12 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', elevation: 1 },
  activeChip: { backgroundColor: '#FFE500' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#5f6368' },
  activeChipText: { color: '#1A1A1A' },
  list: { padding: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  promoName: { flex: 1, fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '800' },
  dateRange: { fontSize: 13, color: '#5f6368', marginTop: 8, fontWeight: '600' },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#adb5bd', marginTop: 16, marginBottom: 8, textTransform: 'uppercase' },
  productList: { gap: 6 },
  productItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', padding: 8, borderRadius: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3B82F6', marginRight: 10 },
  productName: { fontSize: 13, color: '#1A1A1A', fontWeight: '500' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#9aa0a6', fontWeight: '600' },
});
