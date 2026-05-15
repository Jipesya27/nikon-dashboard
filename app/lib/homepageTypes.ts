export type ComponentType = 'image' | 'label' | 'button' | 'hyperlink' | 'divider' | 'spacer' | 'hero';

export interface CompLayout {
   x: number; y: number; w: number; h: number;
   minW?: number; minH?: number;
}

export interface ImageProps {
   src: string; alt: string;
   objectFit: 'cover' | 'contain' | 'fill' | 'none';
   borderRadius: number;
}
export interface LabelProps {
   text: string; fontSize: string; fontWeight: string;
   color: string; align: 'left' | 'center' | 'right';
   italic: boolean; underline: boolean; lineHeight: string;
}
export interface ButtonProps {
   text: string; href: string;
   bgColor: string; textColor: string;
   borderRadius: number; fontSize: string;
   paddingX: number; paddingY: number;
   openNewTab: boolean;
}
export interface HyperlinkProps {
   text: string; href: string;
   color: string; fontSize: string; openNewTab: boolean;
}
export interface DividerProps {
   color: string; thickness: number;
   style: 'solid' | 'dashed' | 'dotted'; margin: number;
}
export interface SpacerProps { background: string; }
export interface HeroProps {
   title: string; subtitle: string;
   backgroundImage: string; backgroundColor: string;
   titleColor: string; subtitleColor: string;
   overlayColor: string; overlayOpacity: number;
   align: 'left' | 'center' | 'right';
   buttonText: string; buttonHref: string;
   buttonBgColor: string; buttonTextColor: string;
}
export type AnyProps = ImageProps | LabelProps | ButtonProps | HyperlinkProps | DividerProps | SpacerProps | HeroProps;

export interface PageComponent { id: string; type: ComponentType; layout: CompLayout; props: AnyProps; }

export interface HomepageConfig {
   pageTitle: string; pageDescription: string;
   backgroundColor: string; maxWidth: string;
   components: PageComponent[];
}

export const DEFAULT_CONFIG: HomepageConfig = {
   pageTitle: 'Alta Nikindo — Mitra Resmi Nikon Indonesia',
   pageDescription: 'Distributor resmi kamera Nikon di Indonesia. Claim promo, registrasi garansi, dan cek status service.',
   backgroundColor: '#111111',
   maxWidth: '1200px',
   components: [
      // ── Hero ──────────────────────────────────────────────────────
      {
         id: 'hero-main', type: 'hero',
         layout: { x: 0, y: 0, w: 12, h: 20, minW: 6, minH: 6 },
         props: {
            title: 'Alta Nikindo',
            subtitle: 'Mitra Resmi Nikon Indonesia\nLayanan Claim Promo · Garansi · Service Terpercaya',
            backgroundImage: '',
            backgroundColor: '#0a0a0a',
            titleColor: '#FFE500',
            subtitleColor: '#aaaaaa',
            overlayColor: '#000000', overlayOpacity: 0,
            align: 'center',
            buttonText: 'Chat via WhatsApp',
            buttonHref: 'https://wa.me/',
            buttonBgColor: '#FFE500',
            buttonTextColor: '#111111',
         } as HeroProps,
      },

      // ── "Layanan Kami" section ────────────────────────────────────
      { id: 'sp-1', type: 'spacer', layout: { x: 0, y: 20, w: 12, h: 2 }, props: { background: '#111111' } as SpacerProps },
      {
         id: 'lbl-section-title', type: 'label',
         layout: { x: 2, y: 22, w: 8, h: 3 },
         props: { text: 'Layanan Kami', fontSize: '30px', fontWeight: '700', color: '#ffffff', align: 'center', italic: false, underline: false, lineHeight: '1.4' } as LabelProps,
      },
      {
         id: 'lbl-section-sub', type: 'label',
         layout: { x: 2, y: 25, w: 8, h: 2 },
         props: { text: 'Semua kebutuhan purna jual Nikon Anda dalam satu tempat', fontSize: '15px', fontWeight: '400', color: '#888888', align: 'center', italic: false, underline: false, lineHeight: '1.5' } as LabelProps,
      },
      { id: 'div-accent', type: 'divider', layout: { x: 4, y: 27, w: 4, h: 1 }, props: { color: '#FFE500', thickness: 2, style: 'solid', margin: 0 } as DividerProps },
      { id: 'sp-2', type: 'spacer', layout: { x: 0, y: 28, w: 12, h: 2 }, props: { background: '#111111' } as SpacerProps },

      // ── Card 1: Claim Promo ───────────────────────────────────────
      {
         id: 'lbl-claim-title', type: 'label',
         layout: { x: 0, y: 30, w: 4, h: 2 },
         props: { text: '🎁  Claim Promo', fontSize: '20px', fontWeight: '700', color: '#FFE500', align: 'center', italic: false, underline: false, lineHeight: '1.4' } as LabelProps,
      },
      {
         id: 'lbl-claim-desc', type: 'label',
         layout: { x: 0, y: 32, w: 4, h: 5 },
         props: { text: 'Ajukan klaim promo pembelian kamera Nikon Anda. Nikmati cashback, aksesori gratis, dan hadiah eksklusif langsung dari Alta Nikindo.', fontSize: '14px', fontWeight: '400', color: '#bbbbbb', align: 'center', italic: false, underline: false, lineHeight: '1.7' } as LabelProps,
      },
      {
         id: 'btn-claim', type: 'button',
         layout: { x: 1, y: 37, w: 2, h: 2 },
         props: { text: 'Claim Sekarang', href: 'https://wa.me/', bgColor: '#FFE500', textColor: '#111111', borderRadius: 6, fontSize: '13px', paddingX: 16, paddingY: 10, openNewTab: false } as ButtonProps,
      },

      // ── Card 2: Garansi ───────────────────────────────────────────
      {
         id: 'lbl-garansi-title', type: 'label',
         layout: { x: 4, y: 30, w: 4, h: 2 },
         props: { text: '🛡️  Registrasi Garansi', fontSize: '20px', fontWeight: '700', color: '#FFE500', align: 'center', italic: false, underline: false, lineHeight: '1.4' } as LabelProps,
      },
      {
         id: 'lbl-garansi-desc', type: 'label',
         layout: { x: 4, y: 32, w: 4, h: 5 },
         props: { text: 'Daftarkan garansi resmi produk Nikon Anda dan dapatkan benefit layanan purna jual terbaik dari pusat service resmi Nikon.', fontSize: '14px', fontWeight: '400', color: '#bbbbbb', align: 'center', italic: false, underline: false, lineHeight: '1.7' } as LabelProps,
      },
      {
         id: 'btn-garansi', type: 'button',
         layout: { x: 5, y: 37, w: 2, h: 2 },
         props: { text: 'Daftar Garansi', href: 'https://wa.me/', bgColor: '#FFE500', textColor: '#111111', borderRadius: 6, fontSize: '13px', paddingX: 16, paddingY: 10, openNewTab: false } as ButtonProps,
      },

      // ── Card 3: Status Service ────────────────────────────────────
      {
         id: 'lbl-service-title', type: 'label',
         layout: { x: 8, y: 30, w: 4, h: 2 },
         props: { text: '🔧  Status Service', fontSize: '20px', fontWeight: '700', color: '#FFE500', align: 'center', italic: false, underline: false, lineHeight: '1.4' } as LabelProps,
      },
      {
         id: 'lbl-service-desc', type: 'label',
         layout: { x: 8, y: 32, w: 4, h: 5 },
         props: { text: 'Pantau perkembangan service kamera Nikon Anda secara real-time. Cukup kirim nomor tanda terima via WhatsApp.', fontSize: '14px', fontWeight: '400', color: '#bbbbbb', align: 'center', italic: false, underline: false, lineHeight: '1.7' } as LabelProps,
      },
      {
         id: 'btn-service', type: 'button',
         layout: { x: 9, y: 37, w: 2, h: 2 },
         props: { text: 'Cek Status', href: 'https://wa.me/', bgColor: '#FFE500', textColor: '#111111', borderRadius: 6, fontSize: '13px', paddingX: 16, paddingY: 10, openNewTab: false } as ButtonProps,
      },

      // ── Separator ─────────────────────────────────────────────────
      { id: 'sp-3', type: 'spacer', layout: { x: 0, y: 39, w: 12, h: 2 }, props: { background: '#111111' } as SpacerProps },
      { id: 'div-mid', type: 'divider', layout: { x: 0, y: 41, w: 12, h: 1 }, props: { color: '#2a2a2a', thickness: 1, style: 'solid', margin: 0 } as DividerProps },
      { id: 'sp-4', type: 'spacer', layout: { x: 0, y: 42, w: 12, h: 2 }, props: { background: '#111111' } as SpacerProps },

      // ── Hubungi Kami ──────────────────────────────────────────────
      {
         id: 'lbl-contact-title', type: 'label',
         layout: { x: 2, y: 44, w: 8, h: 3 },
         props: { text: 'Butuh Bantuan?', fontSize: '26px', fontWeight: '700', color: '#ffffff', align: 'center', italic: false, underline: false, lineHeight: '1.4' } as LabelProps,
      },
      {
         id: 'lbl-contact-hours', type: 'label',
         layout: { x: 2, y: 47, w: 8, h: 3 },
         props: { text: 'CS tersedia Senin–Jumat 10.00–16.00 WIB  ·  Sabtu 10.00–12.00 WIB', fontSize: '14px', fontWeight: '400', color: '#888888', align: 'center', italic: false, underline: false, lineHeight: '1.6' } as LabelProps,
      },
      {
         id: 'lbl-contact-addr', type: 'label',
         layout: { x: 2, y: 50, w: 8, h: 3 },
         props: { text: 'Nikon Pusat Service — Komplek Mangga Dua Square Blok H No.1-2, Jakarta Utara 14430', fontSize: '13px', fontWeight: '400', color: '#666666', align: 'center', italic: false, underline: false, lineHeight: '1.6' } as LabelProps,
      },
      {
         id: 'btn-wa-main', type: 'button',
         layout: { x: 3, y: 53, w: 6, h: 3 },
         props: { text: '💬  Chat WhatsApp CS', href: 'https://wa.me/', bgColor: '#25D366', textColor: '#ffffff', borderRadius: 8, fontSize: '16px', paddingX: 32, paddingY: 14, openNewTab: true } as ButtonProps,
      },

      // ── Footer ────────────────────────────────────────────────────
      { id: 'sp-footer', type: 'spacer', layout: { x: 0, y: 56, w: 12, h: 2 }, props: { background: '#111111' } as SpacerProps },
      { id: 'div-footer', type: 'divider', layout: { x: 0, y: 58, w: 12, h: 1 }, props: { color: '#222222', thickness: 1, style: 'solid', margin: 0 } as DividerProps },
      { id: 'sp-footer2', type: 'spacer', layout: { x: 0, y: 59, w: 12, h: 1 }, props: { background: '#111111' } as SpacerProps },
      {
         id: 'lbl-footer', type: 'label',
         layout: { x: 0, y: 60, w: 12, h: 2 },
         props: { text: '© 2026 PT. Alta Nikindo — Distributor Resmi Nikon Indonesia', fontSize: '12px', fontWeight: '400', color: '#444444', align: 'center', italic: false, underline: false, lineHeight: '1.5' } as LabelProps,
      },
      { id: 'sp-end', type: 'spacer', layout: { x: 0, y: 62, w: 12, h: 2 }, props: { background: '#111111' } as SpacerProps },
   ],
};

export const COMPONENT_META: Record<ComponentType, { label: string; icon: string; defaultLayout: CompLayout; defaultProps: AnyProps }> = {
   image: {
      label: 'Image', icon: '🖼️',
      defaultLayout: { x: 0, y: 0, w: 6, h: 8, minW: 2, minH: 2 },
      defaultProps: { src: '', alt: 'Gambar', objectFit: 'cover', borderRadius: 0 } as ImageProps,
   },
   label: {
      label: 'Label / Teks', icon: '✏️',
      defaultLayout: { x: 0, y: 0, w: 8, h: 3, minW: 2, minH: 1 },
      defaultProps: { text: 'Teks label baru', fontSize: '16px', fontWeight: 'normal', color: '#111111', align: 'left', italic: false, underline: false, lineHeight: '1.5' } as LabelProps,
   },
   button: {
      label: 'Button', icon: '🔲',
      defaultLayout: { x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      defaultProps: { text: 'Klik Saya', href: '#', bgColor: '#111111', textColor: '#ffffff', borderRadius: 6, fontSize: '14px', paddingX: 20, paddingY: 10, openNewTab: false } as ButtonProps,
   },
   hyperlink: {
      label: 'Hyperlink', icon: '🔗',
      defaultLayout: { x: 0, y: 0, w: 4, h: 1, minW: 2, minH: 1 },
      defaultProps: { text: 'Klik di sini', href: '#', color: '#2563eb', fontSize: '14px', openNewTab: false } as HyperlinkProps,
   },
   divider: {
      label: 'Divider', icon: '➖',
      defaultLayout: { x: 0, y: 0, w: 12, h: 1, minW: 4, minH: 1 },
      defaultProps: { color: '#e5e7eb', thickness: 1, style: 'solid', margin: 4 } as DividerProps,
   },
   spacer: {
      label: 'Spacer', icon: '⬜',
      defaultLayout: { x: 0, y: 0, w: 12, h: 3, minW: 2, minH: 1 },
      defaultProps: { background: 'transparent' } as SpacerProps,
   },
   hero: {
      label: 'Hero Banner', icon: '🌟',
      defaultLayout: { x: 0, y: 0, w: 12, h: 14, minW: 6, minH: 6 },
      defaultProps: {
         title: 'Selamat Datang di Alta Nikindo', subtitle: 'Mitra Resmi Nikon di Indonesia',
         backgroundImage: '', backgroundColor: '#111111',
         titleColor: '#ffffff', subtitleColor: '#cccccc',
         overlayColor: '#000000', overlayOpacity: 40,
         align: 'center',
         buttonText: 'Lihat Produk', buttonHref: '#',
         buttonBgColor: '#FFE500', buttonTextColor: '#111111',
      } as HeroProps,
   },
};
