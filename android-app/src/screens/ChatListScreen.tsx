import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fetchChatContacts } from '../api/client';
import type { KonsumenData } from '../api/types';
import type { ChatStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<ChatStackParamList, 'ChatList'>;

function ContactItem({ item, onPress }: { item: KonsumenData; onPress: () => void }) {
  const initials = (item.nama_lengkap || item.nomor_wa).substring(0, 2).toUpperCase();
  return (
    <TouchableOpacity style={styles.contactItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.contactName} numberOfLines={1}>{item.nama_lengkap || 'Tanpa Nama'}</Text>
        <Text style={styles.contactWa}>{item.nomor_wa}</Text>
      </View>
      <View style={styles.statusDot} />
    </TouchableOpacity>
  );
}

export default function ChatListScreen() {
  const navigation = useNavigation<Nav>();
  const [contacts, setContacts] = useState<KonsumenData[]>([]);
  const [filtered, setFiltered] = useState<KonsumenData[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchChatContacts();
      const data = res.data ?? [];
      setContacts(data);
      setFiltered(data);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const q = query.toLowerCase();
    if (!q) { setFiltered(contacts); return; }
    setFiltered(contacts.filter(c =>
      (c.nama_lengkap || '').toLowerCase().includes(q) || c.nomor_wa.includes(q),
    ));
  }, [query, contacts]);

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
          placeholder="Cari nama atau nomor WA…"
          placeholderTextColor="#9aa0a6"
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.nomor_wa}
        renderItem={({ item }) => (
          <ContactItem
            item={item}
            onPress={() => navigation.navigate('ChatDetail', { nomorWa: item.nomor_wa, nama: item.nama_lengkap || item.nomor_wa })}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#FFE500" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>Belum ada konsumen</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  searchRow: { padding: 12, backgroundColor: '#F5F7FA', borderBottomWidth: 1, borderBottomColor: '#EEF0F2' },
  searchInput: {
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#1A1A1A', borderWidth: 1, borderColor: '#E8EAED',
  },
  contactItem: {
    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, backgroundColor: '#fff',
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFE500',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  contactName: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  contactWa: { fontSize: 12, color: '#9aa0a6', marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  separator: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 72 },
  empty: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#9aa0a6', fontWeight: '600' },
});
