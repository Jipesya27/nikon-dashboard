'use client';
import { use, useEffect, useState } from 'react';

type InvoiceOrder = {
  id: string;
  created_at: string;
  nama_pembeli: string;
  nomor_wa: string;
  alamat: string;
  kodepos?: string;
  nama_barang_snapshot: string;
  harga_promo_snapshot: number;
  harga_transfer: number;
  kode_unik: number;
  status: string;
  bukti_transfer_url?: string;
  nota_kamera_url?: string;
  garansi_kamera_url?: string;
  invoice_token: string;
  promo_datacolor_items?: {
    kode_barang: string;
    promo_datacolor?: {
      judul: string;
      tanggal_mulai?: string;
      tanggal_berakhir?: string;
    };
  };
};

function fmtRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function fmtDatetime(d: string) {
  return new Date(d).toLocaleString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }) + ' WIB';
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  menunggu_pembayaran: { label: 'Menunggu Pembayaran', color: '#f59e0b' },
  menunggu_verifikasi: { label: 'Menunggu Verifikasi', color: '#3b82f6' },
  diproses: { label: 'Sedang Diproses', color: '#8b5cf6' },
  dikirim: { label: 'Dikirim', color: '#06b6d4' },
  selesai: { label: 'Selesai', color: '#22c55e' },
  dibatalkan: { label: 'Dibatalkan', color: '#ef4444' },
};

export default function InvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [order, setOrder] = useState<InvoiceOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/promo/invoice/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setNotFound(true);
        else setOrder(d.order);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Memuat invoice...</p>
      </div>
    </div>
  );

  if (notFound || !order) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Invoice Tidak Ditemukan</h2>
        <p className="text-gray-500 text-sm">Token tidak valid atau invoice sudah tidak tersedia.</p>
      </div>
    </div>
  );

  const status = STATUS_MAP[order.status] || { label: order.status, color: '#6b7280' };
  const item = order.promo_datacolor_items;
  const promo = item?.promo_datacolor;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 print:bg-white print:py-0">
      <div className="max-w-2xl mx-auto">
        {/* Print button */}
        <div className="flex justify-end mb-4 print:hidden gap-2">
          <button onClick={() => window.print()}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition shadow-sm">
            🖨️ Cetak Invoice
          </button>
          <a href="/promo"
            className="flex items-center gap-2 bg-[#FFE500] text-black text-sm font-semibold px-4 py-2 rounded-lg hover:bg-yellow-300 transition shadow-sm">
            ← Kembali
          </a>
        </div>

        {/* Invoice Card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden print:shadow-none print:rounded-none">
          {/* Header */}
          <div className="bg-black text-white px-6 py-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-[#FFE500] rounded-lg flex items-center justify-center">
                    <span className="text-black font-black text-base">N</span>
                  </div>
                  <div>
                    <p className="font-black text-base leading-none">Alta Nikindo</p>
                    <p className="text-white/50 text-[11px]">altanikindo.com</p>
                  </div>
                </div>
                <h1 className="text-xl font-black uppercase tracking-wide">E-Invoice</h1>
                {promo && <p className="text-white/60 text-xs mt-1">{promo.judul}</p>}
              </div>
              <div className="text-right">
                <div className="inline-block px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: status.color + '22', color: status.color, border: `1px solid ${status.color}44` }}>
                  {status.label}
                </div>
                <p className="text-white/40 text-[10px] mt-2 font-mono">#{order.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-white/40 text-[10px]">{fmtDatetime(order.created_at)}</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 space-y-6">
            {/* Pembeli info */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Section title="Data Pembeli">
                <Field label="Nama" value={order.nama_pembeli} />
                <Field label="WhatsApp" value={order.nomor_wa} />
                <Field label="Alamat" value={order.alamat} />
                {order.kodepos && <Field label="Kode Pos" value={order.kodepos} />}
              </Section>
              <Section title="Informasi Order">
                <Field label="No. Invoice" value={'#' + order.id.slice(0, 8).toUpperCase()} mono />
                <Field label="Tanggal" value={fmtDatetime(order.created_at)} />
                {item?.kode_barang && <Field label="Kode Barang" value={item.kode_barang} mono />}
                <Field label="Status" value={status.label} style={{ color: status.color }} />
              </Section>
            </div>

            {/* Item table */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Rincian Produk</p>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Produk</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Harga Promo</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{order.nama_barang_snapshot}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">{fmtRp(order.harga_promo_snapshot)}</td>
                    </tr>
                    <tr className="border-t border-gray-50 bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-400 text-sm">Kode Unik Pembayaran</td>
                      <td className="px-4 py-3 text-right text-blue-600 font-semibold">+Rp {order.kode_unik}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-black text-white">
                      <td className="px-4 py-3.5 font-black text-sm">TOTAL TRANSFER</td>
                      <td className="px-4 py-3.5 text-right font-black text-[#FFE500] text-base">{fmtRp(order.harga_transfer)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Transfer info box */}
            {order.status === 'menunggu_pembayaran' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Instruksi Pembayaran</p>
                <p className="text-sm text-amber-800 leading-relaxed">
                  Mohon transfer sebesar <span className="font-black">{fmtRp(order.harga_transfer)}</span> ke rekening resmi Alta Nikindo.
                  Kode unik <span className="font-black">+Rp {order.kode_unik}</span> digunakan untuk memverifikasi pembayaran Anda.
                  Setelah transfer, upload bukti di halaman promo dengan menggunakan link order Anda.
                </p>
              </div>
            )}

            {order.status === 'menunggu_verifikasi' && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Bukti Transfer Diterima</p>
                <p className="text-sm text-blue-800">Kami sedang memverifikasi pembayaran Anda. Proses verifikasi biasanya memakan waktu 1×24 jam di hari kerja.</p>
              </div>
            )}

            {order.status === 'selesai' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1">✓ Order Selesai</p>
                <p className="text-sm text-green-800">Terima kasih! Order Anda telah diproses dan dikirim. Selamat menikmati produk Datacolor Anda.</p>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-dashed border-gray-200 pt-4">
              <p className="text-center text-[11px] text-gray-400 leading-relaxed">
                Dokumen ini adalah bukti pemesanan resmi dari <span className="font-semibold">PT. Alta Nikindo</span>.<br />
                Untuk pertanyaan, hubungi kami melalui WhatsApp di halaman{' '}
                <a href="https://altanikindo.com" className="text-blue-500 hover:underline">altanikindo.com</a>.
              </p>
              <p className="text-center text-[10px] text-gray-300 mt-2 font-mono">{order.invoice_token}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs mt-6 print:hidden">
          © 2025 PT. Alta Nikindo · Distributor Resmi Nikon Indonesia
        </p>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:py-0 { padding-top: 0 !important; padding-bottom: 0 !important; }
        }
      `}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Field({ label, value, mono, style }: { label: string; value: string; mono?: boolean; style?: React.CSSProperties }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-400 w-24 shrink-0">{label}</span>
      <span className={`text-gray-800 font-medium flex-1 ${mono ? 'font-mono text-xs' : ''}`} style={style}>{value}</span>
    </div>
  );
}
