import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Peringatan', 'Username dan password wajib diisi.');
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err: unknown) {
      Alert.alert('Login Gagal', err instanceof Error ? err.message : 'Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A1A" />
      <View style={styles.container}>
        {/* Logo area */}
        <View style={styles.logoArea}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>N</Text>
          </View>
          <Text style={styles.appName}>Nikon Dashboard</Text>
          <Text style={styles.appSub}>Alta Nikindo Indonesia</Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Masuk</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Masukkan username"
              placeholderTextColor="#9aa0a6"
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                placeholder="Masukkan password"
                placeholderTextColor="#9aa0a6"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                <Text style={styles.eyeText}>{showPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#1A1A1A" size="small" />
              : <Text style={styles.loginBtnText}>Masuk</Text>
            }
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>© 2025 PT Alta Nikindo Indonesia</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1A1A1A' },
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  logoArea: { alignItems: 'center', marginBottom: 32 },
  logoBadge: {
    width: 72, height: 72, borderRadius: 18,
    backgroundColor: '#FFE500', justifyContent: 'center', alignItems: 'center',
    marginBottom: 12, shadowColor: '#FFE500', shadowOpacity: 0.4, shadowRadius: 16,
  },
  logoText: { fontSize: 36, fontWeight: '900', color: '#1A1A1A' },
  appName: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  appSub: { fontSize: 13, color: '#9aa0a6', marginTop: 4 },
  card: {
    backgroundColor: '#ffffff', borderRadius: 20,
    padding: 24, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20,
    elevation: 8,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 20 },
  field: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#5f6368', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#E8EAED', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1A1A',
    backgroundColor: '#FAFAFA',
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 10 },
  eyeText: { fontSize: 20 },
  loginBtn: {
    backgroundColor: '#FFE500', borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 8,
  },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  footer: { textAlign: 'center', color: '#5f6368', fontSize: 11, marginTop: 24 },
});
