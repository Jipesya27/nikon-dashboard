export interface Karyawan {
  id_karyawan?: string;
  username: string;
  nama_karyawan: string;
  role: string;
  status_aktif: boolean;
  akses_halaman: string[];
  nomor_wa?: string;
}

export interface SessionData {
  adminSession: string;
  karyawanIdentity: string;
  karyawan: Karyawan;
}

export interface RiwayatPesan {
  id_pesan?: string;
  nomor_wa: string;
  nama_profil_wa?: string;
  arah_pesan: 'IN' | 'OUT';
  isi_pesan: string;
  waktu_pesan: string;
  url_media?: string;
  jenis_pesan?: 'chat' | 'system' | 'bot';
  created_at?: string;
}

export interface Konsumen {
  nomor_wa: string;
  nama_lengkap: string;
  id_konsumen?: string;
}

export interface ContactThread {
  nomor_wa: string;
  nama: string;
  lastMessage: string;
  lastTime: string;
  unread?: boolean;
}

export interface EventRegistration {
  id: string;
  event_id?: string | null;
  event_name: string;
  nama_lengkap?: string;
  nomor_wa?: string;
  email?: string | null;
  tipe_kamera?: string | null;
  kabupaten_kotamadya?: string | null;
  payment_type?: 'regular' | 'deposit' | 'gratis';
  status_pendaftaran?: 'menunggu_validasi' | 'terdaftar' | 'ditolak';
  rejection_reason?: string | null;
  bukti_transfer_url?: string | null;
  ticket_url?: string | null;
  is_attended?: boolean;
  attended_at?: string | null;
  created_at?: string;
}
