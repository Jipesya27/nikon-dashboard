'use client';
import React, { useRef, useEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { MobileHeader } from '../MobileShell';

interface AbsensiScreenProps {
  onDrawerOpen: () => void;
  onScanSuccess?: (decodedText: string) => void;
}

export default function AbsensiScreen({ onDrawerOpen, onScanSuccess }: AbsensiScreenProps) {
  const [scanState, setScanState] = useState<'scanning' | 'success' | 'fail'>('scanning');
  const [resultName, setResultName] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = 'mobile-qr-scanner';

  useEffect(() => {
    let scanner: Html5Qrcode | null = null;
    const startScanner = async () => {
      try {
        scanner = new Html5Qrcode(scannerDivId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            setScanState('success');
            setResultName(decodedText);
            onScanSuccess?.(decodedText);
            scanner?.stop().catch(() => {});
          },
          () => {}
        );
      } catch {
        setScanState('fail');
      }
    };
    startScanner();
    return () => { scanner?.stop().catch(() => {}); };
  }, []);

  const reset = () => { setScanState('scanning'); setResultName(''); };

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <MobileHeader title="Absensi QR" subtitle="Scan tiket peserta event" onMenuOpen={onDrawerOpen} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 }}>
        {scanState === 'scanning' && (
          <>
            <div id={scannerDivId} style={{ width: 280, height: 280, borderRadius: 16, overflow: 'hidden', border: '3px solid #FFE500' }} />
            <div style={{ fontSize: 14, color: '#9aa0a6', fontWeight: 600, textAlign: 'center' }}>
              Arahkan kamera ke QR Code tiket peserta
            </div>
          </>
        )}
        {(scanState === 'success' || scanState === 'fail') && (
          <div style={{ background: scanState === 'success' ? 'linear-gradient(135deg,#16A34A,#15803D)' : 'linear-gradient(135deg,#EF4444,#DC2626)', borderRadius: 20, padding: 32, textAlign: 'center', width: '100%' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 64, color: '#fff' }}>
              {scanState === 'success' ? 'check_circle' : 'cancel'}
            </span>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 800, marginTop: 16 }}>
              {scanState === 'success' ? 'Kehadiran Tercatat' : 'QR Tidak Valid'}
            </div>
            {scanState === 'success' && (
              <div style={{ color: 'rgba(255,255,255,.85)', fontSize: 15, marginTop: 8 }}>{resultName}</div>
            )}
            <button onClick={reset} style={{ marginTop: 20, padding: '12px 28px', borderRadius: 12, background: 'rgba(255,255,255,.2)', border: '1.5px solid rgba(255,255,255,.4)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Scan Lagi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
