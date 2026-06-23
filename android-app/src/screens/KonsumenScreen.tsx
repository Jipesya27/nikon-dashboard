import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import { fetchKonsumen } from '../api/client';
import { KonsumenData } from '../api/types';

const AVATAR_COLORS = ['#1D4ED8', '#7C3AED', '#0F766E', '#EA580C', '#BE185D', '#15803D'];

function initials(name: string) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function KonsumenScreen() {
  const [consumers, setConsumers] = useState<KonsumenData[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchKonsumen();
      if (res.data) {
        setConsumers(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch consumers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return consumers.filter(k =>
      (k.nama_lengkap || '').toLowerCase().includes(q) ||
      (k.nomor_wa || '').includes(q) ||
      (k.provinsi || '').toLowerCase().includes(q)
    );
  }, [consumers, query]);

  const renderItem = ({ item, index }: { item: KonsumenData, index: number }) => {
    const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
    return (
      <TouchableOpacity style={styles.item} activeOpacity={0.7}>
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <Text style={styles.avatarText}>{initials(item.nama_lengkap || '')}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.nama_lengkap || 'Tanpa Nama'}</Text>
          <Text style={styles.wa}>{item.nomor_wa}</Text>
          {(item.kabupaten_kotamadya || item.provinsi) && (
            <Text style={styles.location}>
              {item.kabupaten_kotamadya}{item.kabupaten_kotamadya && item.provinsi ? ', ' : ''}{item.provinsi}
            </Text>
          )}
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nama atau nomor WA..."
          value={query}
          onChangeText={setQuery}
          placeholderTextColor="#9aa0a6"
        />
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color="#FFE500" size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id_konsumen}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFE500" />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>Tidak ada konsumen ditemukan</Text>
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
    borderRadius: 12, height: 48,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1A1A' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 4, elevation: 1,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  wa: { fontSize: 12, color: '#9aa0a6', marginTop: 2, fontFamily: 'monospace' },
  location: { fontSize: 11, color: '#adb5bd', marginTop: 2 },
  chevron: { fontSize: 20, color: '#d0d4d8' },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 14, color: '#9aa0a6', fontWeight: '600' },
});
