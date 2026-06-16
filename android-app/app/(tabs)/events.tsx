import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Modal, TextInput,
  ScrollView, Image,
} from 'react-native';
import api, { sbRead } from '@/lib/api';
import { EventRegistration } from '@/lib/types';
import { NIKON_YELLOW, NIKON_BLACK } from '@/constants/config';
import { API_BASE_URL } from '@/constants/config';

export default function EventsScreen() {
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<EventRegistration | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'menunggu' | 'semua'>('menunggu');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const filters = activeTab === 'menunggu'
        ? [{ col: 'status_pendaftaran', op: 'eq' as const, val: 'menunggu_validasi' }]
        : [];
      const data = await sbRead<EventRegistration>({
        table: 'event_registrations',
        select: '*',
        filters,
        order: { col: 'created_at', ascending: false },
        limit: 50,
      });
      setRegistrations(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [activeTab]);

  function onRefresh() {
    setRefreshing(true);
    loadData().finally(() => setRefreshing(false));
  }

  async function handleApprove() {
    if (!selected) return;
    setProcessing(true);
    try {
      const res = await api.post('/api/events/validate-payment', {
        registrationId: selected.id,
        action: 'approve',
      });
      if (res.data.success) {
        Alert.alert('Berhasil', `${selected.nama_lengkap} telah disetujui. Tiket dikirim via WhatsApp.`);
        setModalVisible(false);
        loadData();
      } else {
        Alert.alert('Gagal', res.data.error || 'Terjadi kesalahan');
      }
    } catch {
      Alert.alert('Error', 'Gagal memproses. Coba lagi.');
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject() {
    if (!selected) return;
    if (!rejectReason.trim()) {
      Alert.alert('Error', 'Alasan penolakan wajib diisi');
      return;
    }
    setProcessing(true);
    try {
      const res = await api.post('/api/events/validate-payment', {
        registrationId: selected.id,
        action: 'reject',
        rejectionReason: rejectReason.trim(),
      });
      if (res.data.success) {
        Alert.alert('Ditolak', `Pendaftaran ${selected.nama_lengkap} telah ditolak.`);
        setModalVisible(false);
        setRejectReason('');
        setRejecting(false);
        loadData();
      } else {
        Alert.alert('Gagal', res.data.error || 'Terjadi kesalahan');
      }
    } catch {
      Alert.alert('Error', 'Gagal memproses. Coba lagi.');
    } finally {
      setProcessing(false);
    }
  }

  function openDetail(reg: EventRegistration) {
    setSelected(reg);
    setRejecting(false);
    setRejectReason('');
    setModalVisible(true);
  }

  function statusColor(s?: string) {
    if (s === 'terdaftar') return '#10b981';
    if (s === 'ditolak') return '#ef4444';
    return '#f59e0b';
  }

  function statusLabel(s?: string) {
    if (s === 'terdaftar') return 'Terdaftar';
    if (s === 'ditolak') return 'Ditolak';
    return 'Menunggu Validasi';
  }

  function proxyBukti(url?: string | null): string | null {
    if (!url) return null;
    const match = url.match(/(?:id=|\/d\/)([a-zA-Z0-9_-]+)/);
    if (match) return `${API_BASE_URL}/api/drive-file?id=${match[1]}`;
    return url;
  }

  function renderItem({ item }: { item: EventRegistration }) {
    return (
      <TouchableOpacity style={styles.card} onPress={() => openDetail(item)}>
        <View style={styles.cardTop}>
          <Text style={styles.cardName} numberOfLines={1}>{item.nama_lengkap || '-'}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor(item.status_pendaftaran) + '22' }]}>
            <Text style={[styles.badgeText, { color: statusColor(item.status_pendaftaran) }]}>
              {statusLabel(item.status_pendaftaran)}
            </Text>
          </View>
        </View>
        <Text style={styles.cardEvent} numberOfLines={1}>{item.event_name}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardMetaText}>📱 {item.nomor_wa || '-'}</Text>
          <Text style={styles.cardMetaText}>💳 {item.payment_type === 'deposit' ? 'Deposit' : item.payment_type === 'gratis' ? 'Gratis' : 'Regular'}</Text>
        </View>
        {item.bukti_transfer_url && (
          <Text style={styles.cardHasBukti}>📎 Ada bukti transfer</Text>
        )}
      </TouchableOpacity>
    );
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={NIKON_BLACK} /></View>;
  }

  return (
    <View style={styles.root}>
      <View style={styles.tabBar}>
        {(['menunggu', 'semua'] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.tabBtn, activeTab === t && styles.tabBtnActive]} onPress={() => setActiveTab(t)}>
            <Text style={[styles.tabBtnText, activeTab === t && styles.tabBtnTextActive]}>
              {t === 'menunggu' ? 'Menunggu Validasi' : 'Semua Registrasi'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={registrations}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={<Text style={styles.empty}>Tidak ada data</Text>}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Detail Pendaftaran</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              {selected && (
                <>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalEventName}>{selected.event_name}</Text>
                    <View style={[styles.badge, { backgroundColor: statusColor(selected.status_pendaftaran) + '22', alignSelf: 'flex-start', marginTop: 6 }]}>
                      <Text style={[styles.badgeText, { color: statusColor(selected.status_pendaftaran) }]}>{statusLabel(selected.status_pendaftaran)}</Text>
                    </View>
                  </View>

                  <View style={styles.modalField}>
                    <Text style={styles.modalFieldLabel}>Nama Lengkap</Text>
                    <Text style={styles.modalFieldValue}>{selected.nama_lengkap || '-'}</Text>
                  </View>
                  <View style={styles.modalField}>
                    <Text style={styles.modalFieldLabel}>WhatsApp</Text>
                    <Text style={styles.modalFieldValue}>{selected.nomor_wa || '-'}</Text>
                  </View>
                  <View style={styles.modalField}>
                    <Text style={styles.modalFieldLabel}>Email</Text>
                    <Text style={styles.modalFieldValue}>{selected.email || '-'}</Text>
                  </View>
                  <View style={styles.modalField}>
                    <Text style={styles.modalFieldLabel}>Tipe Kamera</Text>
                    <Text style={styles.modalFieldValue}>{selected.tipe_kamera || '-'}</Text>
                  </View>
                  <View style={styles.modalField}>
                    <Text style={styles.modalFieldLabel}>Kota</Text>
                    <Text style={styles.modalFieldValue}>{selected.kabupaten_kotamadya || '-'}</Text>
                  </View>
                  <View style={styles.modalField}>
                    <Text style={styles.modalFieldLabel}>Tipe Pembayaran</Text>
                    <Text style={styles.modalFieldValue}>{selected.payment_type === 'deposit' ? 'Deposit' : selected.payment_type === 'gratis' ? 'Gratis' : 'Regular'}</Text>
                  </View>

                  {selected.bukti_transfer_url && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalFieldLabel}>Bukti Transfer</Text>
                      <Image
                        source={{ uri: proxyBukti(selected.bukti_transfer_url) || '' }}
                        style={styles.buktiImg}
                        resizeMode="contain"
                      />
                    </View>
                  )}

                  {selected.status_pendaftaran === 'menunggu_validasi' && !rejecting && (
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.rejectBtn]}
                        onPress={() => setRejecting(true)}
                        disabled={processing}
                      >
                        <Text style={styles.rejectBtnText}>Tolak</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.approveBtn]}
                        onPress={handleApprove}
                        disabled={processing}
                      >
                        {processing ? <ActivityIndicator color="#fff" /> : <Text style={styles.approveBtnText}>Setujui</Text>}
                      </TouchableOpacity>
                    </View>
                  )}

                  {rejecting && (
                    <View>
                      <Text style={styles.rejectLabel}>Alasan Penolakan:</Text>
                      <TextInput
                        style={styles.rejectInput}
                        value={rejectReason}
                        onChangeText={setRejectReason}
                        placeholder="Masukkan alasan penolakan..."
                        placeholderTextColor="#aaa"
                        multiline
                      />
                      <View style={styles.actionRow}>
                        <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => setRejecting(false)}>
                          <Text style={styles.rejectBtnText}>Batal</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, styles.approveBtn, { backgroundColor: '#ef4444' }]} onPress={handleReject} disabled={processing}>
                          {processing ? <ActivityIndicator color="#fff" /> : <Text style={styles.approveBtnText}>Konfirmasi Tolak</Text>}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  tabBtn: { flex: 1, padding: 12, alignItems: 'center', borderBottomWidth: 2, borderColor: 'transparent' },
  tabBtnActive: { borderColor: NIKON_BLACK },
  tabBtnText: { fontSize: 13, color: '#888', fontWeight: '600' },
  tabBtnTextActive: { color: NIKON_BLACK },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardName: { fontWeight: '700', fontSize: 15, color: NIKON_BLACK, flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  cardEvent: { fontSize: 13, color: '#555', marginBottom: 8 },
  cardMeta: { flexDirection: 'row', gap: 12 },
  cardMetaText: { fontSize: 12, color: '#888' },
  cardHasBukti: { fontSize: 12, color: '#6366f1', marginTop: 6 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 60, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontWeight: '800', fontSize: 17, color: NIKON_BLACK },
  modalClose: { fontSize: 20, color: '#888' },
  modalSection: { marginBottom: 12 },
  modalEventName: { fontWeight: '700', fontSize: 16, color: NIKON_BLACK },
  modalField: { marginBottom: 10 },
  modalFieldLabel: { fontSize: 11, color: '#888', fontWeight: '600', marginBottom: 2, textTransform: 'uppercase' },
  modalFieldValue: { fontSize: 14, color: NIKON_BLACK, fontWeight: '500' },
  buktiImg: { width: '100%', height: 200, borderRadius: 8, marginTop: 8, backgroundColor: '#f0f0f0' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  rejectBtn: { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#ef4444' },
  rejectBtnText: { fontWeight: '700', color: '#ef4444' },
  approveBtn: { backgroundColor: '#10b981' },
  approveBtnText: { fontWeight: '700', color: '#fff' },
  rejectLabel: { fontWeight: '600', fontSize: 13, color: '#444', marginTop: 12, marginBottom: 6 },
  rejectInput: { borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 10, padding: 10, fontSize: 14, color: NIKON_BLACK, minHeight: 80, textAlignVertical: 'top' },
});
