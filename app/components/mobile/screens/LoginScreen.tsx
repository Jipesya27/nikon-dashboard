'use client';
import React, { useState } from 'react';

interface LoginScreenProps {
  loginForm: { username: string; password: string };
  setLoginForm: (f: { username: string; password: string }) => void;
  loginError: string;
  handleLogin: (e: React.FormEvent) => void;
}

export default function LoginScreen({
  loginForm, setLoginForm, loginError, handleLogin,
}: LoginScreenProps) {
  const [showPw, setShowPw] = useState(false);

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(160deg, #1A1A1A 60%, #2a2a2a)',
      minHeight: '100%', padding: '0 24px',
    }}>
      {/* Logo area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 18, background: '#FFE500',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(255,229,0,.35)',
          }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: '#1A1A1A' }}>N</span>
          </div>
          <div style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>Nikon Dashboard</div>
          <div style={{ color: '#9aa0a6', fontSize: 13, marginTop: 4 }}>Alta Nikindo — CRM Purnajual</div>
        </div>

        {/* Error */}
        {loginError && (
          <div style={{
            background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)',
            borderRadius: 10, padding: '10px 14px', marginBottom: 8,
          }}>
            <span style={{ fontSize: 13, color: '#FCA5A5' }}>{loginError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ color: '#9aa0a6', fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>USERNAME</label>
            <input
              type="text"
              value={loginForm.username}
              onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
              required
              autoComplete="username"
              placeholder="Masukkan username"
              style={{
                display: 'block', width: '100%', marginTop: 6,
                background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)',
                borderRadius: 10, padding: '13px 16px', color: '#fff', fontSize: 15,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ color: '#9aa0a6', fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>PASSWORD</label>
            <div style={{ position: 'relative', marginTop: 6 }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={loginForm.password}
                onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                required
                autoComplete="current-password"
                placeholder="Masukkan password"
                style={{
                  display: 'block', width: '100%',
                  background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)',
                  borderRadius: 10, padding: '13px 48px 13px 16px', color: '#fff', fontSize: 15,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#9aa0a6' }}>
                  {showPw ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            style={{
              marginTop: 8, height: 52, borderRadius: 14, background: '#FFE500',
              border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 800,
              color: '#1A1A1A', boxShadow: '0 8px 24px rgba(255,229,0,.35)',
            }}
          >
            MASUK →
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <span style={{ fontSize: 12, color: '#5f6368' }}>Lupa password? Hubungi Admin</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ paddingBottom: 32, textAlign: 'center' }}>
        <span style={{ fontSize: 11, color: '#3a3a3a' }}>Alta Nikindo Indonesia © 2026</span>
      </div>
    </div>
  );
}
