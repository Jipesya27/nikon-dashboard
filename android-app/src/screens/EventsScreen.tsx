import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fetchEvents } from '../api/client';
import type { EventDataExtended } from '../api/types';
import type { EventsStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<EventsStackParamList, 'EventsList'>;

const STATUS_COLOR: Record<string, string> = {
  'In stock': '#22C55E',
  'Out of stock': '#EF4444',
  'close': '#9aa0a6',
};

function EventCard({ event, onPress }: { event: EventDataExtended; onPress: () => void }) {
  const statusColor = STATUS_COLOR[event.event_status ?? ''] ?? '#9aa0a6';
  const price = event.event_payment_tipe === 'gratis'
    ? 'Gratis'
    : event.event_price
      ? `Rp ${Number(event.event_price).toLocaleString('id-ID')}`
      : '—';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>{event.event_title ?? '—'}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{event.event_status ?? 'N/A'}</Text>
        </View>
      </View>
      <View style={styles.cardMeta}>
        <Text style={styles.metaItem}>📅 {event.event_date ?? '—'}</Text>
        {event.event_time && <Text style={styles.metaItem}>⏰ {event.event_time}</Text>}
        {event.event_location && <Text style={styles.metaItem}>📍 {event.event_location}</Text>}
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.price}>{price}</Text>
        <Text style={styles.stock}>
          {event.event_partisipant_stock != null ? `${event.event_partisipant_stock} kursi` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function EventsScreen() {
  const navigation = useNavigation<Nav>();
  const [events, setEvents] = useState<EventDataExtended[]>([]);
  const [filtered, setFiltered] = useState<EventDataExtended[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchEvents();
      const data = res.data ?? [];
      setEvents(data);
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
    if (!q) { setFiltered(events); return; }
    setFiltered(events.filter(e =>
      (e.event_title ?? '').toLowerCase().includes(q) ||
      (e.event_location ?? '').toLowerCase().includes(q),
    ));
  }, [query, events]);

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
          placeholder="Cari event…"
          placeholderTextColor="#9aa0a6"
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id ?? String(Math.random())}
        renderItem={({ item }) => (
          <EventCard
            event={item}
            onPress={() => item.id && navigation.navigate('EventDetail', { eventId: item.id, title: item.event_title ?? 'Event' })}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#FFE500" />}
        contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>Tidak ada event</Text>
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
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '700' },
  cardMeta: { gap: 4, marginBottom: 12 },
  metaItem: { fontSize: 13, color: '#5f6368' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10 },
  price: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  stock: { fontSize: 13, color: '#9aa0a6' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#9aa0a6', fontWeight: '600' },
});
