'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import GridLayout from 'react-grid-layout/legacy';
import type { Layout, LayoutItem } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import {
   HomepageConfig, PageComponent, ComponentType, DEFAULT_CONFIG, COMPONENT_META,
   ImageProps, LabelProps, ButtonProps, HyperlinkProps, DividerProps, SpacerProps, HeroProps, AnyProps,
   NikonPageConfig, DEFAULT_NIKON_CONFIG,
} from '@/app/lib/homepageTypes';

const ROW_HEIGHT = 30;
const COLS = 12;

// ─────────────────────────── Component renderer ──────────────────────────────

function RenderComp({ comp, isAdmin }: { comp: PageComponent; isAdmin?: boolean }) {
   const { type, props } = comp;
   switch (type) {
      case 'image': {
         const p = props as ImageProps;
         if (!p.src) return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400 text-xs gap-1 select-none">
               <span className="text-2xl">🖼️</span><span>Belum ada gambar</span>
            </div>
         );
         // eslint-disable-next-line @next/next/no-img-element
         return <img src={p.src} alt={p.alt} style={{ width: '100%', height: '100%', objectFit: p.objectFit, borderRadius: p.borderRadius, display: 'block', pointerEvents: isAdmin ? 'none' : 'auto' }} />;
      }
      case 'label': {
         const p = props as LabelProps;
         return (
            <div className="w-full h-full flex items-center overflow-hidden px-1">
               <p style={{ fontSize: p.fontSize, fontWeight: p.fontWeight as React.CSSProperties['fontWeight'], color: p.color, textAlign: p.align, fontStyle: p.italic ? 'italic' : 'normal', textDecoration: p.underline ? 'underline' : 'none', lineHeight: p.lineHeight, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', width: '100%' }}>
                  {p.text || <span className="text-gray-400 italic">Teks kosong</span>}
               </p>
            </div>
         );
      }
      case 'button': {
         const p = props as ButtonProps;
         return (
            <div className="w-full h-full flex items-center justify-start px-1">
               <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: p.bgColor, color: p.textColor, borderRadius: p.borderRadius, fontSize: p.fontSize, padding: `${p.paddingY}px ${p.paddingX}px`, fontWeight: 'bold', whiteSpace: 'nowrap', cursor: isAdmin ? 'default' : 'pointer' }}>
                  {p.text || 'Button'}
               </span>
            </div>
         );
      }
      case 'hyperlink': {
         const p = props as HyperlinkProps;
         return (
            <div className="w-full h-full flex items-center px-1">
               <span style={{ color: p.color, fontSize: p.fontSize, textDecoration: 'underline', cursor: isAdmin ? 'default' : 'pointer' }}>
                  {p.text || 'Link'}
               </span>
            </div>
         );
      }
      case 'divider': {
         const p = props as DividerProps;
         return <div className="w-full h-full flex items-center"><hr style={{ width: '100%', border: 'none', borderTop: `${p.thickness}px ${p.style} ${p.color}` }} /></div>;
      }
      case 'spacer': {
         const p = props as SpacerProps;
         return <div className="w-full h-full" style={{ background: p.background !== 'transparent' ? p.background : undefined }} />;
      }
      case 'hero': {
         const p = props as HeroProps;
         const justifyMap = { left: 'flex-start', center: 'center', right: 'flex-end' };
         return (
            <div style={{ width: '100%', height: '100%', position: 'relative', background: p.backgroundImage ? `url(${p.backgroundImage}) center/cover no-repeat` : p.backgroundColor, display: 'flex', alignItems: 'center', justifyContent: justifyMap[p.align], padding: '24px 32px', overflow: 'hidden' }}>
               {p.overlayOpacity > 0 && <div style={{ position: 'absolute', inset: 0, backgroundColor: p.overlayColor, opacity: p.overlayOpacity / 100 }} />}
               <div style={{ position: 'relative', zIndex: 1, textAlign: p.align, maxWidth: '100%' }}>
                  {p.title && <h1 style={{ color: p.titleColor, fontSize: 'clamp(1.2rem,3vw,2rem)', fontWeight: 'bold', margin: '0 0 8px' }}>{p.title}</h1>}
                  {p.subtitle && <p style={{ color: p.subtitleColor, fontSize: 'clamp(0.8rem,1.5vw,1rem)', margin: '0 0 16px', lineHeight: 1.5 }}>{p.subtitle}</p>}
                  {p.buttonText && <span style={{ display: 'inline-block', backgroundColor: p.buttonBgColor, color: p.buttonTextColor, padding: '8px 20px', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px' }}>{p.buttonText}</span>}
               </div>
            </div>
         );
      }
      default: return null;
   }
}

// ─────────────────────────── Properties panel ────────────────────────────────

function PropInput({ label, children }: { label: string; children: React.ReactNode }) {
   return (
      <div className="space-y-1">
         <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{label}</label>
         {children}
      </div>
   );
}

const inp = "w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white";
const sel = "w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-gray-400";

function PropsPanel({ comp, onChange, onDelete }: {
   comp: PageComponent;
   onChange: (id: string, props: AnyProps) => void;
   onDelete: (id: string) => void;
}) {
   const set = (patch: Partial<AnyProps>) => onChange(comp.id, { ...comp.props, ...patch } as AnyProps);
   const { type } = comp;

   return (
      <div className="space-y-3">
         <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div>
               <p className="text-xs font-bold text-gray-800">{COMPONENT_META[type].icon} {COMPONENT_META[type].label}</p>
               <p className="text-[10px] text-gray-400 font-mono">{comp.id}</p>
            </div>
            <button onClick={() => onDelete(comp.id)} className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1 rounded hover:bg-red-50 transition">🗑 Hapus</button>
         </div>

         {type === 'image' && (() => {
            const p = comp.props as ImageProps;
            return <>
               <PropInput label="URL Gambar"><input className={inp} value={p.src} onChange={e => set({ src: e.target.value } as Partial<ImageProps>)} placeholder="https://..." /></PropInput>
               <PropInput label="Alt Text"><input className={inp} value={p.alt} onChange={e => set({ alt: e.target.value } as Partial<ImageProps>)} /></PropInput>
               <PropInput label="Object Fit">
                  <select className={sel} value={p.objectFit} onChange={e => set({ objectFit: e.target.value as ImageProps['objectFit'] } as Partial<ImageProps>)}>
                     {['cover', 'contain', 'fill', 'none'].map(v => <option key={v}>{v}</option>)}
                  </select>
               </PropInput>
               <PropInput label="Border Radius (px)"><input type="number" className={inp} value={p.borderRadius} min={0} onChange={e => set({ borderRadius: +e.target.value } as Partial<ImageProps>)} /></PropInput>
            </>;
         })()}

         {type === 'label' && (() => {
            const p = comp.props as LabelProps;
            return <>
               <PropInput label="Teks"><textarea className={`${inp} resize-none`} rows={3} value={p.text} onChange={e => set({ text: e.target.value } as Partial<LabelProps>)} /></PropInput>
               <div className="grid grid-cols-2 gap-2">
                  <PropInput label="Font Size"><input className={inp} value={p.fontSize} onChange={e => set({ fontSize: e.target.value } as Partial<LabelProps>)} placeholder="16px" /></PropInput>
                  <PropInput label="Line Height"><input className={inp} value={p.lineHeight} onChange={e => set({ lineHeight: e.target.value } as Partial<LabelProps>)} placeholder="1.5" /></PropInput>
               </div>
               <PropInput label="Font Weight">
                  <select className={sel} value={p.fontWeight} onChange={e => set({ fontWeight: e.target.value } as Partial<LabelProps>)}>
                     {['normal', 'medium', 'semibold', 'bold', 'extrabold'].map(v => <option key={v}>{v}</option>)}
                  </select>
               </PropInput>
               <PropInput label="Align">
                  <div className="flex gap-1">
                     {(['left', 'center', 'right'] as const).map(a => (
                        <button key={a} onClick={() => set({ align: a } as Partial<LabelProps>)} className={`flex-1 py-1 text-xs font-bold rounded border transition ${p.align === a ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 hover:bg-gray-50'}`}>
                           {a === 'left' ? '⬅' : a === 'center' ? '↔' : '➡'}
                        </button>
                     ))}
                  </div>
               </PropInput>
               <PropInput label="Warna">
                  <div className="flex items-center gap-2">
                     <input type="color" value={p.color} onChange={e => set({ color: e.target.value } as Partial<LabelProps>)} className="w-8 h-7 rounded border border-gray-200 cursor-pointer" />
                     <input className={`${inp} flex-1`} value={p.color} onChange={e => set({ color: e.target.value } as Partial<LabelProps>)} />
                  </div>
               </PropInput>
               <div className="flex gap-3">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="checkbox" checked={p.italic} onChange={e => set({ italic: e.target.checked } as Partial<LabelProps>)} /><span className="italic">Italic</span></label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="checkbox" checked={p.underline} onChange={e => set({ underline: e.target.checked } as Partial<LabelProps>)} /><span className="underline">Underline</span></label>
               </div>
            </>;
         })()}

         {type === 'button' && (() => {
            const p = comp.props as ButtonProps;
            return <>
               <PropInput label="Teks"><input className={inp} value={p.text} onChange={e => set({ text: e.target.value } as Partial<ButtonProps>)} /></PropInput>
               <PropInput label="Link (href)"><input className={inp} value={p.href} onChange={e => set({ href: e.target.value } as Partial<ButtonProps>)} placeholder="https://..." /></PropInput>
               <div className="grid grid-cols-2 gap-2">
                  <PropInput label="Bg Color">
                     <div className="flex items-center gap-1">
                        <input type="color" value={p.bgColor} onChange={e => set({ bgColor: e.target.value } as Partial<ButtonProps>)} className="w-7 h-7 rounded border border-gray-200 cursor-pointer shrink-0" />
                        <input className={`${inp} flex-1`} value={p.bgColor} onChange={e => set({ bgColor: e.target.value } as Partial<ButtonProps>)} />
                     </div>
                  </PropInput>
                  <PropInput label="Text Color">
                     <div className="flex items-center gap-1">
                        <input type="color" value={p.textColor} onChange={e => set({ textColor: e.target.value } as Partial<ButtonProps>)} className="w-7 h-7 rounded border border-gray-200 cursor-pointer shrink-0" />
                        <input className={`${inp} flex-1`} value={p.textColor} onChange={e => set({ textColor: e.target.value } as Partial<ButtonProps>)} />
                     </div>
                  </PropInput>
               </div>
               <div className="grid grid-cols-3 gap-2">
                  <PropInput label="Radius"><input type="number" className={inp} min={0} value={p.borderRadius} onChange={e => set({ borderRadius: +e.target.value } as Partial<ButtonProps>)} /></PropInput>
                  <PropInput label="Padding X"><input type="number" className={inp} min={0} value={p.paddingX} onChange={e => set({ paddingX: +e.target.value } as Partial<ButtonProps>)} /></PropInput>
                  <PropInput label="Padding Y"><input type="number" className={inp} min={0} value={p.paddingY} onChange={e => set({ paddingY: +e.target.value } as Partial<ButtonProps>)} /></PropInput>
               </div>
               <PropInput label="Font Size"><input className={inp} value={p.fontSize} onChange={e => set({ fontSize: e.target.value } as Partial<ButtonProps>)} placeholder="14px" /></PropInput>
               <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="checkbox" checked={p.openNewTab} onChange={e => set({ openNewTab: e.target.checked } as Partial<ButtonProps>)} />Buka tab baru</label>
            </>;
         })()}

         {type === 'hyperlink' && (() => {
            const p = comp.props as HyperlinkProps;
            return <>
               <PropInput label="Teks Link"><input className={inp} value={p.text} onChange={e => set({ text: e.target.value } as Partial<HyperlinkProps>)} /></PropInput>
               <PropInput label="URL"><input className={inp} value={p.href} onChange={e => set({ href: e.target.value } as Partial<HyperlinkProps>)} placeholder="https://..." /></PropInput>
               <PropInput label="Warna">
                  <div className="flex items-center gap-2">
                     <input type="color" value={p.color} onChange={e => set({ color: e.target.value } as Partial<HyperlinkProps>)} className="w-8 h-7 rounded border border-gray-200 cursor-pointer" />
                     <input className={`${inp} flex-1`} value={p.color} onChange={e => set({ color: e.target.value } as Partial<HyperlinkProps>)} />
                  </div>
               </PropInput>
               <PropInput label="Font Size"><input className={inp} value={p.fontSize} onChange={e => set({ fontSize: e.target.value } as Partial<HyperlinkProps>)} placeholder="14px" /></PropInput>
               <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="checkbox" checked={p.openNewTab} onChange={e => set({ openNewTab: e.target.checked } as Partial<HyperlinkProps>)} />Buka tab baru</label>
            </>;
         })()}

         {type === 'divider' && (() => {
            const p = comp.props as DividerProps;
            return <>
               <PropInput label="Warna">
                  <div className="flex items-center gap-2">
                     <input type="color" value={p.color} onChange={e => set({ color: e.target.value } as Partial<DividerProps>)} className="w-8 h-7 rounded border border-gray-200 cursor-pointer" />
                     <input className={`${inp} flex-1`} value={p.color} onChange={e => set({ color: e.target.value } as Partial<DividerProps>)} />
                  </div>
               </PropInput>
               <div className="grid grid-cols-2 gap-2">
                  <PropInput label="Tebal (px)"><input type="number" className={inp} min={1} value={p.thickness} onChange={e => set({ thickness: +e.target.value } as Partial<DividerProps>)} /></PropInput>
                  <PropInput label="Margin (px)"><input type="number" className={inp} min={0} value={p.margin} onChange={e => set({ margin: +e.target.value } as Partial<DividerProps>)} /></PropInput>
               </div>
               <PropInput label="Style">
                  <select className={sel} value={p.style} onChange={e => set({ style: e.target.value as DividerProps['style'] } as Partial<DividerProps>)}>
                     {['solid', 'dashed', 'dotted'].map(v => <option key={v}>{v}</option>)}
                  </select>
               </PropInput>
            </>;
         })()}

         {type === 'spacer' && (() => {
            const p = comp.props as SpacerProps;
            return <PropInput label="Background">
               <div className="flex items-center gap-2">
                  <input type="color" value={p.background === 'transparent' ? '#ffffff' : p.background} onChange={e => set({ background: e.target.value } as Partial<SpacerProps>)} className="w-8 h-7 rounded border border-gray-200 cursor-pointer" />
                  <input className={`${inp} flex-1`} value={p.background} onChange={e => set({ background: e.target.value } as Partial<SpacerProps>)} placeholder="transparent" />
               </div>
            </PropInput>;
         })()}

         {type === 'hero' && (() => {
            const p = comp.props as HeroProps;
            const colorRow = (label: string, key: keyof HeroProps) => (
               <PropInput key={key} label={label}>
                  <div className="flex items-center gap-2">
                     <input type="color" value={p[key] as string} onChange={e => set({ [key]: e.target.value } as Partial<HeroProps>)} className="w-8 h-7 rounded border border-gray-200 cursor-pointer" />
                     <input className={`${inp} flex-1`} value={p[key] as string} onChange={e => set({ [key]: e.target.value } as Partial<HeroProps>)} />
                  </div>
               </PropInput>
            );
            return <>
               <PropInput label="Judul (Title)"><input className={inp} value={p.title} onChange={e => set({ title: e.target.value } as Partial<HeroProps>)} /></PropInput>
               <PropInput label="Subjudul (Subtitle)"><textarea className={`${inp} resize-none`} rows={2} value={p.subtitle} onChange={e => set({ subtitle: e.target.value } as Partial<HeroProps>)} /></PropInput>
               <PropInput label="URL Background Image"><input className={inp} value={p.backgroundImage} onChange={e => set({ backgroundImage: e.target.value } as Partial<HeroProps>)} placeholder="https://... (kosongkan = pakai warna)" /></PropInput>
               {colorRow('Background Color', 'backgroundColor')}
               {colorRow('Warna Judul', 'titleColor')}
               {colorRow('Warna Subjudul', 'subtitleColor')}
               {colorRow('Warna Overlay', 'overlayColor')}
               <PropInput label={`Opacity Overlay: ${p.overlayOpacity}%`}><input type="range" min={0} max={100} value={p.overlayOpacity} onChange={e => set({ overlayOpacity: +e.target.value } as Partial<HeroProps>)} className="w-full" /></PropInput>
               <PropInput label="Align">
                  <div className="flex gap-1">
                     {(['left', 'center', 'right'] as const).map(a => (
                        <button key={a} onClick={() => set({ align: a } as Partial<HeroProps>)} className={`flex-1 py-1 text-xs font-bold rounded border transition ${p.align === a ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 hover:bg-gray-50'}`}>
                           {a === 'left' ? '⬅' : a === 'center' ? '↔' : '➡'}
                        </button>
                     ))}
                  </div>
               </PropInput>
               <PropInput label="Teks Button CTA"><input className={inp} value={p.buttonText} onChange={e => set({ buttonText: e.target.value } as Partial<HeroProps>)} placeholder="Kosongkan = sembunyikan" /></PropInput>
               <PropInput label="Link Button CTA"><input className={inp} value={p.buttonHref} onChange={e => set({ buttonHref: e.target.value } as Partial<HeroProps>)} /></PropInput>
               <div className="grid grid-cols-2 gap-2">
                  {colorRow('Bg Button', 'buttonBgColor')}
                  {colorRow('Text Button', 'buttonTextColor')}
               </div>
            </>;
         })()}
      </div>
   );
}

// ─────────────────────────── Page settings panel ─────────────────────────────

function PageSettings({ config, onChange }: { config: HomepageConfig; onChange: (patch: Partial<HomepageConfig>) => void }) {
   return (
      <div className="space-y-3">
         <p className="text-xs font-bold text-gray-800 pb-2 border-b border-gray-100">⚙️ Pengaturan Halaman</p>
         <PropInput label="Page Title"><input className={inp} value={config.pageTitle} onChange={e => onChange({ pageTitle: e.target.value })} /></PropInput>
         <PropInput label="Meta Description"><textarea className={`${inp} resize-none`} rows={2} value={config.pageDescription} onChange={e => onChange({ pageDescription: e.target.value })} /></PropInput>
         <PropInput label="Background Color">
            <div className="flex items-center gap-2">
               <input type="color" value={config.backgroundColor} onChange={e => onChange({ backgroundColor: e.target.value })} className="w-8 h-7 rounded border border-gray-200 cursor-pointer" />
               <input className={`${inp} flex-1`} value={config.backgroundColor} onChange={e => onChange({ backgroundColor: e.target.value })} />
            </div>
         </PropInput>
         <PropInput label="Max Width"><input className={inp} value={config.maxWidth} onChange={e => onChange({ maxWidth: e.target.value })} placeholder="1200px" /></PropInput>
      </div>
   );
}

// ─────────────────────────── Nikon page settings panel ──────────────────────

function NikonSettingsPanel() {
   const [cfg, setCfg] = useState<NikonPageConfig>(DEFAULT_NIKON_CONFIG);
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [saved, setSaved] = useState(false);

   useEffect(() => {
      fetch('/api/nikon-config')
         .then(r => r.json())
         .then(d => { if (d.config) setCfg(d.config); })
         .finally(() => setLoading(false));
   }, []);

   const set = (patch: Partial<NikonPageConfig>) => { setCfg(prev => ({ ...prev, ...patch })); setSaved(false); };

   const save = async () => {
      setSaving(true);
      await fetch('/api/nikon-config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config: cfg }) });
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
   };

   if (loading) return <div className="py-8 text-center text-xs text-gray-400 animate-pulse">Memuat...</div>;

   return (
      <div className="space-y-4">
         <div className="pb-2 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-800">🖥 Konten Halaman /nikon</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Perubahan langsung tampil di halaman publik.</p>
         </div>

         <PropInput label="Nomor WhatsApp">
            <input className={inp} value={cfg.wa_number} onChange={e => set({ wa_number: e.target.value })}
               placeholder="6281234567890" />
            <p className="text-[10px] text-gray-400 mt-1">Format: 62xxx tanpa + atau spasi</p>
         </PropInput>

         <div className="border-t border-dashed border-gray-100 pt-3">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Hero — Judul</p>
            <div className="space-y-2">
               <PropInput label="Baris 1 (putih)">
                  <input className={inp} value={cfg.hero_title_1} onChange={e => set({ hero_title_1: e.target.value })} />
               </PropInput>
               <PropInput label="Baris 2 (kuning emas — aksen)">
                  <input className={inp} value={cfg.hero_title_2} onChange={e => set({ hero_title_2: e.target.value })} />
               </PropInput>
               <PropInput label="Baris 3 (abu terang)">
                  <input className={inp} value={cfg.hero_title_3} onChange={e => set({ hero_title_3: e.target.value })} />
               </PropInput>
            </div>
         </div>

         <PropInput label="Subtitle Hero">
            <textarea className={`${inp} resize-none`} rows={3} value={cfg.hero_subtitle}
               onChange={e => set({ hero_subtitle: e.target.value })} />
         </PropInput>

         <PropInput label="Teks Announcement Bar">
            <textarea className={`${inp} resize-none`} rows={2} value={cfg.announcement_text}
               onChange={e => set({ announcement_text: e.target.value })} />
         </PropInput>

         <button onClick={save} disabled={saving}
            className={`w-full text-xs font-bold py-2 rounded-lg transition ${saved ? 'bg-green-600 text-white' : 'bg-gray-900 hover:bg-gray-700 text-white disabled:bg-gray-300'}`}>
            {saving ? '⏳ Menyimpan...' : saved ? '✓ Tersimpan' : '💾 Simpan Konten /nikon'}
         </button>
      </div>
   );
}

// ─────────────────────────── Main editor ─────────────────────────────────────

export default function HomepageEditor() {
   const [config, setConfig] = useState<HomepageConfig>(DEFAULT_CONFIG);
   const [selectedId, setSelectedId] = useState<string | null>(null);
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [dirty, setDirty] = useState(false);
   const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
   const [canvasWidth, setCanvasWidth] = useState(900);
   const canvasRef = useRef<HTMLDivElement>(null);
   const [showPageSettings, setShowPageSettings] = useState(false);
   const [showNikonSettings, setShowNikonSettings] = useState(false);

   // Measure canvas width
   useEffect(() => {
      const el = canvasRef.current;
      if (!el) return;
      const obs = new ResizeObserver(entries => {
         const w = entries[0]?.contentRect.width;
         if (w) setCanvasWidth(Math.max(w - 2, 300));
      });
      obs.observe(el);
      return () => obs.disconnect();
   }, []);

   // Load config
   useEffect(() => {
      fetch('/api/homepage')
         .then(r => r.json())
         .then(d => { if (d.config) setConfig(d.config); })
         .catch(() => { })
         .finally(() => setLoading(false));
   }, []);

   // Keyboard: Delete selected
   useEffect(() => {
      const handler = (e: KeyboardEvent) => {
         if (e.key === 'Delete' || e.key === 'Backspace') {
            const tag = (e.target as HTMLElement).tagName;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
            if (selectedId) deleteComponent(selectedId);
         }
         if (e.key === 'Escape') setSelectedId(null);
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [selectedId]);

   const showToast = (msg: string, ok = true) => {
      setToast({ msg, ok });
      setTimeout(() => setToast(null), 2500);
   };

   const patch = useCallback((fn: (prev: HomepageConfig) => HomepageConfig) => {
      setConfig(fn);
      setDirty(true);
   }, []);

   const addComponent = (type: ComponentType) => {
      const meta = COMPONENT_META[type];
      const maxY = config.components.reduce((m, c) => Math.max(m, c.layout.y + c.layout.h), 0);
      const id = `${type}-${Date.now()}`;
      const newComp: PageComponent = {
         id, type,
         layout: { ...meta.defaultLayout, y: maxY },
         props: JSON.parse(JSON.stringify(meta.defaultProps)),
      };
      patch(prev => ({ ...prev, components: [...prev.components, newComp] }));
      setSelectedId(id);
      setShowPageSettings(false);
   };

   const deleteComponent = (id: string) => {
      patch(prev => ({ ...prev, components: prev.components.filter(c => c.id !== id) }));
      if (selectedId === id) setSelectedId(null);
   };

   const updateProps = (id: string, props: AnyProps) => {
      patch(prev => ({ ...prev, components: prev.components.map(c => c.id === id ? { ...c, props } : c) }));
   };

   const handleLayoutChange = (layout: Layout) => {
      patch(prev => ({
         ...prev,
         components: prev.components.map(c => {
            const l = layout.find(x => x.i === c.id);
            if (!l) return c;
            return { ...c, layout: { ...c.layout, x: l.x, y: l.y, w: l.w, h: l.h } };
         }),
      }));
   };

   const save = async () => {
      setSaving(true);
      try {
         const res = await fetch('/api/homepage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config }) });
         if (!res.ok) throw new Error('Gagal');
         setDirty(false);
         showToast('Tersimpan ✓');
      } catch {
         showToast('Gagal menyimpan!', false);
      } finally { setSaving(false); }
   };

   const glLayouts: LayoutItem[] = config.components.map(c => ({
      i: c.id, x: c.layout.x, y: c.layout.y, w: c.layout.w, h: c.layout.h,
      minW: c.layout.minW, minH: c.layout.minH,
   }));

   const selectedComp = config.components.find(c => c.id === selectedId) ?? null;

   if (loading) return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
         <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-800" />
      </div>
   );

   return (
      <div className="h-screen flex flex-col bg-gray-100 text-gray-900 overflow-hidden">
         {/* ── Top bar ── */}
         <header className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-sm z-20">
            <div className="flex items-center gap-3">
               <Link href="/dashboard" className="text-gray-400 hover:text-gray-700 text-xs font-medium transition">← Dashboard</Link>
               <div className="w-px h-4 bg-gray-200" />
               <h1 className="font-bold text-sm">🎨 Editor Homepage Nikon</h1>
               {dirty && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">Ada perubahan</span>}
            </div>
            <div className="flex items-center gap-2">
               <button onClick={() => { setSelectedId(null); setShowPageSettings(s => !s); setShowNikonSettings(false); }} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${showPageSettings ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 hover:bg-gray-100'}`}>⚙️ Halaman</button>
               <button onClick={() => { setSelectedId(null); setShowNikonSettings(s => !s); setShowPageSettings(false); }} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${showNikonSettings ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 hover:bg-gray-100'}`}>🖥 Konten /nikon</button>
               <a href="/nikon" target="_blank" rel="noopener noreferrer" className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition">👁 Preview</a>
               <button onClick={save} disabled={saving || !dirty} className="bg-gray-900 hover:bg-gray-700 disabled:bg-gray-300 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition">
                  {saving ? '⏳ Menyimpan...' : '💾 Simpan'}
               </button>
            </div>
         </header>

         {/* ── Toast ── */}
         {toast && (
            <div className={`fixed top-16 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg text-xs font-bold ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
               {toast.msg}
            </div>
         )}

         <div className="flex flex-1 overflow-hidden">
            {/* ── Left palette ── */}
            <div className="w-44 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto">
               <div className="px-3 py-2.5 border-b border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Komponen</p>
               </div>
               <div className="p-2 space-y-1">
                  {(Object.keys(COMPONENT_META) as ComponentType[]).map(type => (
                     <button
                        key={type}
                        onClick={() => addComponent(type)}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2.5 hover:bg-gray-50 border border-transparent hover:border-gray-200 transition group"
                        title={`Klik untuk tambah ${COMPONENT_META[type].label}`}
                     >
                        <span className="text-base leading-none">{COMPONENT_META[type].icon}</span>
                        <span className="text-gray-700 group-hover:text-gray-900">{COMPONENT_META[type].label}</span>
                     </button>
                  ))}
               </div>
               {/* Layer list */}
               {config.components.length > 0 && (
                  <div className="mt-auto border-t border-gray-100">
                     <div className="px-3 py-2 border-b border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Layer ({config.components.length})</p>
                     </div>
                     <div className="p-1.5 space-y-0.5 max-h-48 overflow-y-auto">
                        {config.components.map(c => (
                           <button
                              key={c.id}
                              onClick={() => { setSelectedId(c.id); setShowPageSettings(false); }}
                              className={`w-full text-left px-2 py-1.5 rounded text-[11px] flex items-center gap-2 transition ${selectedId === c.id ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-gray-50 text-gray-600'}`}
                           >
                              <span>{COMPONENT_META[c.type].icon}</span>
                              <span className="truncate">{COMPONENT_META[c.type].label}</span>
                           </button>
                        ))}
                     </div>
                  </div>
               )}
            </div>

            {/* ── Canvas ── */}
            <div
               className="flex-1 overflow-auto"
               style={{ background: '#f0f2f5', backgroundImage: 'radial-gradient(circle, #c8c8c8 1px, transparent 1px)', backgroundSize: '20px 20px' }}
               onClick={(e) => { if (e.target === e.currentTarget) { setSelectedId(null); setShowPageSettings(false); } }}
            >
               <div className="p-6 min-h-full">
                  <div
                     ref={canvasRef}
                     onClick={() => { setSelectedId(null); setShowPageSettings(false); }}
                     style={{ backgroundColor: config.backgroundColor, minHeight: 400, width: '100%', position: 'relative', boxShadow: '0 2px 20px rgba(0,0,0,0.1)', borderRadius: 4 }}
                  >
                     {config.components.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 pointer-events-none select-none">
                           <span className="text-5xl mb-3">🖼️</span>
                           <p className="font-bold text-lg">Canvas kosong</p>
                           <p className="text-sm mt-1">Klik komponen di panel kiri untuk menambahkan</p>
                        </div>
                     )}
                     <GridLayout
                        layout={glLayouts}
                        cols={COLS}
                        rowHeight={ROW_HEIGHT}
                        width={canvasWidth}
                        onLayoutChange={handleLayoutChange}
                        isDraggable
                        isResizable
                        draggableHandle=".drag-handle"
                        resizeHandles={['se', 'sw', 'ne', 'nw', 'e', 'w', 's', 'n']}
                        margin={[0, 0]}
                        containerPadding={[0, 0]}
                        compactType={null}
                        preventCollision={false}
                     >
                        {config.components.map(comp => {
                           const isSelected = selectedId === comp.id;
                           return (
                              <div
                                 key={comp.id}
                                 onClick={(e) => { e.stopPropagation(); setSelectedId(comp.id); setShowPageSettings(false); }}
                                 style={{
                                    outline: isSelected ? '2px solid #3b82f6' : '1px solid transparent',
                                    outlineOffset: isSelected ? -2 : 0,
                                    cursor: 'pointer',
                                    position: 'relative',
                                    overflow: 'hidden',
                                 }}
                              >
                                 {/* Drag handle (top bar) */}
                                 <div className={`drag-handle absolute top-0 left-0 right-0 h-4 z-10 cursor-move flex items-center px-1.5 gap-1 ${isSelected ? 'bg-blue-500' : 'bg-transparent hover:bg-gray-400/30'} transition-colors`}>
                                    {isSelected && <>
                                       <span className="text-white text-[8px] leading-none select-none font-bold">⠿</span>
                                       <span className="text-white text-[8px] leading-none font-bold uppercase tracking-wider select-none">{COMPONENT_META[comp.type].icon} {COMPONENT_META[comp.type].label}</span>
                                    </>}
                                 </div>
                                 <div className="w-full h-full">
                                    <RenderComp comp={comp} isAdmin />
                                 </div>
                              </div>
                           );
                        })}
                     </GridLayout>
                  </div>
               </div>
            </div>

            {/* ── Right properties panel ── */}
            <div className="w-64 bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-y-auto">
               <div className="px-3 py-2.5 border-b border-gray-100 sticky top-0 bg-white z-10">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                     {showNikonSettings ? '🖥 Konten /nikon' : showPageSettings ? '⚙️ Halaman' : selectedComp ? 'Properti Komponen' : 'Properti'}
                  </p>
               </div>
               <div className="p-3">
                  {showNikonSettings ? (
                     <NikonSettingsPanel />
                  ) : showPageSettings ? (
                     <PageSettings config={config} onChange={patch => { setConfig(prev => ({ ...prev, ...patch })); setDirty(true); }} />
                  ) : selectedComp ? (
                     <PropsPanel comp={selectedComp} onChange={updateProps} onDelete={deleteComponent} />
                  ) : (
                     <div className="text-center text-gray-400 py-12">
                        <p className="text-2xl mb-2">👆</p>
                        <p className="text-xs">Klik komponen di canvas untuk edit properti</p>
                        <p className="text-xs mt-1">atau klik <strong>⚙️ Halaman</strong> di atas</p>
                     </div>
                  )}
               </div>
            </div>
         </div>

         {/* ── Tip bar ── */}
         <div className="bg-gray-900 text-gray-500 text-[10px] px-4 py-1 flex gap-4 shrink-0">
            <span>🖱 Drag untuk pindah</span>
            <span>↔ Tarik sudut untuk resize</span>
            <span>⌦ Delete/Backspace untuk hapus terpilih</span>
            <span>Esc untuk batal pilih</span>
         </div>
      </div>
   );
}
