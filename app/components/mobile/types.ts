import type {
  Karyawan, KonsumenData, RiwayatPesan,
  ClaimPromo, Garansi, Promosi, StatusService,
  PeminjamanBarang, EventData, BudgetApproval,
} from '@/app/index';

// ── Screen IDs ───────────────────────────────────────────────────────────────
export type MobileScreen =
  | 'dashboard' | 'pesan' | 'konsumen'
  | 'klaim' | 'garansi' | 'service' | 'promo' | 'peminjaman'
  | 'bayar' | 'absensi' | 'infra'
  | 'form_klaim' | 'public_home';

// ── Drawer menu item ─────────────────────────────────────────────────────────
export interface DrawerItem {
  label: string;
  icon: string;
  screen: MobileScreen;
  badge?: number;
  group?: string;
}

// ── Bottom nav tab ───────────────────────────────────────────────────────────
export interface BottomTab {
  label: string;
  icon: string;
  screen: MobileScreen;
  badge?: number;
}

// ── All props passed from dashboard/page.tsx → MobileApp ────────────────────
export interface MobileAppProps {
  // Auth
  currentUser: Karyawan | null;
  isLoggedIn: boolean;
  loginForm: { username: string; password: string };
  setLoginForm: (f: { username: string; password: string }) => void;
  loginError: string;
  handleLogin: (e: React.FormEvent) => void;
  handleLogout: () => void;

  // Data
  claims: ClaimPromo[];
  setClaims: React.Dispatch<React.SetStateAction<ClaimPromo[]>>;
  warranties: Garansi[];
  setWarranties: React.Dispatch<React.SetStateAction<Garansi[]>>;
  promos: Promosi[];
  setPromos: React.Dispatch<React.SetStateAction<Promosi[]>>;
  services: StatusService[];
  setServices: React.Dispatch<React.SetStateAction<StatusService[]>>;
  lendingRecords: PeminjamanBarang[];
  setLendingRecords: React.Dispatch<React.SetStateAction<PeminjamanBarang[]>>;
  consumersList: KonsumenData[];
  messages: RiwayatPesan[];
  events: EventData[];
  budgets: BudgetApproval[];
  consumers: Record<string, string>; // nomor_wa → nama

  // Helpers
  getClaimStatusColor: (c: ClaimPromo) => string;
  getBadgeLabel: (color: string) => string;
  formatTglBeli: (val?: string) => string;
  formatSubmitDate: (createdAt?: string) => string;
  handleKirimStatusClaim: (c: ClaimPromo) => void;
  handlePrintLabelPengiriman: (c: ClaimPromo) => void;
  openModal: (mode: string, type: string, data?: unknown) => void;
  handleDelete: (type: string, id: string) => void;
  openImageViewer: (urlOrFile: string | File) => void;
  isGoogleDriveLink: (url: string) => boolean;
  sbWrite: (opts: { action: string; table: string; data?: Record<string, unknown>; match?: Record<string, unknown> }) => Promise<unknown>;
}
