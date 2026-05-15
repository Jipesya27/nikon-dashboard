'use client';

import { useState, useEffect, useRef } from 'react';
import { KODEPOS_DB } from '@/app/lib/kodepos-db';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WilayahItem { id: string; nama: string; kodepos?: string }

export interface AddressValues {
  kelurahan: string;
  kecamatan: string;
  kabupaten_kotamadya: string;
  provinsi: string;
  kodepos: string;
}

interface AddressFieldsProps {
  values: AddressValues;
  onChange: (partial: Partial<AddressValues>) => void;
  required?: boolean;
  inputClassName?: string;
  labelClassName?: string;
}

// ─── Module-level API cache ───────────────────────────────────────────────────

const _cache = new Map<string, WilayahItem[]>();

async function fetchWilayah(url: string): Promise<WilayahItem[]> {
  if (_cache.has(url)) return _cache.get(url)!;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: WilayahItem[] = await res.json();
  _cache.set(url, data);
  return data;
}

const BASE = 'https://ibnux.github.io/data-indonesia';

// ─── Name normalizer (ALL CAPS from API → Title Case) ────────────────────────

const _upperWords = new Set(['DKI', 'DI', 'DIY', 'NTB', 'NTT', 'RI', 'KEPRI', 'UI', 'UGM', 'ITB']);

function normName(raw: string): string {
  return raw
    .trim()
    .replace(/^KAB\.\s*/i, 'Kabupaten ')
    .toLowerCase()
    .split(' ')
    .map(w => {
      const up = w.toUpperCase();
      if (_upperWords.has(up)) return up;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

function isEmpty(v: string | undefined | null): boolean {
  return !v || v === 'BELUM_DIISI' || v.trim() === '';
}

// ─── Combobox ─────────────────────────────────────────────────────────────────

interface ComboboxProps {
  id: string;
  label: string;
  value: string;
  options: WilayahItem[];
  onSelect: (item: WilayahItem) => void;
  onClear?: () => void;
  loading?: boolean;
  disabled?: boolean;
  required?: boolean;
  inputCls: string;
  labelCls: string;
}

function Combobox({
  id, label, value, options, onSelect, onClear,
  loading = false, disabled = false, required: req = false,
  inputCls, labelCls,
}: ComboboxProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayVal = isEmpty(value) ? '' : value;
  const filtered = query
    ? options.filter(o => o.nama.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Reset query when value changes from outside (e.g. kodepos auto-fill)
  useEffect(() => { setQuery(''); }, [value]);

  function handleFocus() { if (!disabled && !loading) setOpen(true); }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setOpen(true);
  }

  function handleSelect(item: WilayahItem) {
    onSelect(item);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleClear(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onClear?.();
    setQuery('');
    setOpen(false);
  }

  const inputValue = open ? query : displayVal;
  const placeholder = loading
    ? 'Memuat data...'
    : disabled
    ? '— pilih level di atas dulu —'
    : displayVal
    ? `${displayVal}`
    : 'Ketik untuk mencari...';

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={id} className={labelCls}>
        {label}{req && ' *'}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          aria-label={label}
          value={inputValue}
          placeholder={open ? 'Ketik untuk mencari...' : placeholder}
          onChange={handleInputChange}
          onFocus={handleFocus}
          disabled={disabled || loading}
          autoComplete="off"
          className={inputCls + (displayVal && !open ? ' pr-8' : '')}
        />
        {/* Clear button */}
        {displayVal && !req && onClear && (
          <button
            type="button"
            aria-label={`Hapus ${label}`}
            onMouseDown={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-lg leading-none"
          >
            ×
          </button>
        )}
        {/* Loading spinner */}
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 animate-pulse">
            ⟳
          </span>
        )}
      </div>

      {/* Dropdown */}
      {open && !disabled && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400 italic">
              {query ? `Tidak ditemukan: "${query}"` : 'Tidak ada pilihan'}
            </div>
          ) : (
            filtered.slice(0, 150).map(item => (
              <div
                key={item.id}
                onMouseDown={e => { e.preventDefault(); handleSelect(item); }}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-yellow-50 transition-colors ${
                  item.nama === displayVal ? 'bg-yellow-100 font-semibold text-black' : 'text-gray-800'
                }`}
              >
                {item.nama}
                {item.kodepos && (
                  <span className="ml-2 text-xs text-gray-400">{item.kodepos}</span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AddressFields({
  values,
  onChange,
  required = false,
  inputClassName = 'input-form',
  labelClassName = 'label-form',
}: AddressFieldsProps) {
  const [provId, setProvId] = useState('');
  const [kabId,  setKabId]  = useState('');
  const [kecId,  setKecId]  = useState('');

  const [provList, setProvList] = useState<WilayahItem[]>([]);
  const [kabList,  setKabList]  = useState<WilayahItem[]>([]);
  const [kecList,  setKecList]  = useState<WilayahItem[]>([]);
  const [kelList,  setKelList]  = useState<WilayahItem[]>([]);

  const [loadingProv, setLoadingProv] = useState(true);
  const [loadingKab,  setLoadingKab]  = useState(false);
  const [loadingKec,  setLoadingKec]  = useState(false);
  const [loadingKel,  setLoadingKel]  = useState(false);

  const [kodeposStatus, setKodeposStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [apiError, setApiError] = useState(false);

  // ── Load provinces once + try to init cascade from existing values ──────────
  useEffect(() => {
    fetchWilayah(`${BASE}/provinsi.json`)
      .then(data => {
        const normalized = data.map(d => ({ ...d, nama: normName(d.nama) }));
        setProvList(normalized);
        setLoadingProv(false);

        if (!isEmpty(values.provinsi)) {
          const match = normalized.find(
            p => p.nama.toLowerCase() === values.provinsi.toLowerCase()
          );
          if (match) cascadeFromProv(match, normalized, values);
        }
      })
      .catch(() => { setApiError(true); setLoadingProv(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cascadeFromProv(prov: WilayahItem, _pl: WilayahItem[], vals: AddressValues) {
    setProvId(prov.id);
    setLoadingKab(true);
    try {
      const kabs = (await fetchWilayah(`${BASE}/kabupaten/${prov.id}.json`))
        .map(d => ({ ...d, nama: normName(d.nama) }));
      setKabList(kabs);
      setLoadingKab(false);

      if (!isEmpty(vals.kabupaten_kotamadya)) {
        const match = kabs.find(
          k => k.nama.toLowerCase() === vals.kabupaten_kotamadya.toLowerCase()
        );
        if (match) await cascadeFromKab(match, vals);
      }
    } catch { setLoadingKab(false); }
  }

  async function cascadeFromKab(kab: WilayahItem, vals: AddressValues) {
    setKabId(kab.id);
    setLoadingKec(true);
    try {
      const kecs = (await fetchWilayah(`${BASE}/kecamatan/${kab.id}.json`))
        .map(d => ({ ...d, nama: normName(d.nama) }));
      setKecList(kecs);
      setLoadingKec(false);

      if (!isEmpty(vals.kecamatan)) {
        const match = kecs.find(
          k => k.nama.toLowerCase() === vals.kecamatan.toLowerCase()
        );
        if (match) await cascadeFromKec(match, vals);
      }
    } catch { setLoadingKec(false); }
  }

  async function cascadeFromKec(kec: WilayahItem, vals: AddressValues) {
    setKecId(kec.id);
    setLoadingKel(true);
    try {
      const kels = (await fetchWilayah(`${BASE}/kelurahan/${kec.id}.json`))
        .map(d => ({ ...d, nama: normName(d.nama) }));
      setKelList(kels);
      setLoadingKel(false);
    } catch { setLoadingKel(false); }
  }

  // ── Cascade handlers ─────────────────────────────────────────────────────

  const handleProvSelect = async (prov: WilayahItem) => {
    setProvId(prov.id);
    setKabId(''); setKecId('');
    setKabList([]); setKecList([]); setKelList([]);
    onChange({ provinsi: prov.nama, kabupaten_kotamadya: '', kecamatan: '', kelurahan: '', kodepos: '' });
    setKodeposStatus(null);

    setLoadingKab(true);
    try {
      const data = (await fetchWilayah(`${BASE}/kabupaten/${prov.id}.json`))
        .map(d => ({ ...d, nama: normName(d.nama) }));
      setKabList(data);
    } finally { setLoadingKab(false); }
  };

  const handleKabSelect = async (kab: WilayahItem) => {
    setKabId(kab.id); setKecId('');
    setKecList([]); setKelList([]);
    onChange({ kabupaten_kotamadya: kab.nama, kecamatan: '', kelurahan: '', kodepos: '' });
    setKodeposStatus(null);

    setLoadingKec(true);
    try {
      const data = (await fetchWilayah(`${BASE}/kecamatan/${kab.id}.json`))
        .map(d => ({ ...d, nama: normName(d.nama) }));
      setKecList(data);
    } finally { setLoadingKec(false); }
  };

  const handleKecSelect = async (kec: WilayahItem) => {
    setKecId(kec.id);
    setKelList([]);
    onChange({ kecamatan: kec.nama, kelurahan: '', kodepos: '' });
    setKodeposStatus(null);

    setLoadingKel(true);
    try {
      const data = (await fetchWilayah(`${BASE}/kelurahan/${kec.id}.json`))
        .map(d => ({ ...d, nama: normName(d.nama) }));
      setKelList(data);
    } finally { setLoadingKel(false); }
  };

  const handleKelSelect = (kel: WilayahItem) => {
    onChange({
      kelurahan: kel.nama,
      ...(kel.kodepos ? { kodepos: kel.kodepos } : {}),
    });
  };

  // ── Kodepos quick-fill ───────────────────────────────────────────────────

  const handleKodeposChange = (raw: string) => {
    const kp = raw.replace(/\D/g, '').slice(0, 5);
    onChange({ kodepos: kp });
    setKodeposStatus(null);

    if (kp.length === 5) {
      const db = KODEPOS_DB[kp];
      if (db) {
        onChange({
          kodepos: kp,
          provinsi: db.provinsi,
          kabupaten_kotamadya: db.kabupaten,
          kecamatan: db.kecamatan,
          kelurahan: db.kelurahan[0],
        });
        setKodeposStatus({ ok: true, msg: `✓ ${db.kelurahan[0]}, ${db.kecamatan}, ${db.kabupaten}` });

        // Also init cascade so dropdowns reflect the filled values
        const provMatch = provList.find(
          p => p.nama.toLowerCase() === db.provinsi.toLowerCase()
        );
        if (provMatch && provMatch.id !== provId) {
          cascadeFromProv(provMatch, provList, {
            ...values, kodepos: kp,
            provinsi: db.provinsi,
            kabupaten_kotamadya: db.kabupaten,
            kecamatan: db.kecamatan,
            kelurahan: db.kelurahan[0],
          });
        }
      }
    }
  };

  // ── Clear helpers ─────────────────────────────────────────────────────────

  const clearProv = () => {
    setProvId(''); setKabId(''); setKecId('');
    setKabList([]); setKecList([]); setKelList([]);
    onChange({ provinsi: '', kabupaten_kotamadya: '', kecamatan: '', kelurahan: '', kodepos: '' });
    setKodeposStatus(null);
  };
  const clearKab = () => {
    setKabId(''); setKecId('');
    setKecList([]); setKelList([]);
    onChange({ kabupaten_kotamadya: '', kecamatan: '', kelurahan: '', kodepos: '' });
    setKodeposStatus(null);
  };
  const clearKec = () => {
    setKecId('');
    setKelList([]);
    onChange({ kecamatan: '', kelurahan: '', kodepos: '' });
    setKodeposStatus(null);
  };
  const clearKel = () => {
    onChange({ kelurahan: '', kodepos: '' });
    setKodeposStatus(null);
  };

  // ── API error fallback ────────────────────────────────────────────────────

  if (apiError) {
    const fields: { key: keyof AddressValues; label: string }[] = [
      { key: 'kelurahan',          label: 'Kelurahan' },
      { key: 'kecamatan',          label: 'Kecamatan' },
      { key: 'kabupaten_kotamadya',label: 'Kabupaten / Kotamadya' },
      { key: 'provinsi',           label: 'Provinsi' },
      { key: 'kodepos',            label: 'Kode Pos' },
    ];
    return (
      <div className="space-y-3">
        <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">
          ⚠ Gagal memuat data wilayah dari server. Silakan isi manual.
        </p>
        {fields.map(f => (
          <div key={f.key}>
            <label htmlFor={`fallback-${f.key}`} className={labelClassName}>
              {f.label}{required && ' *'}
            </label>
            <input
              id={`fallback-${f.key}`}
              type="text"
              aria-label={f.label}
              value={isEmpty(values[f.key]) ? '' : values[f.key]}
              onChange={e => onChange({ [f.key]: e.target.value })}
              required={required}
              className={inputClassName}
            />
          </div>
        ))}
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Kode Pos — first so user can auto-fill everything by typing it */}
      <div>
        <label htmlFor="addr-kodepos" className={labelClassName}>
          Kode Pos{required && ' *'}
        </label>
        <input
          id="addr-kodepos"
          type="text"
          aria-label="Kode Pos"
          inputMode="numeric"
          value={isEmpty(values.kodepos) ? '' : values.kodepos}
          onChange={e => handleKodeposChange(e.target.value)}
          placeholder="Ketik 5 digit → semua bidang terisi otomatis"
          maxLength={5}
          pattern="[0-9]{5}"
          required={required}
          className={inputClassName}
        />
        {kodeposStatus && (
          <p className={`text-xs mt-1 ${kodeposStatus.ok ? 'text-green-700' : 'text-amber-600'}`}>
            {kodeposStatus.msg}
          </p>
        )}
      </div>

      {/* Provinsi */}
      <Combobox
        key="prov"
        id="addr-provinsi"
        label="Provinsi"
        value={isEmpty(values.provinsi) ? '' : values.provinsi}
        options={provList}
        onSelect={handleProvSelect}
        onClear={required ? undefined : clearProv}
        loading={loadingProv}
        required={required}
        inputCls={inputClassName}
        labelCls={labelClassName}
      />

      {/* Kabupaten / Kota */}
      <Combobox
        key={`kab-${provId}`}
        id="addr-kabupaten"
        label="Kabupaten / Kotamadya"
        value={isEmpty(values.kabupaten_kotamadya) ? '' : values.kabupaten_kotamadya}
        options={kabList}
        onSelect={handleKabSelect}
        onClear={required ? undefined : clearKab}
        loading={loadingKab}
        disabled={!provId && !loadingProv && kabList.length === 0}
        required={required}
        inputCls={inputClassName}
        labelCls={labelClassName}
      />

      {/* Kecamatan & Kelurahan side by side */}
      <div className="grid grid-cols-2 gap-3">
        <Combobox
          key={`kec-${kabId}`}
          id="addr-kecamatan"
          label="Kecamatan"
          value={isEmpty(values.kecamatan) ? '' : values.kecamatan}
          options={kecList}
          onSelect={handleKecSelect}
          onClear={required ? undefined : clearKec}
          loading={loadingKec}
          disabled={!kabId && kecList.length === 0}
          required={required}
          inputCls={inputClassName}
          labelCls={labelClassName}
        />
        <Combobox
          key={`kel-${kecId}`}
          id="addr-kelurahan"
          label="Kelurahan"
          value={isEmpty(values.kelurahan) ? '' : values.kelurahan}
          options={kelList}
          onSelect={handleKelSelect}
          onClear={required ? undefined : clearKel}
          loading={loadingKel}
          disabled={!kecId && kelList.length === 0}
          required={required}
          inputCls={inputClassName}
          labelCls={labelClassName}
        />
      </div>
    </div>
  );
}
