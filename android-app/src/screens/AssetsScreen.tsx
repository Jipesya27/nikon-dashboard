import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import { fetchAssets } from '../api/client';
import { BarangAset } from '../api/types';

export default function AssetsScreen() {
  const [assets, setAssets] = useState<BarangAset[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchAssets();
      if (res.data) setAssets(res.data);
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
    return assets.filter(a =>
      (a.nama_barang_aset || '').toLowerCase().includes(q) ||
      (a.no_seri_aset || '').toLowerCase().includes(q)
    );
  }, [assets, query]);

  const renderItem = ({ item }: { item: BarangAset }) => (
    <View style={styles.card}>
      <Text style={styles.assetName}>{item.nama_barang_aset}</Text>
      <Text style={styles.serial}>SN: {item.no_seri_aset || '—'}</Text>

      <View style={styles.accsRow}>
        {[item.accs1, item.accs2, item.accs3, item.accs4, item.accs5, item.accs6, item.accs7]
          .filter(Boolean).map((acc, i) => (
            <View key={i} style={styles.accBadge}>
              <Text style={styles.accText}>{acc}</Text>
            </View>
          ))}
      </View>

      {item.catatan && (
        <View style={styles.catatanBox}>
          <Text style={styles.catatanText}>📝 {item.catatan}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Cari barang atau no seri..."
          value={query}
          onChangeText={setQuery}
          placeholderTextColor="#9aa0a6"
        />
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator color="#FFE500" style={{ marginTop: 40 }} size="large" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id || String(Math.random())}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor="#FFE500" />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Tidak ada barang aset ditemukan</Text>
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
  list: { padding: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 1 },
  assetName: { fontSize: 15, fontWeight: '800', color: '#1A1A1A' },
  serial: { fontSize: 12, color: '#9aa0a6', marginTop: 4, fontFamily: 'monospace', fontWeight: '600' },
  accsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  accBadge: { backgroundColor: '#F1F3F5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  accText: { fontSize: 10, fontWeight: '700', color: '#5f6368' },
  catatanBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  catatanText: { fontSize: 12, color: '#495057', fontStyle: 'italic' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#9aa0a6', fontWeight: '600' },
});
