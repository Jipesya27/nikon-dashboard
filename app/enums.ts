/**
 * Central enum definitions untuk semua kolom dengan nilai terbatas.
 * Pastikan UI dropdown & DB CHECK constraint selalu sinkron dengan file ini.
 *
 * Format: setiap enum di-export sebagai (1) const array of {value, label}
 * untuk render di <select>, dan (2) TS string-literal type utk type-safety.
 */

// ============ VALIDASI (claim_promo + garansi) ============
export const VALIDASI_OPTIONS = [
  { value: 'Dalam Proses Verifikasi', label: 'Dalam Proses Verifikasi' },
  { value: 'Valid', label: 'Valid' },
  { value: 'Tidak Valid', label: 'Tidak Valid' },
  { value: 'HOLD', label: 'HOLD (Ditunda)' },
] as const;
export type ValidasiStatus = typeof VALIDASI_OPTIONS[number]['value'];

// ============ STATUS VALIDASI GARANSI (utama) ============
export const STATUS_VALIDASI_GARANSI_OPTIONS = [
  { value: 'Menunggu', label: 'Menunggu' },
  { value: 'Proses Validasi', label: 'Proses Validasi' },
  { value: 'Valid', label: 'Valid' },
  { value: 'Tidak Valid', label: 'Tidak Valid' },
] as const;
export type StatusValidasiGaransi = typeof STATUS_VALIDASI_GARANSI_OPTIONS[number]['value'];

// ============ JENIS GARANSI ============
export const JENIS_GARANSI_OPTIONS = [
  { value: 'Jasa 30%', label: 'Jasa 30%' },
  { value: 'Jasa 50%', label: 'Jasa 50%' },
  { value: 'Jasa 100%', label: 'Jasa 100%' },
  { value: 'Sparepart 30%', label: 'Sparepart 30%' },
  { value: 'Sparepart 50%', label: 'Sparepart 50%' },
  { value: 'Sparepart 100%', label: 'Sparepart 100%' },
  { value: 'Full', label: 'Full Coverage' },
] as const;
export type JenisGaransi = typeof JENIS_GARANSI_OPTIONS[number]['value'];

// ============ LAMA GARANSI ============
export const LAMA_GARANSI_OPTIONS = [
  { value: '6 Bulan', label: '6 Bulan' },
  { value: '1 Tahun', label: '1 Tahun' },
  { value: '2 Tahun', label: '2 Tahun' },
  { value: '3 Tahun', label: '3 Tahun' },
] as const;
export type LamaGaransi = typeof LAMA_GARANSI_OPTIONS[number]['value'];

// ============ STATUS SERVICE ============
export const STATUS_SERVICE_OPTIONS = [
  { value: 'Diterima', label: 'Diterima — Barang sudah diterima Pusat Service' },
  { value: 'Pengecekan oleh Teknisi', label: 'Pengecekan oleh Teknisi' },
  { value: 'Menunggu Sparepart', label: 'Menunggu Sparepart' },
  { value: 'Dalam Pengerjaan', label: 'Dalam Pengerjaan' },
  { value: 'Quality Check', label: 'Quality Check' },
  { value: 'Siap Diambil', label: 'Siap Diambil — Konsumen bisa ambil barang' },
  { value: 'Selesai', label: 'Selesai — Sudah diambil konsumen' },
  { value: 'Tidak Bisa Diperbaiki', label: 'Tidak Bisa Diperbaiki' },
  { value: 'Dibatalkan', label: 'Dibatalkan' },
] as const;
export type StatusService = typeof STATUS_SERVICE_OPTIONS[number]['value'];

// ============ JENIS PROMOSI ============
export const JENIS_PROMOSI_OPTIONS = [
  { value: 'Cashback', label: 'Cashback' },
  { value: 'Free Aksesori', label: 'Free Aksesori' },
  { value: 'Free Lensa', label: 'Free Lensa' },
  { value: 'Free Battery', label: 'Free Battery' },
  { value: 'Free Memory Card', label: 'Free Memory Card' },
  { value: 'Free Bag', label: 'Free Tas' },
  { value: 'Voucher Belanja', label: 'Voucher Belanja' },
  { value: 'Diskon Service', label: 'Diskon Service' },
  { value: 'Trade-in', label: 'Trade-in' },
  { value: 'Bundling', label: 'Bundling Paket' },
  { value: 'Lainnya', label: 'Lainnya (custom)' },
] as const;
export type JenisPromosi = typeof JENIS_PROMOSI_OPTIONS[number]['value'];

// ============ JASA PENGIRIMAN ============
export const JASA_PENGIRIMAN_OPTIONS = [
  { value: 'JNE', label: 'JNE' },
  { value: 'J&T Express', label: 'J&T Express' },
  { value: 'SiCepat', label: 'SiCepat' },
  { value: 'AnterAja', label: 'AnterAja' },
  { value: 'Tiki', label: 'TIKI' },
  { value: 'Pos Indonesia', label: 'Pos Indonesia' },
  { value: 'Ninja Xpress', label: 'Ninja Xpress' },
  { value: 'Lion Parcel', label: 'Lion Parcel' },
  { value: 'GoSend', label: 'GoSend (Same-day)' },
  { value: 'GrabExpress', label: 'GrabExpress (Same-day)' },
  { value: 'Kurir Sendiri', label: 'Diantar Kurir Sendiri' },
] as const;
export type JasaPengiriman = typeof JASA_PENGIRIMAN_OPTIONS[number]['value'];

// ============ EVENT STATUS ============
export const EVENT_STATUS_OPTIONS = [
  { value: 'In stock', label: 'Aktif (In stock)' },
  { value: 'Out of stock', label: 'Habis (Out of stock)' },
  { value: 'close', label: 'Tutup' },
] as const;
export type EventStatusEnum = typeof EVENT_STATUS_OPTIONS[number]['value'];

// ============ PAYMENT TYPE (event) ============
export const PAYMENT_TYPE_OPTIONS = [
  { value: 'regular', label: 'Regular (Non-refundable)' },
  { value: 'deposit', label: 'Deposit (Refundable setelah hadir)' },
] as const;
export type PaymentType = typeof PAYMENT_TYPE_OPTIONS[number]['value'];

// ============ STATUS PENDAFTARAN EVENT ============
export const STATUS_PENDAFTARAN_OPTIONS = [
  { value: 'menunggu_validasi', label: 'Menunggu Validasi' },
  { value: 'terdaftar', label: 'Terdaftar (Approved)' },
  { value: 'ditolak', label: 'Ditolak' },
] as const;
export type StatusPendaftaran = typeof STATUS_PENDAFTARAN_OPTIONS[number]['value'];

// ============ STATUS PENGEMBALIAN DEPOSIT ============
export const STATUS_REFUND_DEPOSIT_OPTIONS = [
  { value: 'Diminta', label: 'Diminta Peserta' },
  { value: 'Diproses', label: 'Sedang Diproses' },
  { value: 'Sudah Dikembalikan', label: 'Sudah Dikembalikan' },
  { value: 'Ditolak', label: 'Ditolak (Tidak hadir)' },
] as const;
export type StatusRefundDeposit = typeof STATUS_REFUND_DEPOSIT_OPTIONS[number]['value'];

// ============ STATUS PEMINJAMAN ============
export const STATUS_PEMINJAMAN_OPTIONS = [
  { value: 'aktif', label: 'Aktif' },
  { value: 'selesai', label: 'Selesai' },
] as const;
export type StatusPeminjaman = typeof STATUS_PEMINJAMAN_OPTIONS[number]['value'];

// ============ STATUS PENGEMBALIAN ITEM ============
export const STATUS_PENGEMBALIAN_ITEM_OPTIONS = [
  { value: 'dipinjam', label: 'Dipinjam' },
  { value: 'dikembalikan', label: 'Dikembalikan' },
] as const;
export type StatusPengembalianItem = typeof STATUS_PENGEMBALIAN_ITEM_OPTIONS[number]['value'];

// ============ ROLE KARYAWAN ============
export const ROLE_OPTIONS = [
  { value: 'Admin', label: 'Admin (Full access)' },
  { value: 'Customer Service', label: 'Customer Service' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Service', label: 'Service' },
  { value: 'Karyawan', label: 'Karyawan (Default)' },
] as const;
export type Role = typeof ROLE_OPTIONS[number]['value'];

// ============ BUDGET CONSENT (mgt & finance) ============
export const CONSENT_OPTIONS = [
  { value: '', label: '— Belum diisi —' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Pending Review', label: 'Pending Review' },
  { value: 'Need Revision', label: 'Need Revision' },
] as const;
export type Consent = typeof CONSENT_OPTIONS[number]['value'];

// ============ BUDGET SOURCE ============
export const BUDGET_SOURCE_OPTIONS = [
  { value: 'Marketing Budget', label: 'Marketing Budget' },
  { value: 'Operational Budget', label: 'Operational Budget' },
  { value: 'Event Budget', label: 'Event Budget' },
  { value: 'Service Budget', label: 'Service Budget' },
  { value: 'Other', label: 'Other (Lainnya)' },
] as const;
export type BudgetSource = typeof BUDGET_SOURCE_OPTIONS[number]['value'];

// ============ STATUS LANGKAH KONSUMEN (chatbot state) ============
export const STATUS_LANGKAH_OPTIONS = [
  { value: 'START', label: 'START (Menu Utama)' },
  { value: 'TALKING_TO_CS', label: 'TALKING_TO_CS (Bicara dgn CS)' },
  { value: 'MENUNGGU_UPLOAD_WEB', label: 'MENUNGGU_UPLOAD_WEB (Form Claim)' },
  { value: 'MENUNGGU_UPLOAD_GARANSI_WEB', label: 'MENUNGGU_UPLOAD_GARANSI_WEB (Form Garansi)' },
  { value: 'TANYA_UPDATE_WA', label: 'TANYA_UPDATE_WA' },
  { value: 'TANYA_UPDATE_WA_INPUT', label: 'TANYA_UPDATE_WA_INPUT' },
  { value: 'OFFER_GARANSI_AFTER_CLAIM', label: 'OFFER_GARANSI_AFTER_CLAIM' },
  { value: 'MENUNGGU_SERI_CLAIM', label: 'MENUNGGU_SERI_CLAIM (Cek Status)' },
  { value: 'MENUNGGU_SERI_GARANSI', label: 'MENUNGGU_SERI_GARANSI (Cek Status)' },
  { value: 'MENUNGGU_RESI_SERVICE', label: 'MENUNGGU_RESI_SERVICE (Cek Status)' },
] as const;
export type StatusLangkah = typeof STATUS_LANGKAH_OPTIONS[number]['value'];

// ============ NAMA BANK (statik enum) ============
export const NAMA_BANK_OPTIONS = [
  { value: 'BCA', label: 'BCA' },
  { value: 'Mandiri', label: 'Mandiri' },
  { value: 'BNI', label: 'BNI' },
  { value: 'BRI', label: 'BRI' },
  { value: 'CIMB Niaga', label: 'CIMB Niaga' },
  { value: 'Permata', label: 'Permata' },
  { value: 'Danamon', label: 'Danamon' },
  { value: 'BTN', label: 'BTN' },
  { value: 'Maybank', label: 'Maybank' },
  { value: 'OCBC NISP', label: 'OCBC NISP' },
  { value: 'Panin', label: 'Panin' },
  { value: 'Bank Mega', label: 'Bank Mega' },
  { value: 'Bank Syariah Indonesia', label: 'BSI (Bank Syariah Indonesia)' },
  { value: 'Bank Jago', label: 'Bank Jago' },
  { value: 'SeaBank', label: 'SeaBank' },
  { value: 'Blu by BCA Digital', label: 'Blu by BCA Digital' },
  { value: 'Jenius', label: 'Jenius (BTPN)' },
  { value: 'GoPay', label: 'GoPay (E-Wallet)' },
  { value: 'OVO', label: 'OVO (E-Wallet)' },
  { value: 'DANA', label: 'DANA (E-Wallet)' },
] as const;
export type NamaBank = typeof NAMA_BANK_OPTIONS[number]['value'];

// Helper untuk membuat dropdown component dgn options apapun di atas
export type EnumOption = { value: string; label: string };
