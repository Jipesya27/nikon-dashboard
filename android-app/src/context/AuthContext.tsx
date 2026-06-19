import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginApi } from '../api/client';
import type { Karyawan } from '../api/types';

interface AuthState {
  karyawan: Karyawan | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [karyawan, setKaryawan] = useState<Karyawan | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [session, stored] = await Promise.all([
          AsyncStorage.getItem('adminSession'),
          AsyncStorage.getItem('karyawan'),
        ]);
        if (session && stored) {
          setKaryawan(JSON.parse(stored) as Karyawan);
        }
      } catch {
        // storage error, stay logged out
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (username: string, password: string) => {
    const result = await loginApi(username, password);
    await Promise.all([
      AsyncStorage.setItem('adminSession', result.tokens.adminSession),
      AsyncStorage.setItem('karyawanIdentity', result.tokens.karyawanIdentity),
      AsyncStorage.setItem('karyawan', JSON.stringify(result.karyawan)),
    ]);
    setKaryawan(result.karyawan);
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['adminSession', 'karyawanIdentity', 'karyawan']);
    setKaryawan(null);
  };

  return (
    <AuthContext.Provider value={{ karyawan, isLoggedIn: !!karyawan, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
