import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { fetchExpenseClaims } from '../api/client';
import type { ExpenseClaim } from '../api/types';
import { useAuth } from '../context/AuthContext';

const STATUS_MAP: Record<string, { label: string; fg: string; bg: string }> = {
  draft:     { label: 'Draft',     fg: '#5f6368', bg: '#F3F4F6' },
  submitted: { label: 'Diajukan', fg: '#2563EB', bg: '#EFF6FF' },
  approved:  { label: 'Disetujui', fg: '#15803D', bg: '#F0FDF4' },
  rejected:  { label: 'Ditolak',  fg: '#DC2626', bg: '#FEF2F2' },
};

function ClaimCard({ item, onPress }: { item: ExpenseClaim; onPress: () => void }) {
  const s = STATUS_MAP[item.status] ?? STATUS_MAP.draft;
  const date = new Date(item.claim_date).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.from_person} → {item.to_person}</Text>
          <Text style={styles.cardSub}>{item.nama_pembuat} · {date}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: s.bg }]}>
          <Text style={[styles.badgeText, { color: s.fg }]}>{s.label}</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.total}>Rp {item.total_nominal.toLocaleString('id-ID')}</Text>
        <Text style={styles.itemCount}>{item.items.length} item</Text>
      </View>
      {item.catatan && (
        <Text style={styles.catatan} numberOfLines={1}>📝 {item.catatan}</Text>
      )}
    </TouchableOpacity>
  );
}

function ClaimDetail({ claim, onClose }: { claim: ExpenseClaim; onClose: () => void }) {
  const s = STATUS_MAP[claim.status] ?? STATUS_MAP.draft;
  return (
    <View style={styles.detail}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.detailTitle}>{claim.from_person} → {claim.to_person}</Text>
          <Text style={styles.detailSub}>{claim.nama_pembuat}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: s.bg }]}>
          <Text style={[styles.badgeText, { color: s.fg }]}>{s.label}</Text>
        </View>
      </View>
      <FlatList
        data={claim.items}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item: it, index }) => (
          <View style={styles.itemRow}>
            <Text style={styles.itemNum}>{index + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemDesc}>{it.description}</Text>
              <Text style={styles.itemDate}>{it.tanggal}</Text>
            </View>
            <Text style={styles.itemNominal}>Rp {it.nominal.toLocaleString('id-ID')}</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListHeaderComponent={
          <View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tanggal Klaim</Text>
              <Text style={styles.summaryVal}>{claim.claim_date}</Text>
            </View>
            {claim.catatan ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Catatan</Text>
                <Text style={styles.summaryVal}>{claim.catatan}</Text>
              </View>
            ) : null}
            <Text style={[styles.itemDesc, { fontWeight: '700', marginBottom: 8, marginTop: 12 }]}>Rincian Biaya</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalVal}>Rp {claim.total_nominal.toLocaleString('id-ID')}</Text>
          </View>
        }
      />
    </View>
  );
}

export default function ExpenseClaimsScreen() {
  const { karyawan } = useAuth();
  const [data, setData] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<ExpenseClaim | null>(null);

  const isAdmin = karyawan?.role === 'admin' || karyawan?.role === 'Finance';

  const load = useCallback(async () => {
    try {
      const res = await fetchExpenseClaims(isAdmin ? undefined : karyawan?.username);
      setData(res.data ?? []);
    } catch {
      // keep
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [karyawan, isAdmin]);

  useEffect(() => { load(); }, [load]);

  if (selected) return <ClaimDetail claim={selected} onClose={() => setSelected(null)} />;

  if (loading) return <View style={styles.center}><ActivityIndicator color="#FFE500" size="large" /></View>;

  return (
    <View style={styles.root}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id ?? String(Math.random())}
        renderItem={({ item }) => <ClaimCard item={item} onPress={() => setSelected(item)} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#FFE500" />}
        contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💰</Text>
            <Text style={styles.emptyText}>Belum ada klaim biaya</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04, elevation: 2,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  cardSub: { fontSize: 11, color: '#9aa0a6', marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  total: { fontSize: 15, fontWeight: '800', color: '#1A1A1A' },
  itemCount: { fontSize: 12, color: '#9aa0a6' },
  catatan: { fontSize: 12, color: '#5f6368', marginTop: 6 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  detail: { flex: 1, backgroundColor: '#F5F7FA' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#1A1A1A', gap: 10 },
  backBtn: { padding: 4 },
  backArrow: { color: '#FFE500', fontSize: 22, fontWeight: '700' },
  detailTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
  detailSub: { fontSize: 11, color: '#9aa0a6' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  summaryLabel: { fontSize: 13, color: '#9aa0a6', fontWeight: '600' },
  summaryVal: { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  itemNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFE500', textAlign: 'center', lineHeight: 24, fontSize: 12, fontWeight: '800', color: '#1A1A1A' },
  itemDesc: { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  itemDate: { fontSize: 11, color: '#9aa0a6', marginTop: 2 },
  itemNominal: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 14, borderTopWidth: 2, borderTopColor: '#1A1A1A', marginTop: 4 },
  totalLabel: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  totalVal: { fontSize: 16, fontWeight: '900', color: '#1A1A1A' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#9aa0a6', fontWeight: '600' },
});
