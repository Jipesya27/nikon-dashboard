import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, TextInput, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { sbRead } from '@/lib/api';
import { RiwayatPesan } from '@/lib/types';
import { NIKON_BLACK } from '@/constants/config';

interface ContactItem {
  nomor_wa: string;
  nama: string;
  lastMessage: string;
  lastTime: string;
}

export default function MessagesScreen() {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [filtered, setFiltered] = useState<ContactItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadContacts() {
    try {
      // Get latest message per contact
      const msgs = await sbRead<RiwayatPesan>({
        table: 'riwayat_pesan',
        select: 'nomor_wa, nama_profil_wa, isi_pesan, waktu_pesan, arah_pesan',
        order: { col: 'waktu_pesan', ascending: false },
        limit: 200,
      });

      // Deduplicate by nomor_wa, keep latest
      const seen = new Map<string, ContactItem>();
      for (const m of msgs) {
        if (!seen.has(m.nomor_wa)) {
          seen.set(m.nomor_wa, {
            nomor_wa: m.nomor_wa,
            nama: m.nama_profil_wa || m.nomor_wa,
            lastMessage: m.isi_pesan?.slice(0, 60) || '',
            lastTime: m.waktu_pesan,
          });
        }
      }
      const list = Array.from(seen.values());
      setContacts(list);
      setFiltered(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadContacts(); }, []);

  useEffect(() => {
    if (!search) {
      setFiltered(contacts);
    } else {
      const q = search.toLowerCase();
      setFiltered(contacts.filter(c => c.nama.toLowerCase().includes(q) || c.nomor_wa.includes(q)));
    }
  }, [search, contacts]);

  function onRefresh() {
    setRefreshing(true);
    loadContacts().finally(() => setRefreshing(false));
  }

  function formatTime(iso: string) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
    if (diffDays === 1) return 'Kemarin';
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', timeZone: 'Asia/Jakarta' });
  }

  function renderItem({ item }: { item: ContactItem }) {
    const initials = item.nama.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => router.push({ pathname: '/(tabs)/thread', params: { wa: item.nomor_wa, nama: item.nama } })}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials || '?'}</Text>
        </View>
        <View style={styles.itemInfo}>
          <View style={styles.itemTop}>
            <Text style={styles.itemName} numberOfLines={1}>{item.nama}</Text>
            <Text style={styles.itemTime}>{formatTime(item.lastTime)}</Text>
          </View>
          <Text style={styles.itemLast} numberOfLines={1}>{item.lastMessage}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={NIKON_BLACK} /></View>;
  }

  return (
    <View style={styles.root}>
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Cari nama atau nomor..."
          placeholderTextColor="#aaa"
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.nomor_wa}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>Belum ada pesan</Text>}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchWrap: { padding: 12, backgroundColor: '#f8f8f8', borderBottomWidth: 1, borderColor: '#eee' },
  search: { backgroundColor: '#fff', borderRadius: 10, padding: 10, fontSize: 14, borderWidth: 1, borderColor: '#e0e0e0', color: NIKON_BLACK },
  item: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#fff' },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFE500', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontWeight: '800', fontSize: 16, color: '#111' },
  itemInfo: { flex: 1 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  itemName: { fontWeight: '700', fontSize: 15, color: '#111', flex: 1 },
  itemTime: { fontSize: 12, color: '#999', marginLeft: 8 },
  itemLast: { fontSize: 13, color: '#777' },
  sep: { height: 1, backgroundColor: '#f0f0f0', marginLeft: 72 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 60, fontSize: 15 },
});
