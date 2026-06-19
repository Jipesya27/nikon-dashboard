import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { fetchChatMessages, sendWAMessage } from '../api/client';
import type { RiwayatPesan } from '../api/types';
import type { ChatStackParamList } from '../navigation';

type Route = RouteProp<ChatStackParamList, 'ChatDetail'>;

function Bubble({ msg }: { msg: RiwayatPesan }) {
  const isOut = msg.arah_pesan === 'OUT';
  const time = new Date(msg.waktu_pesan || msg.created_at || '').toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
  });
  return (
    <View style={[styles.bubbleWrap, isOut ? styles.bubbleWrapOut : styles.bubbleWrapIn]}>
      <View style={[styles.bubble, isOut ? styles.bubbleOut : styles.bubbleIn]}>
        {msg.url_media && (
          <View style={styles.mediaHint}>
            <Text style={styles.mediaText}>📎 Media</Text>
          </View>
        )}
        <Text style={[styles.bubbleText, isOut && styles.bubbleTextOut]}>{msg.isi_pesan}</Text>
        <Text style={[styles.bubbleTime, isOut && styles.bubbleTimeOut]}>{time}</Text>
      </View>
    </View>
  );
}

export default function ChatDetailScreen() {
  const route = useRoute<Route>();
  const { nomorWa, nama } = route.params;
  const [messages, setMessages] = useState<RiwayatPesan[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchChatMessages(nomorWa, 80);
      // Reverse to show oldest first (FlatList inverted)
      setMessages((res.data ?? []).reverse());
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, [nomorWa]);

  useEffect(() => { load(); }, [load]);

  const handleSend = async () => {
    if (!text.trim()) return;
    const msg = text.trim();
    setText('');
    setSending(true);
    try {
      await sendWAMessage(nomorWa, msg);
      // Optimistic UI
      setMessages(prev => [...prev, {
        id_pesan: String(Date.now()),
        nomor_wa: nomorWa,
        nama_profil_wa: nama,
        arah_pesan: 'OUT',
        isi_pesan: msg,
        waktu_pesan: new Date().toISOString(),
        jenis_pesan: 'chat',
      }]);
    } catch (err: unknown) {
      Alert.alert('Gagal', err instanceof Error ? err.message : 'Coba lagi.');
      setText(msg);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#FFE500" size="large" /></View>;
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item, i) => item.id_pesan ?? String(i)}
        renderItem={({ item }) => <Bubble msg={item} />}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        contentContainerStyle={{ padding: 12, paddingBottom: 8 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>Belum ada pesan</Text>
          </View>
        }
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Ketik pesan…"
          placeholderTextColor="#9aa0a6"
          multiline
          maxLength={4096}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending
            ? <ActivityIndicator size="small" color="#1A1A1A" />
            : <Text style={styles.sendIcon}>➤</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E8ECF0' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bubbleWrap: { flexDirection: 'row', marginBottom: 4 },
  bubbleWrapIn: { justifyContent: 'flex-start' },
  bubbleWrapOut: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '78%', padding: 10, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.04, elevation: 1 },
  bubbleIn: { backgroundColor: '#fff', borderTopLeftRadius: 2 },
  bubbleOut: { backgroundColor: '#DCF8C6', borderTopRightRadius: 2 },
  bubbleText: { fontSize: 14, color: '#1A1A1A', lineHeight: 20 },
  bubbleTextOut: { color: '#1A1A1A' },
  bubbleTime: { fontSize: 10, color: '#9aa0a6', marginTop: 4, textAlign: 'right' },
  bubbleTimeOut: { color: '#5f6368' },
  mediaHint: { backgroundColor: '#F3F4F6', borderRadius: 6, padding: 6, marginBottom: 4 },
  mediaText: { fontSize: 12, color: '#5f6368' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#9aa0a6', fontWeight: '600' },
  inputRow: {
    flexDirection: 'row', gap: 8, padding: 10,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#EEF0F2',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1, backgroundColor: '#F3F4F6', borderRadius: 22, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: 14, color: '#1A1A1A', maxHeight: 120,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFE500',
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendIcon: { fontSize: 18, color: '#1A1A1A' },
});
