export interface Karyawan { id_karyawan?: string; username: string; password?: string; nama_karyawan: string; role: string; status_aktif: boolean; akses_halaman: string[]; created_at?: string; nomor_wa?: string; }
export interface KonsumenData { nomor_wa: string; id_konsumen: string; nama_lengkap: string; status_langkah: string; alamat_rumah: string; created_at: string; nik?: string; kelurahan?: string; kecamatan?: string; kabupaten_kotamadya?: string; provinsi?: string; kodepos?: string; }
export interface RiwayatPesan { id_pesan?: string; nomor_wa: string; nama_profil_wa: string; arah_pesan: 'IN' | 'OUT'; isi_pesan: string; waktu_pesan: string; bicara_dengan_cs?: boolean; created_at?: string; }
export interface ClaimPromo { id_claim?: string; nomor_wa: string; nomor_seri: string; tipe_barang: string; tanggal_pembelian: string; nama_toko?: string; jenis_promosi?: string; validasi_by_mkt: string; validasi_by_fa: string; catatan_mkt?: string; catatan_fa?: string; nama_jasa_pengiriman?: string; nomor_resi?: string; link_kartu_garansi?: string | File | null; link_nota_pembelian?: string | File | null; nomor_wa_update?: string | null; nama_pendaftar?: string | null; nama_penerima_claim?: string | null; alamat_pengiriman?: string | null; created_at?: string; }
export interface Garansi { id_garansi?: string; id_claim?: string | null; nomor_wa?: string | null; nomor_wa_update?: string | null; nama_pendaftar?: string | null; nama_toko?: string | null; nomor_seri: string; tipe_barang: string; tanggal_pembelian?: string | null; status_validasi: string; jenis_garansi: string; lama_garansi: string; validasi_by_mkt?: string | null; validasi_by_fa?: string | null; catatan_mkt?: string | null; catatan_fa?: string | null; link_kartu_garansi?: string | File | null; link_nota_pembelian?: string | File | null; created_at?: string; }
export interface Promosi { id_promo?: string; nama_promo: string; tipe_produk: { nama_produk: string }[]; tanggal_mulai: string; tanggal_selesai: string; status_aktif: boolean; created_at?: string; }
export interface PengaturanBot { id?: number; nama_pengaturan: string; url_file?: string; description?: string; created_at?: string; updated_at?: string; }
export interface StatusService { id_service?: string; nomor_tanda_terima: string; nomor_seri: string; status_service: string; created_at?: string; }
export interface BudgetItem { purpose: string; qty: number; cost_unit: number; value: number; petty_cash?: string; }
export interface BudgetApproval { id_budget?: string; proposal_no: string; title: string; period: string; objectives: string; detail_activity: string; expected_result: string; total_cost: number; budget_source: string; drafter_name: string; proposed_name?: string; mgt_name_1?: string; mgt_name_2?: string; mgt_name_3?: string; finance_name?: string; mgt_comment_1?: string; mgt_comment_2?: string; mgt_consent?: string; finance_consent?: string; items: BudgetItem[]; created_at?: string; attachment_urls?: (string | File | null)[]; }
export interface DataLog { id?: string; created_at?: string; user_name: string; action: string; table_name: string; record_id: string; old_values: Record<string, unknown>; new_values: Record<string, unknown>; }
export interface EventData { id?: string; title: string; date: string; price: string; image: string; stock: number; status: string; detail_acara: string; created_at?: string; bank_info?: string; }
export interface EventRegistration {
   id?: string;
   event_id?: string | null;
   event_name: string;
   nama_lengkap?: string;
   nomor_wa?: string;
   email?: string | null;
   tipe_kamera?: string | null;
   kabupaten_kotamadya?: string | null;
   payment_type?: 'regular' | 'deposit';
   status_pendaftaran?: 'menunggu_validasi' | 'terdaftar' | 'ditolak';
   rejection_reason?: string | null;
   bukti_transfer_url?: string | null;
   ticket_url?: string | null;
   is_attended?: boolean;
   attended_at?: string | null;
   attended_by?: string | null;
   nama_bank?: string | null;
   no_rekening?: string | null;
   nama_pemilik_rekening?: string | null;
   status_pengembalian_deposit?: string | null;
   bukti_pengembalian_deposit?: string | null;
   refund_requested_at?: string | null;
   created_at?: string;

   // Legacy fields (deprecated, kept for compat)
   full_name?: string;
   wa_number?: string;
   camera_model?: string;
   status?: string;
}

export interface BarangAset { id?: string; nama_barang_aset: string; no_seri_aset?: string; accs1?: string; accs2?: string; accs3?: string; accs4?: string; accs5?: string; accs6?: string; accs7?: string; catatan?: string; created_at?: string; }

export interface PeminjamanItem {
   nama_barang: string;
   nomor_seri: string;
   accs1?: string; accs2?: string; accs3?: string; accs4?: string;
   accs5?: string; accs6?: string; accs7?: string;
   catatan?: string;
   catatan_pengembalian?: string;
   catatan_admin?: string;
   status_pengembalian: 'dipinjam' | 'dikembalikan';
}
export interface PeminjamanBarang {
   id_peminjaman?: string;
   nomor_wa_peminjam: string;
   nama_peminjam: string;
   link_ktp_peminjam?: string | File | null;
   items_dipinjam: PeminjamanItem[];
   tanggal_peminjaman?: string;
   tanggal_pengembalian?: string | null;
   tanggal_estimasi_pengembalian?: string | null;
   reminder_sent_at?: string | null;
   status_peminjaman: 'aktif' | 'selesai';
   status_wa?: string;
   created_at?: string;
   updated_at?: string;
}
export interface EventDataExtended extends EventData {
   event_title?: string;
   event_date?: string;
   event_price?: string;
   event_image?: string;
   event_partisipant_stock?: number;
   event_status?: string;
   event_description?: string;
   event_payment_tipe?: 'regular' | 'deposit';
   event_speaker?: string;
   event_speaker_genre?: string;
   deposit_amount?: string;
}