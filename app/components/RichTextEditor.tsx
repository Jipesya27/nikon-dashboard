'use client';
import { useEffect, useRef } from 'react';

const FONT_SIZES = [
  { label: 'Kecil', value: '1' },
  { label: 'Normal', value: '3' },
  { label: 'Besar', value: '5' },
  { label: 'Judul', value: '7' },
];

const COLORS = ['#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff'];

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Tulis deskripsi di sini...',
  minHeight = 160,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Set content only on mount; updates from parent don't overwrite mid-edit
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exec(cmd: string, val?: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val ?? undefined);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:border-gray-400 transition">
      {/* ─── Toolbar ─── */}
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-200">

        {/* Font size */}
        <select
          onMouseDown={e => e.preventDefault()}
          onChange={e => exec('fontSize', e.target.value)}
          defaultValue="3"
          className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-700 cursor-pointer hover:border-gray-400 transition"
        >
          {FONT_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <Sep />

        {/* Basic formatting */}
        <Btn onClick={() => exec('bold')} title="Bold"><b>B</b></Btn>
        <Btn onClick={() => exec('italic')} title="Italic"><i>I</i></Btn>
        <Btn onClick={() => exec('underline')} title="Underline"><u>U</u></Btn>
        <Btn onClick={() => exec('strikeThrough')} title="Strikethrough"><s>S</s></Btn>

        <Sep />

        {/* Lists */}
        <Btn onClick={() => exec('insertUnorderedList')} title="Bullet list">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/><circle cx="2" cy="6" r="1" fill="currentColor"/><circle cx="2" cy="12" r="1" fill="currentColor"/><circle cx="2" cy="18" r="1" fill="currentColor"/></svg>
        </Btn>
        <Btn onClick={() => exec('insertOrderedList')} title="Numbered list">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
        </Btn>

        <Sep />

        {/* Alignment */}
        <Btn onClick={() => exec('justifyLeft')} title="Rata kiri">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 6h18v2H3V6zm0 4h12v2H3v-2zm0 4h18v2H3v-2zm0 4h12v2H3v-2z"/></svg>
        </Btn>
        <Btn onClick={() => exec('justifyCenter')} title="Tengah">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 6h18v2H3V6zm3 4h12v2H6v-2zm-3 4h18v2H3v-2zm3 4h12v2H6v-2z"/></svg>
        </Btn>
        <Btn onClick={() => exec('justifyRight')} title="Rata kanan">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 6h18v2H3V6zm6 4h12v2H9v-2zm-6 4h18v2H3v-2zm6 4h12v2H9v-2z"/></svg>
        </Btn>

        <Sep />

        {/* Color swatches */}
        {COLORS.map(c => (
          <button
            key={c}
            type="button"
            title={`Warna teks: ${c}`}
            onMouseDown={e => { e.preventDefault(); exec('foreColor', c); }}
            className="w-4 h-4 rounded-sm border border-gray-300 hover:scale-110 transition shrink-0"
            style={{ background: c }}
          />
        ))}

        <Sep />

        {/* Clear */}
        <Btn onClick={() => exec('removeFormat')} title="Hapus format" extra="text-red-400 hover:text-red-600">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
        </Btn>
      </div>

      {/* ─── Editor area ─── */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={() => { if (editorRef.current) onChange(editorRef.current.innerHTML); }}
        className="w-full p-3 text-sm text-gray-800 focus:outline-none rich-editor-area"
        style={{ minHeight, lineHeight: 1.7 }}
      />
    </div>
  );
}

function Btn({ onClick, title, children, extra = '' }: {
  onClick: () => void; title: string; children: React.ReactNode; extra?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className={`px-1.5 py-1 text-xs rounded hover:bg-gray-200 text-gray-700 transition font-medium flex items-center justify-center ${extra}`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-4 bg-gray-200 mx-0.5 shrink-0" />;
}
