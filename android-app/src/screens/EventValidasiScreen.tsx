import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, Alert, Modal, Image, ScrollView,
} from 'react-native';
import { fetchEventRegistrations, validateEventPayment, fetchEvents } from '../api/client';
import { EventRegistration, EventData } from '../api/types';

const STATUS_LABELS: Record<string, string> = {
  menunggu_validasi: 'Menunggu',
  terdaftar: 'Terdaftar',
  ditolak: 'Ditolak',
};

const STATUS_COLORS: Record<string, string> = {
  menunggu_validasi: '#EAB308',
  terdaftar: '#22C55E',
  ditolak: '#EF4444',
};

function driveImgSrc(url?: string | null): string {
  if (!url) return '';
  const m = url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/) || url.match(/\/d\/([a-zA-Z0-9_-]{10,})\//);
  if (m) return `https://altanikindo.com/api/events/image?id=${m[1]}`;
  return url;
}

export default function EventValidasiScreen() {
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterEvent, setFilterEvent] = useState('all');

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedReg, setSelectedReg] = useState<EventRegistration | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [catatanValidasi, setCatatanValidasi] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [regRes, eventRes] = await Promise.all([
        fetchEventRegistrations('all'),
        fetchEvents(),
      ]);
      if (regRes.data) setRegistrations(regRes.data);
      if (eventRes.data) setEvents(eventRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return registrations.filter(r => {
      const matchSearch = (r.nama_lengkap || '').toLowerCase().includes(search.toLowerCase()) ||
                          (r.nomor_wa || '').includes(search);
      const matchEvent = filterEvent === 'all' || r.event_name === filterEvent;
      return matchSearch && matchEvent;
    });
  }, [registrations, search, filterEvent]);

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selectedReg) return;
    setProcessingId(selectedReg.id);
    try {
      await validateEventPayment(
        selectedReg.id,
        action,
        action === 'reject' ? rejectionReason : undefined,
        catatanValidasi || undefined
      );
      Alert.alert('Berhasil', action === 'approve' ? 'Pembayaran disetujui.' : 'Pendaftaran ditolak.');
      setShowApproveModal(false);
      setShowRejectModal(false);
      setRejectionReason('');
      setCatatanValidasi('');
      load();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal memproses');
    } finally {
      setProcessingId(null);
    }
  };

  const renderItem = ({ item }: { item: EventRegistration }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status_pendaftaran] + '20' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status_pendaftaran] }]}>
            {STATUS_LABELS[item.status_pendaftaran]}
          </Text>
        </View>
        <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
      </View>

      <Text style={styles.regName}>{item.nama_lengkap}</Text>
      <Text style={styles.eventName}>{item.event_name}</Text>

      <View style={styles.detailsGrid}>
        <Text style={styles.detailItem}>📱 {item.nomor_wa}</Text>
        {item.kabupaten_kotamadya && <Text style={styles.detailItem}>📍 {item.kabupaten_kotamadya}</Text>}
        {item.tipe_kamera && <Text style={styles.detailItem}>📷 {item.tipe_kamera}</Text>}
      </View>

      <View style={styles.actions}>
        {item.bukti_transfer_url && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setPreviewUrl(driveImgSrc(item.bukti_transfer_url))}
          >
            <Text style={styles.actionBtnText}>🖼️ Bukti</Text>
          </TouchableOpacity>
        )}

        {item.status_pendaftaran === 'menunggu_validasi' && (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={() => { setSelectedReg(item); setShowApproveModal(true); }}
            >
              <Text style={styles.approveBtnText}>✓ Setujui</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => { setSelectedReg(item); setShowRejectModal(true); }}
            >
              <Text style={styles.rejectBtnText}>✕ Tolak</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.filters}>
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nama/WA..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor="#FFE500" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Tidak ada data pendaftaran</Text>
          </View>
        }
      />

      {/* Approve Modal */}
      <Modal visible={showApproveModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Setujui Pembayaran</Text>
            <Text style={styles.modalSub}>Setujui pendaftaran {selectedReg?.nama_lengkap}?</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Catatan internal (opsional)"
              value={catatanValidasi}
              onChangeText={setCatatanValidasi}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowApproveModal(false)}>
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmApproveBtn}
                onPress={() => handleAction('approve')}
                disabled={!!processingId}
              >
                <Text style={styles.confirmApproveText}>{processingId ? '...' : 'Setujui'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Modal */}
      <Modal visible={showRejectModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tolak Pendaftaran</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Alasan penolakan (dikirim ke peserta)"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRejectModal(false)}>
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmRejectBtn}
                onPress={() => handleAction('reject')}
                disabled={!!processingId}
              >
                <Text style={styles.confirmRejectText}>{processingId ? '...' : 'Tolak'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Preview Modal */}
      <Modal visible={!!previewUrl} transparent animationType="slide">
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.closePreview} onPress={() => setPreviewUrl(null)}>
            <Text style={styles.closePreviewText}>✕</Text>
          </TouchableOpacity>
          {previewUrl && (
            <Image
              source={{ uri: previewUrl }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7FA' },
  filters: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  searchInput: { backgroundColor: '#F1F3F5', borderRadius: 8, padding: 10, fontSize: 14 },
  list: { padding: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '800' },
  dateText: { fontSize: 11, color: '#9aa0a6' },
  regName: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  eventName: { fontSize: 13, color: '#5f6368', marginTop: 2 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  detailItem: { fontSize: 11, color: '#adb5bd' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  actionBtn: { flex: 1, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F3F5' },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: '#495057' },
  approveBtn: { backgroundColor: '#22C55E' },
  approveBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  rejectBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#EF4444' },
  rejectBtnText: { fontSize: 12, fontWeight: '800', color: '#EF4444' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#9aa0a6' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  modalSub: { fontSize: 14, color: '#5f6368', marginBottom: 16 },
  modalInput: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 12, alignItems: 'center' },
  cancelBtnText: { color: '#adb5bd', fontWeight: '700' },
  confirmApproveBtn: { flex: 1, backgroundColor: '#22C55E', borderRadius: 8, padding: 12, alignItems: 'center' },
  confirmApproveText: { color: '#fff', fontWeight: '800' },
  confirmRejectBtn: { flex: 1, backgroundColor: '#EF4444', borderRadius: 8, padding: 12, alignItems: 'center' },
  confirmRejectText: { color: '#fff', fontWeight: '800' },
  previewOverlay: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  previewImage: { width: '100%', height: '80%' },
  closePreview: { position: 'absolute', top: 40, right: 20, zIndex: 10, width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  closePreviewText: { color: '#fff', fontSize: 20 },
});
