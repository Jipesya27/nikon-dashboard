export interface Karyawan {
  id_karyawan?: string;
  username: string;
  nama_karyawan: string;
  role: string;
  status_aktif: boolean;
  akses_halaman: string[];
  nomor_wa?: string;
}

export interface LoginTokens {
  adminSession: string;
  karyawanIdentity: string;
  maxAge: number;
}

export interface RiwayatPesan {
  id_pesan?: string;
  nomor_wa: string;
  nama_profil_wa: string;
  arah_pesan: 'IN' | 'OUT';
  isi_pesan: string;
  waktu_pesan: string;
  bicara_dengan_cs?: boolean;
  created_at?: string;
  url_media?: string;
  jenis_pesan?: 'chat' | 'system' | 'bot' | 'image' | 'video' | 'document' | 'audio';
}

export interface KonsumenData {
  nomor_wa: string;
  id_konsumen: string;
  nama_lengkap: string;
  status_langkah: string;
  alamat_rumah: string;
  created_at: string;
  nama_profil_wa?: string;
}

export interface ClaimPromo {
  id_claim?: string;
  nomor_wa: string;
  nomor_seri: string;
  tipe_barang: string;
  tanggal_pembelian: string;
  nama_toko?: string;
  jenis_promosi?: string;
  validasi_by_mkt: string;
  validasi_by_fa: string;
  catatan_mkt?: string;
  catatan_fa?: string;
  nama_jasa_pengiriman?: string;
  nomor_resi?: string;
  link_kartu_garansi?: string | null;
  link_nota_pembelian?: string | null;
  nama_pendaftar?: string | null;
  nama_penerima_claim?: string | null;
  alamat_pengiriman?: string | null;
  created_at?: string;
}

export interface Garansi {
  id_garansi?: string;
  nomor_wa?: string | null;
  nama_pendaftar?: string | null;
  nama_toko?: string | null;
  nomor_seri: string;
  tipe_barang: string;
  tanggal_pembelian?: string | null;
  status_validasi: string;
  jenis_garansi: string;
  lama_garansi: string;
  validasi_by_mkt?: string | null;
  catatan_mkt?: string | null;
  link_kartu_garansi?: string | null;
  link_nota_pembelian?: string | null;
  created_at?: string;
}

export interface StatusService {
  id_service?: string;
  nomor_tanda_terima: string;
  nomor_seri: string;
  status_service: string;
  created_at?: string;
}

export interface EventDataExtended {
  id?: string;
  event_title?: string;
  event_date?: string;
  event_time?: string;
  event_location?: string;
  event_price?: string;
  event_image?: string;
  event_partisipant_stock?: number;
  event_status?: string;
  event_description?: string;
  event_payment_tipe?: 'regular' | 'deposit' | 'gratis';
  event_speaker?: string;
  event_speaker_genre?: string;
  deposit_amount?: string;
  wa_group_link?: string;
  display_start_date?: string | null;
  registration_open_date?: string | null;
  registration_close_date?: string | null;
}

export interface EventRegistration {
  id?: string;
  event_id?: string | null;
  event_name: string;
  nama_lengkap?: string;
  nomor_wa?: string;
  email?: string | null;
  tipe_kamera?: string | null;
  payment_type?: 'regular' | 'deposit' | 'gratis';
  status_pendaftaran?: 'menunggu_validasi' | 'terdaftar' | 'ditolak';
  bukti_transfer_url?: string | null;
  ticket_url?: string | null;
  is_attended?: boolean;
  created_at?: string;
}

export interface ExpenseClaimItem {
  tanggal: string;
  description: string;
  nominal: number;
  receipt_url?: string;
}

export interface ExpenseClaim {
  id?: string;
  created_at?: string;
  created_by: string;
  nama_pembuat: string;
  from_person: string;
  to_person: string;
  claim_date: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  catatan?: string;
  items: ExpenseClaimItem[];
  total_nominal: number;
}

export interface PeminjamanBarang {
  id_peminjaman?: string;
  nomor_wa_peminjam: string;
  nama_peminjam: string;
  status_peminjaman: 'aktif' | 'partial' | 'selesai';
  tanggal_peminjaman?: string;
  tanggal_pengembalian?: string | null;
  tanggal_estimasi_pengembalian?: string | null;
  items_dipinjam: {
    nama_barang: string;
    nomor_seri: string;
    status_pengembalian: 'dipinjam' | 'dikembalikan';
  }[];
  created_at?: string;
}

export interface SbReadPayload {
  table: string;
  select?: string;
  filters?: { col: string; op: string; val: unknown }[];
  order?: { col: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  count?: boolean;
}

export interface SbWritePayload {
  action: 'insert' | 'update' | 'delete' | 'upsert';
  table: string;
  data?: Record<string, unknown> | Record<string, unknown>[];
  match?: Record<string, unknown>;
  onConflict?: string;
  select?: string;
}
