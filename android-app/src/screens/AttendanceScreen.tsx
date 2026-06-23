import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, Modal, FlatList, RefreshControl,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { fetchEventRegistrations, submitAttendance, deleteAttendance } from '../api/client';
import { EventRegistration } from '../api/types';
import { useAuth } from '../context/AuthContext';

export default function AttendanceScreen() {
  const { karyawan } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [scannerVisible, setScannerVisible] = useState(false);

  const adminName = karyawan?.nama_karyawan || karyawan?.username || 'Admin';

  const load = useCallback(async () => {
    try {
      const res = await fetchEventRegistrations('all');
      if (res.data) {
        setRegistrations(res.data.filter(r => r.status_pendaftaran === 'terdaftar'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing) return;
    setScanned(true);
    setProcessing(true);

    try {
      const res = await submitAttendance(data, adminName);
      if (res.alreadyAttended) {
        Alert.alert('Info', `${res.registration.nama_lengkap} sudah tercatat hadir.`);
      } else {
        Alert.alert('Berhasil', `Kehadiran ${res.registration.nama_lengkap} telah dikonfirmasi.`);
        load();
      }
    } catch (err: any) {
      Alert.alert('Gagal', err.message || 'Gagal memproses QR');
    } finally {
      setProcessing(false);
      // Wait 2 seconds before allowing next scan
      setTimeout(() => setScanned(false), 2000);
    }
  };

  const handleUndo = (item: EventRegistration) => {
    Alert.alert(
      'Batalkan Kehadiran',
      `Batalkan status hadir untuk ${item.nama_lengkap}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Batalkan',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAttendance(item.id);
              load();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          }
        }
      ]
    );
  };

  if (!permission) {
    return <View style={styles.center}><ActivityIndicator color="#FFE500" /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.noPermissionText}>Aplikasi membutuhkan izin kamera untuk scan QR.</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Berikan Izin</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Scanner Modal */}
      <Modal visible={scannerVisible} animationType="slide">
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          />
          <View style={styles.overlay}>
            <View style={styles.unfocusedContainer} />
            <View style={styles.focusedContainer}>
              <View style={styles.unfocusedContainer} />
              <View style={styles.focusedBox} />
              <View style={styles.unfocusedContainer} />
            </View>
            <View style={styles.unfocusedContainer} />
          </View>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Scan Tiket Peserta</Text>
            {processing && <ActivityIndicator color="#FFE500" />}
          </View>
          <TouchableOpacity style={styles.closeScanner} onPress={() => setScannerVisible(false)}>
            <Text style={styles.closeScannerText}>Tutup</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <View style={styles.header}>
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{registrations.length}</Text>
            <Text style={styles.statLabel}>Terdaftar</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: '#22C55E' }]}>
              {registrations.filter(r => r.is_attended).length}
            </Text>
            <Text style={styles.statLabel}>Hadir</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.scanBtn} onPress={() => setScannerVisible(true)}>
          <Text style={styles.scanBtnText}>📸 MULAI SCAN QR</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={registrations}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.nama_lengkap}</Text>
              <Text style={styles.itemEvent}>{item.event_name}</Text>
              {item.is_attended && (
                <Text style={styles.attendedAt}>
                  ✓ Hadir: {new Date(item.attended_at!).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>
            {item.is_attended ? (
              <TouchableOpacity onPress={() => handleUndo(item)}>
                <Text style={styles.undoText}>Batal</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.markBtn}
                onPress={() => handleBarCodeScanned({ data: item.id })}
                disabled={processing}
              >
                <Text style={styles.markBtnText}>Hadir</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#FFE500" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Tidak ada peserta terdaftar</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  noPermissionText: { textAlign: 'center', color: '#5f6368', marginBottom: 20 },
  permissionBtn: { backgroundColor: '#FFE500', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  permissionBtnText: { fontWeight: '700', color: '#1A1A1A' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  stats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: 24, fontWeight: '900', color: '#1A1A1A' },
  statLabel: { fontSize: 12, color: '#9aa0a6', fontWeight: '600' },
  scanBtn: { backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, alignItems: 'center' },
  scanBtnText: { color: '#FFE500', fontWeight: '800', fontSize: 16 },
  list: { padding: 12 },
  item: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    padding: 16, borderRadius: 12, marginBottom: 8, elevation: 1
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  itemEvent: { fontSize: 12, color: '#9aa0a6', marginTop: 2 },
  attendedAt: { fontSize: 11, color: '#22C55E', fontWeight: '700', marginTop: 4 },
  undoText: { color: '#EF4444', fontWeight: '700', fontSize: 12 },
  markBtn: { backgroundColor: '#F1F3F5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  markBtnText: { fontSize: 12, fontWeight: '700', color: '#495057' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#9aa0a6' },
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  scannerHeader: { position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  scannerTitle: { color: '#fff', fontSize: 18, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  closeScanner: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 30 },
  closeScannerText: { color: '#fff', fontWeight: '800' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  unfocusedContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  focusedContainer: { flex: 1.5, flexDirection: 'row' },
  focusedBox: { flex: 4, borderWidth: 2, borderColor: '#FFE500', backgroundColor: 'transparent' },
});
