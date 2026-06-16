import { useEffect, useState, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import api, { sbRead } from '@/lib/api';
import { RiwayatPesan } from '@/lib/types';
import { NIKON_BLACK, NIKON_YELLOW } from '@/constants/config';

export default function ThreadScreen() {
  const { wa, nama } = useLocalSearchParams<{ wa: string; nama: string }>();
  const [messages, setMessages] = useState<RiwayatPesan[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  async function loadMessages() {
    if (!wa) return;
    try {
      const msgs = await sbRead<RiwayatPesan>({
        table: 'riwayat_pesan',
        select: '*',
        filters: [{ col: 'nomor_wa', op: 'eq', val: wa }],
        order: { col: 'waktu_pesan', ascending: true },
        limit: 100,
      });
      setMessages(msgs);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadMessages(); }, [wa]);

  async function sendMessage() {
    if (!text.trim() || !wa) return;
    setSending(true);
    try {
      await api.post('/api/admin/send-wa', { target: wa, message: text.trim() });
      setText('');
      await loadMessages();
    } catch {
      Alert.alert('Gagal', 'Pesan tidak terkirim. Coba lagi.');
    } finally {
      setSending(false);
    }
  }

  function formatTime(iso: string) {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
  }

  function renderMessage({ item }: { item: RiwayatPesan }) {
    const isOut = item.arah_pesan === 'OUT';
    return (
      <View style={[styles.bubbleWrap, isOut ? styles.bubbleWrapOut : styles.bubbleWrapIn]}>
        <View style={[styles.bubble, isOut ? styles.bubbleOut : styles.bubbleIn]}>
          {item.isi_pesan ? (
            <Text style={[styles.bubbleText, isOut && styles.bubbleTextOut]}>{item.isi_pesan}</Text>
          ) : (
            <Text style={styles.mediaPlaceholder}>📎 Media</Text>
          )}
          <Text style={[styles.bubbleTime, isOut && styles.bubbleTimeOut]}>{formatTime(item.waktu_pesan)}</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={NIKON_BLACK} /></View>;
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>{(nama || wa || '?')[0].toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.headerName}>{nama || wa}</Text>
          <Text style={styles.headerWa}>{wa}</Text>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m, i) => m.id_pesan || String(i)}
        renderItem={renderMessage}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={<Text style={styles.empty}>Belum ada pesan</Text>}
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Ketik pesan..."
          placeholderTextColor="#aaa"
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!text.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendBtnText}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ece5dd' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderBottomWidth: 1, borderColor: '#eee' },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: NIKON_YELLOW, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  headerAvatarText: { fontWeight: '800', fontSize: 16, color: NIKON_BLACK },
  headerName: { fontWeight: '700', fontSize: 15, color: NIKON_BLACK },
  headerWa: { fontSize: 12, color: '#666' },
  list: { padding: 12 },
  bubbleWrap: { marginVertical: 3, maxWidth: '80%' },
  bubbleWrapIn: { alignSelf: 'flex-start' },
  bubbleWrapOut: { alignSelf: 'flex-end' },
  bubble: { padding: 10, borderRadius: 12 },
  bubbleIn: { backgroundColor: '#fff', borderTopLeftRadius: 2 },
  bubbleOut: { backgroundColor: '#dcf8c6', borderTopRightRadius: 2 },
  bubbleText: { fontSize: 14, color: NIKON_BLACK, lineHeight: 20 },
  bubbleTextOut: { color: '#000' },
  mediaPlaceholder: { fontSize: 13, color: '#666' },
  bubbleTime: { fontSize: 10, color: '#999', textAlign: 'right', marginTop: 4 },
  bubbleTimeOut: { color: '#6a8c5c' },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 60, fontSize: 14 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#f0f0f0', padding: 8, borderTopWidth: 1, borderColor: '#ddd' },
  input: { flex: 1, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 120, color: NIKON_BLACK, borderWidth: 1, borderColor: '#e0e0e0' },
  sendBtn: { backgroundColor: '#25D366', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  sendBtnDisabled: { backgroundColor: '#ccc' },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
