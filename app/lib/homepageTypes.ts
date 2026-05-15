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
   pageTitle: 'Alta Nikindo — Official Nikon Partner',
   pageDescription: 'Distributor resmi kamera Nikon di Indonesia.',
   backgroundColor: '#ffffff',
   maxWidth: '1200px',
   components: [],
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
