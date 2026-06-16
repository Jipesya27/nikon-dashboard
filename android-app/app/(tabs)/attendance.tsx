import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import api from '@/lib/api';
import { getSession } from '@/lib/auth';
import { EventRegistration } from '@/lib/types';
import { NIKON_YELLOW, NIKON_BLACK } from '@/constants/config';

type ScanResult = {
  registration: EventRegistration;
  message?: string;
  alreadyAttended?: boolean;
  success?: boolean;
};

export default function AttendanceScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [karyawanNama, setKaryawanNama] = useState('Admin');
  const lastScan = useRef<string>('');
  const cooldown = useRef(false);

  useEffect(() => {
    getSession().then(s => { if (s?.karyawan) setKaryawanNama(s.karyawan.nama_karyawan); });
  }, []);

  async function handleQrScan({ data }: { data: string }) {
    if (cooldown.current || data === lastScan.current) return;
    cooldown.current = true;
    lastScan.current = data;
    setProcessing(true);
    setScanning(false);

    try {
      // Step 1: Lookup
      const lookupRes = await api.get<{ success: boolean; registration: EventRegistration }>(
        `/api/events/attendance?qr=${encodeURIComponent(data)}`
      );
      if (!lookupRes.data.success || !lookupRes.data.registration) {
        Alert.alert('QR Tidak Valid', 'Peserta tidak ditemukan.', [{ text: 'Scan Ulang', onPress: resetScan }]);
        setProcessing(false);
        return;
      }

      const reg = lookupRes.data.registration;
      setResult({ registration: reg });

      // Step 2: Mark attended
      const markRes = await api.post<{ success: boolean; alreadyAttended?: boolean; message?: string }>(
        '/api/events/attendance',
        {
          qr: data,
          attendedBy: karyawanNama,
          sendWa: true,
        }
      );

      setResult({
        registration: reg,
        success: markRes.data.success,
        alreadyAttended: markRes.data.alreadyAttended,
        message: markRes.data.message,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error tidak diketahui';
      Alert.alert('Error', msg, [{ text: 'Coba Lagi', onPress: resetScan }]);
    } finally {
      setProcessing(false);
      // Allow re-scan after 3s
      setTimeout(() => { cooldown.current = false; }, 3000);
    }
  }

  function resetScan() {
    setResult(null);
    lastScan.current = '';
    cooldown.current = false;
    setScanning(true);
  }

  if (!permission) {
    return <View style={styles.center}><ActivityIndicator size="large" color={NIKON_BLACK} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Izin kamera diperlukan untuk scan QR</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Izinkan Kamera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {!scanning && !result && !processing && (
        <View style={styles.startWrap}>
          <Text style={styles.startTitle}>Scan QR Absensi</Text>
          <Text style={styles.startDesc}>Tekan tombol di bawah untuk mulai scan QR tiket peserta event</Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => setScanning(true)}>
            <Text style={styles.startBtnText}>📷 Mulai Scan</Text>
          </TouchableOpacity>
        </View>
      )}

      {scanning && (
        <View style={styles.cameraWrap}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={processing ? undefined : handleQrScan}
          >
            <View style={styles.overlay}>
              <View style={styles.scanBox}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
              <Text style={styles.scanHint}>Arahkan kamera ke QR code tiket peserta</Text>
            </View>
          </CameraView>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => { setScanning(false); lastScan.current = ''; }}>
            <Text style={styles.cancelBtnText}>Batal</Text>
          </TouchableOpacity>
        </View>
      )}

      {processing && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={NIKON_BLACK} />
          <Text style={styles.processingText}>Memproses...</Text>
        </View>
      )}

      {result && !processing && (
        <ScrollView contentContainerStyle={styles.resultWrap}>
          <View style={[
            styles.resultCard,
            result.alreadyAttended ? styles.resultWarning : result.success ? styles.resultSuccess : styles.resultError
          ]}>
            <Text style={styles.resultIcon}>
              {result.alreadyAttended ? '⚠️' : result.success ? '✅' : '❌'}
            </Text>
            <Text style={styles.resultTitle}>
              {result.alreadyAttended ? 'Sudah Hadir Sebelumnya' : result.success ? 'Berhasil Dicatat Hadir' : 'Gagal'}
            </Text>
            {result.message && <Text style={styles.resultMsg}>{result.message}</Text>}
          </View>

          {result.registration && (
            <View style={styles.regCard}>
              <Text style={styles.regEventName}>{result.registration.event_name}</Text>
              <View style={styles.regField}>
                <Text style={styles.regLabel}>Nama</Text>
                <Text style={styles.regValue}>{result.registration.nama_lengkap || '-'}</Text>
              </View>
              <View style={styles.regField}>
                <Text style={styles.regLabel}>WhatsApp</Text>
                <Text style={styles.regValue}>{result.registration.nomor_wa || '-'}</Text>
              </View>
              <View style={styles.regField}>
                <Text style={styles.regLabel}>Kamera</Text>
                <Text style={styles.regValue}>{result.registration.tipe_kamera || '-'}</Text>
              </View>
              <View style={styles.regField}>
                <Text style={styles.regLabel}>Kota</Text>
                <Text style={styles.regValue}>{result.registration.kabupaten_kotamadya || '-'}</Text>
              </View>
              <View style={styles.regField}>
                <Text style={styles.regLabel}>Status</Text>
                <Text style={[
                  styles.regValue,
                  { color: result.registration.status_pendaftaran === 'terdaftar' ? '#10b981' : '#ef4444' }
                ]}>
                  {result.registration.status_pendaftaran === 'terdaftar' ? 'Terdaftar' : result.registration.status_pendaftaran || '-'}
                </Text>
              </View>
              {result.registration.is_attended && result.registration.attended_at && (
                <View style={styles.regField}>
                  <Text style={styles.regLabel}>Hadir Pada</Text>
                  <Text style={styles.regValue}>
                    {new Date(result.registration.attended_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
                  </Text>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.scanAgainBtn} onPress={resetScan}>
            <Text style={styles.scanAgainText}>Scan Peserta Berikutnya</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  permText: { fontSize: 15, color: '#444', textAlign: 'center', marginBottom: 16 },
  permBtn: { backgroundColor: NIKON_YELLOW, padding: 14, borderRadius: 10 },
  permBtnText: { fontWeight: '700', fontSize: 15, color: NIKON_BLACK },
  startWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  startTitle: { fontSize: 22, fontWeight: '800', color: NIKON_BLACK, marginBottom: 12 },
  startDesc: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  startBtn: { backgroundColor: NIKON_YELLOW, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12 },
  startBtnText: { fontWeight: '800', fontSize: 16, color: NIKON_BLACK },
  cameraWrap: { flex: 1 },
  camera: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  scanBox: { width: 240, height: 240, borderRadius: 12, position: 'relative' },
  corner: { position: 'absolute', width: 32, height: 32, borderColor: NIKON_YELLOW, borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  scanHint: { color: '#fff', fontSize: 13, marginTop: 24, textAlign: 'center', paddingHorizontal: 32 },
  cancelBtn: { backgroundColor: '#fff', margin: 16, padding: 14, borderRadius: 10, alignItems: 'center' },
  cancelBtnText: { fontWeight: '700', color: '#ef4444', fontSize: 15 },
  processingText: { marginTop: 12, fontSize: 14, color: '#666' },
  resultWrap: { padding: 16 },
  resultCard: { padding: 20, borderRadius: 14, marginBottom: 14, alignItems: 'center' },
  resultSuccess: { backgroundColor: '#d1fae5', borderWidth: 1.5, borderColor: '#10b981' },
  resultWarning: { backgroundColor: '#fef3c7', borderWidth: 1.5, borderColor: '#f59e0b' },
  resultError: { backgroundColor: '#fee2e2', borderWidth: 1.5, borderColor: '#ef4444' },
  resultIcon: { fontSize: 40, marginBottom: 8 },
  resultTitle: { fontSize: 18, fontWeight: '800', color: NIKON_BLACK, textAlign: 'center' },
  resultMsg: { fontSize: 13, color: '#555', textAlign: 'center', marginTop: 6 },
  regCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  regEventName: { fontWeight: '700', fontSize: 16, color: NIKON_BLACK, marginBottom: 12 },
  regField: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  regLabel: { fontSize: 13, color: '#888', fontWeight: '500' },
  regValue: { fontSize: 13, color: NIKON_BLACK, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 12 },
  scanAgainBtn: { backgroundColor: NIKON_YELLOW, padding: 16, borderRadius: 12, alignItems: 'center' },
  scanAgainText: { fontWeight: '800', fontSize: 16, color: NIKON_BLACK },
});
