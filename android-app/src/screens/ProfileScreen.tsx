import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../api/client';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { karyawan, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Keluar', 'Yakin ingin keluar dari akun ini?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarArea}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(karyawan?.nama_karyawan ?? 'A').substring(0, 2).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{karyawan?.nama_karyawan ?? '—'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{karyawan?.role ?? '—'}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Informasi Akun</Text>
        <InfoRow label="Username" value={karyawan?.username ?? '—'} />
        <InfoRow label="Role" value={karyawan?.role ?? '—'} />
        {karyawan?.nomor_wa && <InfoRow label="Nomor WA" value={karyawan.nomor_wa} />}
        <InfoRow label="Status" value={karyawan?.status_aktif ? 'Aktif' : 'Nonaktif'} />
      </View>

      {/* App info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Informasi Aplikasi</Text>
        <InfoRow label="Versi" value="1.0.0" />
        <InfoRow label="API Server" value={API_BASE_URL} />
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
        <Text style={styles.logoutText}>Keluar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 20, paddingBottom: 40 },
  avatarArea: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFE500',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    shadowColor: '#FFE500', shadowOpacity: 0.4, shadowRadius: 12, elevation: 4,
  },
  avatarText: { fontSize: 28, fontWeight: '900', color: '#1A1A1A' },
  name: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', marginBottom: 6 },
  roleBadge: { backgroundColor: '#1A1A1A', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 },
  roleText: { fontSize: 12, fontWeight: '700', color: '#FFE500' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.04, elevation: 2,
  },
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#9aa0a6', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoLabel: { fontSize: 14, color: '#5f6368' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', textAlign: 'right', maxWidth: '60%' },
  logoutBtn: {
    backgroundColor: '#FEF2F2', borderRadius: 14, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#FECACA',
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#DC2626' },
});
