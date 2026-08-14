'use client';

import React from 'react';
import { ClaimPromo, Garansi, Promosi, EventData } from '@/app/index';

export interface AutocompleteItem {
  id: string;
  field_key: string;
  value: string;
  hidden: boolean;
}

const AC_FIELDS = [
  { key: 'tipe_barang', label: 'Tipe Barang', hint: 'Model kamera, lensa, aksesori' },
  { key: 'jenis_promosi', label: 'Jenis Promosi', hint: 'Opsi promosi di form claim (dropdown)' },
  { key: 'nama_toko', label: 'Nama Toko / Dealer', hint: 'Nama toko resmi & tidak resmi' },
  { key: 'nama_promo', label: 'Nama Promo', hint: 'Nama program promo aktif' },
  { key: 'speaker', label: 'Speaker Event', hint: 'Nama pembicara event' },
];

export interface AutocompleteTabProps {
  autocompleteItems: AutocompleteItem[];
  acFieldTab: string;
  setAcFieldTab: (v: string) => void;
  acNewValue: string;
  setAcNewValue: (v: string) => void;
  acSaving: boolean;
  handleACAdd: (fieldKey: string, val: string, hidden?: boolean) => Promise<void> | void;
  handleACDelete: (id: string) => void;
  claims: ClaimPromo[];
  warranties: Garansi[];
  promos: Promosi[];
  events: EventData[];
}

export default function AutocompleteTab({
  autocompleteItems,
  acFieldTab,
  setAcFieldTab,
  acNewValue,
  setAcNewValue,
  acSaving,
  handleACAdd,
  handleACDelete,
  claims,
  warranties,
  promos,
  events,
}: AutocompleteTabProps) {
  const activeField = AC_FIELDS.find(f => f.key === acFieldTab) || AC_FIELDS[0];
  const pinnedItems = autocompleteItems.filter(i => i.field_key === acFieldTab && !i.hidden);
  const hiddenItems = autocompleteItems.filter(i => i.field_key === acFieldTab && i.hidden);
  const inTableSet = new Set(autocompleteItems.filter(i => i.field_key === acFieldTab).map(i => i.value));

  const rawDBMap: Record<string, (string | null | undefined)[]> = {
    tipe_barang: [...claims.map(c => c.tipe_barang), ...warranties.map(w => w.tipe_barang)],
    jenis_promosi: claims.map(c => c.jenis_promosi),
    nama_toko: claims.map(c => c.nama_toko),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nama_promo: promos.map((p: any) => p.nama_promo),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    speaker: events.map((e: any) => e.event_speaker),
  };
  const dbOnlyValues = Array.from(new Set((rawDBMap[acFieldTab] || []).filter((v): v is string => {
    if (typeof v !== 'string' || !v || v === 'BELUM_DIISI') return false;
    return !inTableSet.has(v);
  }))).sort();

  return (
    <div className="space-y-5 animate-fade-in text-gray-900">
      <div>
        <p className="text-sm text-gray-500 mb-3">Kelola saran isian (autocomplete) untuk kolom form. Tambah saran tetap, atau sembunyikan data yang tidak relevan.</p>
        <div className="flex flex-wrap gap-2">
          {AC_FIELDS.map(f => (
            <button key={f.key} onClick={() => { setAcFieldTab(f.key); setAcNewValue(''); }}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold border transition ${acFieldTab === f.key ? 'bg-[#FFE500] border-yellow-400 text-black' : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
        <div>
          <p className="text-xs text-gray-400 mb-1">{activeField.hint}</p>
          <div className="flex gap-2">
            <input
              type="text"
              aria-label="Tambah saran baru"
              placeholder={`Tambah saran untuk ${activeField.label}...`}
              value={acNewValue}
              onChange={e => setAcNewValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleACAdd(acFieldTab, acNewValue); }}
              className="flex-1 p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#FFE500]"
            />
            <button
              onClick={() => handleACAdd(acFieldTab, acNewValue)}
              disabled={acSaving || !acNewValue.trim()}
              className="px-4 py-2 bg-[#FFE500] hover:bg-yellow-400 text-black text-sm font-bold rounded-lg disabled:opacity-40 transition">
              {acSaving ? '...' : '+ Tambah'}
            </button>
          </div>
        </div>

        {pinnedItems.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Saran Tetap (ditambahkan admin)</p>
            <div className="space-y-1">
              {pinnedItems.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <span className="text-sm font-medium text-gray-800">{item.value}</span>
                  <button onClick={() => handleACDelete(item.id)} className="text-xs text-red-500 hover:text-red-700 font-semibold shrink-0">Hapus</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {dbOnlyValues.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Dari Data ({dbOnlyValues.length})</p>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {dbOnlyValues.map(val => (
                <div key={val} className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                  <span className="text-sm text-gray-700">{val}</span>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleACAdd(acFieldTab, val, false)} className="text-xs text-blue-600 hover:text-blue-800 font-semibold">Pin</button>
                    <button onClick={() => handleACAdd(acFieldTab, val, true)} className="text-xs text-orange-500 hover:text-orange-700 font-semibold">Sembunyikan</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {hiddenItems.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Disembunyikan</p>
            <div className="space-y-1">
              {hiddenItems.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg opacity-70">
                  <span className="text-sm line-through text-gray-500">{item.value}</span>
                  <button onClick={() => handleACDelete(item.id)} className="text-xs text-green-600 hover:text-green-800 font-semibold shrink-0">Tampilkan</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {pinnedItems.length === 0 && dbOnlyValues.length === 0 && hiddenItems.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">Belum ada data untuk kolom ini.</p>
        )}
      </div>
    </div>
  );
}
