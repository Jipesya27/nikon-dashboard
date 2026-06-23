import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { fetchInfraMetrics } from '../api/client';

function GaugeBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.gaugeContainer}>
      <View style={styles.gaugeHeader}>
        <Text style={styles.gaugeLabel}>{label}</Text>
        <Text style={[styles.gaugeVal, { color }]}>{value}%</Text>
      </View>
      <View style={styles.gaugeTrack}>
        <View style={[styles.gaugeFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export default function InfraScreen() {
  const [metrics, setMetrics] = useState<{ cpu: number; ram: number; disk: number; uptime: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchInfraMetrics();
      setMetrics(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const cpuColor  = (metrics?.cpu || 0)  > 80 ? '#EF4444' : (metrics?.cpu || 0)  > 60 ? '#F59E0B' : '#22C55E';
  const ramColor  = (metrics?.ram || 0)  > 80 ? '#EF4444' : (metrics?.ram || 0)  > 60 ? '#F59E0B' : '#3B82F6';
  const diskColor = (metrics?.disk || 0) > 80 ? '#EF4444' : (metrics?.disk || 0) > 60 ? '#F59E0B' : '#8B5CF6';

  const services = [
    { name: 'Database (Supabase)', ok: true },
    { name: 'WhatsApp Bot API', ok: true },
    { name: 'Google Drive Sync', ok: true },
    { name: 'Cloudflare Tunnel', ok: true },
    { name: 'Synology NAS', ok: true },
  ];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFE500" />}
    >
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Penggunaan Sistem STB</Text>
          {lastUpdated && (
            <Text style={styles.time}>{lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</Text>
          )}
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator color="#FFE500" style={{ padding: 20 }} />
        ) : metrics ? (
          <>
            <GaugeBar label="CPU" value={metrics.cpu} color={cpuColor} />
            <GaugeBar label="RAM" value={metrics.ram} color={ramColor} />
            <GaugeBar label="Disk" value={metrics.disk} color={diskColor} />

            <View style={styles.uptimeBox}>
              <Text style={styles.uptimeIcon}>⏱️</Text>
              <Text style={styles.uptimeText}>Uptime: {metrics.uptime}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.errorText}>Gagal mengambil data sistem.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status Layanan</Text>
        {services.map(s => (
          <View key={s.name} style={styles.serviceRow}>
            <Text style={styles.serviceName}>{s.name}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: s.ok ? '#22C55E' : '#EF4444' }]} />
              <Text style={[styles.statusText, { color: s.ok ? '#16A34A' : '#EF4444' }]}>
                {s.ok ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#1A1A1A' },
  time: { fontSize: 11, color: '#adb5bd' },
  gaugeContainer: { marginBottom: 16 },
  gaugeHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  gaugeLabel: { fontSize: 13, fontWeight: '600', color: '#5f6368' },
  gaugeVal: { fontSize: 13, fontWeight: '800' },
  gaugeTrack: { height: 8, backgroundColor: '#F1F3F5', borderRadius: 4, overflow: 'hidden' },
  gaugeFill: { height: '100%', borderRadius: 4 },
  uptimeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', padding: 12, borderRadius: 10, marginTop: 8 },
  uptimeIcon: { fontSize: 16, marginRight: 8 },
  uptimeText: { fontSize: 13, color: '#1A1A1A', fontWeight: '700' },
  serviceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F3F5' },
  serviceName: { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '800' },
  errorText: { textAlign: 'center', color: '#9aa0a6', padding: 20 },
});
