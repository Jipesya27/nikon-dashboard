'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
   HomepageConfig, PageComponent, DEFAULT_CONFIG,
   ImageProps, LabelProps, ButtonProps, HyperlinkProps,
   DividerProps, SpacerProps, HeroProps,
} from '../lib/homepageTypes';

const ROW_HEIGHT = 30;

function RenderComp({ comp }: { comp: PageComponent }) {
   const { type, props } = comp;

   switch (type) {
      case 'image': {
         const p = props as ImageProps;
         if (!p.src) return (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-sm">
               🖼️ Belum ada gambar
            </div>
         );
         return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
               src={p.src} alt={p.alt}
               style={{ width: '100%', height: '100%', objectFit: p.objectFit, borderRadius: p.borderRadius, display: 'block' }}
            />
         );
      }
      case 'label': {
         const p = props as LabelProps;
         return (
            <p style={{
               fontSize: p.fontSize, fontWeight: p.fontWeight as React.CSSProperties['fontWeight'],
               color: p.color, textAlign: p.align,
               fontStyle: p.italic ? 'italic' : 'normal',
               textDecoration: p.underline ? 'underline' : 'none',
               lineHeight: p.lineHeight, margin: 0, padding: '4px',
               whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
               {p.text}
            </p>
         );
      }
      case 'button': {
         const p = props as ButtonProps;
         return (
            <div className="w-full h-full flex items-center">
               <a
                  href={p.href}
                  target={p.openNewTab ? '_blank' : undefined}
                  rel={p.openNewTab ? 'noopener noreferrer' : undefined}
                  style={{
                     display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                     backgroundColor: p.bgColor, color: p.textColor,
                     borderRadius: p.borderRadius, fontSize: p.fontSize,
                     padding: `${p.paddingY}px ${p.paddingX}px`,
                     textDecoration: 'none', fontWeight: 'bold', cursor: 'pointer',
                     whiteSpace: 'nowrap',
                  }}
               >
                  {p.text}
               </a>
            </div>
         );
      }
      case 'hyperlink': {
         const p = props as HyperlinkProps;
         return (
            <div className="w-full h-full flex items-center">
               <a
                  href={p.href}
                  target={p.openNewTab ? '_blank' : undefined}
                  rel={p.openNewTab ? 'noopener noreferrer' : undefined}
                  style={{ color: p.color, fontSize: p.fontSize, textDecoration: 'underline' }}
               >
                  {p.text}
               </a>
            </div>
         );
      }
      case 'divider': {
         const p = props as DividerProps;
         return (
            <div className="w-full h-full flex items-center">
               <hr style={{ width: '100%', border: 'none', borderTop: `${p.thickness}px ${p.style} ${p.color}`, margin: `${p.margin}px 0` }} />
            </div>
         );
      }
      case 'spacer': {
         const p = props as SpacerProps;
         return <div style={{ width: '100%', height: '100%', background: p.background === 'transparent' ? undefined : p.background }} />;
      }
      case 'hero': {
         const p = props as HeroProps;
         const justifyMap = { left: 'flex-start', center: 'center', right: 'flex-end' };
         return (
            <div style={{
               width: '100%', height: '100%', position: 'relative',
               background: p.backgroundImage ? `url(${p.backgroundImage}) center/cover no-repeat` : p.backgroundColor,
               display: 'flex', alignItems: 'center',
               justifyContent: justifyMap[p.align],
               padding: '32px 48px',
            }}>
               {(p.backgroundImage || p.overlayOpacity > 0) && (
                  <div style={{ position: 'absolute', inset: 0, backgroundColor: p.overlayColor, opacity: p.overlayOpacity / 100 }} />
               )}
               <div style={{ position: 'relative', zIndex: 1, textAlign: p.align, maxWidth: '640px' }}>
                  {p.title && <h1 style={{ color: p.titleColor, fontSize: 'clamp(1.5rem,4vw,2.75rem)', fontWeight: 'bold', margin: '0 0 12px' }}>{p.title}</h1>}
                  {p.subtitle && <p style={{ color: p.subtitleColor, fontSize: 'clamp(0.9rem,2vw,1.2rem)', margin: '0 0 24px', lineHeight: 1.6 }}>{p.subtitle}</p>}
                  {p.buttonText && (
                     <a href={p.buttonHref} style={{ display: 'inline-block', backgroundColor: p.buttonBgColor, color: p.buttonTextColor, padding: '12px 28px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', fontSize: '16px' }}>
                        {p.buttonText}
                     </a>
                  )}
               </div>
            </div>
         );
      }
      default: return null;
   }
}

export default function NikonHomepage() {
   const [config, setConfig] = useState<HomepageConfig | null>(null);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      fetch('/api/homepage')
         .then(r => r.json())
         .then(d => setConfig(d.config || DEFAULT_CONFIG))
         .catch(() => setConfig(DEFAULT_CONFIG))
         .finally(() => setLoading(false));
   }, []);

   if (loading) {
      return (
         <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-800" />
         </div>
      );
   }

   const cfg = config || DEFAULT_CONFIG;

   // Sort components by their top-left position for rendering order
   const sorted = [...cfg.components].sort((a, b) => a.layout.y !== b.layout.y ? a.layout.y - b.layout.y : a.layout.x - b.layout.x);

   // Calculate total height of canvas
   const totalRows = sorted.reduce((max, c) => Math.max(max, c.layout.y + c.layout.h), 0);
   const canvasHeight = totalRows * ROW_HEIGHT;

   return (
      <div style={{ backgroundColor: cfg.backgroundColor, minHeight: '100vh' }}>
         {/* SEO / meta via dynamic title */}
         {typeof document !== 'undefined' && (document.title = cfg.pageTitle)}

         <main style={{ maxWidth: cfg.maxWidth, margin: '0 auto', position: 'relative', height: canvasHeight || '100vh' }}>
            {sorted.map(comp => (
               <div
                  key={comp.id}
                  style={{
                     position: 'absolute',
                     left: `${(comp.layout.x / 12) * 100}%`,
                     top: comp.layout.y * ROW_HEIGHT,
                     width: `${(comp.layout.w / 12) * 100}%`,
                     height: comp.layout.h * ROW_HEIGHT,
                     overflow: 'hidden',
                  }}
               >
                  <RenderComp comp={comp} />
               </div>
            ))}
         </main>

         {/* Admin link (small, unobtrusive) */}
         <div className="fixed bottom-4 right-4 z-50">
            <Link
               href="/admin/homepage"
               className="bg-black/70 hover:bg-black text-white text-xs font-bold px-3 py-2 rounded-lg shadow-lg transition opacity-60 hover:opacity-100"
            >
               ✏️ Edit
            </Link>
         </div>
      </div>
   );
}
