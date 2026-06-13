'use client';

import React from 'react';
import { RiwayatPesan, KonsumenData, Karyawan, PengaturanBot } from '@/app/index';

export interface MessagesTabProps {
  // Data
  uniqueContacts: RiwayatPesan[];
  filteredContacts: RiwayatPesan[];
  messages: RiwayatPesan[];
  currentChatThread: RiwayatPesan[];
  consumersList: KonsumenData[];
  currentUser: Karyawan | null;
  botSettings: PengaturanBot[];

  // Selection & navigation
  selectedWa: string | null;
  setSelectedWa: (wa: string | null) => void;

  // Search & filter
  searchChat: string;
  setSearchChat: (v: string) => void;
  chatFilter: 'all' | 'unread' | 'cs' | 'tagged' | 'pinned';
  setChatFilter: (f: 'all' | 'unread' | 'cs' | 'tagged' | 'pinned') => void;

  // Read status
  readStatus: Record<string, string>;
  setReadStatus: React.Dispatch<React.SetStateAction<Record<string, string>>>;

  // Tags & pins
  chatTags: Record<string, string>;
  setChatTags: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  pinnedChats: string[];
  setPinnedChats: React.Dispatch<React.SetStateAction<string[]>>;
  tagMenuFor: string | null;
  setTagMenuFor: (v: string | null) => void;

  // Chat pagination
  chatHasMore: Record<string, boolean>;
  chatLoadedCount: Record<string, number>;
  chatLoadingMore: boolean;
  setChatLoadingMore: (v: boolean) => void;

  // Reply & media
  replyText: string;
  setReplyText: (v: string) => void;
  replyToMessage: RiwayatPesan | null;
  setReplyToMessage: (v: RiwayatPesan | null) => void;
  quickReplyOpen: boolean;
  setQuickReplyOpen: (v: boolean) => void;
  quickReplyFilter: string;
  setQuickReplyFilter: (v: string) => void;
  mediaFile: File | null;
  setMediaFile: (v: File | null) => void;
  mediaPreview: string | null;
  setMediaPreview: (v: string | null) => void;
  isUploadingMedia: boolean;
  showSystemMessages: boolean;
  setShowSystemMessages: React.Dispatch<React.SetStateAction<boolean>>;
  showScrollToBottom: boolean;

  // Modals
  isNewChatModalOpen: boolean;
  setIsNewChatModalOpen: (v: boolean) => void;

  // Loading states
  isRefreshing: boolean;
  isSubmitting: boolean;

  // Refs
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  replyInputRef: React.RefObject<HTMLInputElement | null>;
  chatFileInputRef: React.RefObject<HTMLInputElement | null>;

  // Handlers
  getRealProfileName: (nomorWa: string | null) => string;
  fetchMessages: () => Promise<void>;
  fetchConsumers: () => Promise<void>;
  fetchContactHistory: (wa: string, offset?: number) => Promise<void>;
  handleRunCleanup: () => Promise<void>;
  handleSendReply: (e: React.FormEvent) => Promise<void>;
  handleMediaSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelesaiCS: (nomor_wa: string) => Promise<void>;
  openImageViewer: (urlOrFile: string | File) => void;
  isGoogleDriveLink: (url: string) => boolean;
  toDriveProxy: (url: string) => string;
  isImageUrl: (text: string) => boolean;
  scrollToBottom: () => void;
  sbWrite: (opts: {
    action: 'upsert';
    table: string;
    data: unknown;
    onConflict?: string;
  }) => Promise<{ error: { message: string } | null }>;
}

const TAG_PRESETS = [
  { key: '', label: '— Tidak ada —', dot: 'bg-gray-300', text: 'text-gray-700', bg: 'bg-gray-100' },
  { key: 'customer', label: 'Customer', dot: 'bg-green-500', text: 'text-green-800', bg: 'bg-green-100' },
  { key: 'lead', label: 'Lead', dot: 'bg-blue-500', text: 'text-blue-800', bg: 'bg-blue-100' },
  { key: 'vip', label: 'VIP', dot: 'bg-amber-500', text: 'text-amber-900', bg: 'bg-amber-100' },
  { key: 'support', label: 'Support', dot: 'bg-purple-500', text: 'text-purple-800', bg: 'bg-purple-100' },
  { key: 'followup', label: 'Follow-up', dot: 'bg-pink-500', text: 'text-pink-800', bg: 'bg-pink-100' },
  { key: 'resolved', label: 'Resolved', dot: 'bg-gray-400', text: 'text-gray-700', bg: 'bg-gray-200' },
];

export default function MessagesTab({
  uniqueContacts, filteredContacts, messages, currentChatThread, consumersList, currentUser, botSettings,
  selectedWa, setSelectedWa,
  searchChat, setSearchChat,
  chatFilter, setChatFilter,
  readStatus, setReadStatus,
  chatTags, setChatTags,
  pinnedChats, setPinnedChats,
  tagMenuFor, setTagMenuFor,
  chatHasMore, chatLoadedCount, chatLoadingMore, setChatLoadingMore,
  replyText, setReplyText,
  replyToMessage, setReplyToMessage,
  quickReplyOpen, setQuickReplyOpen,
  quickReplyFilter, setQuickReplyFilter,
  mediaFile, setMediaFile,
  mediaPreview, setMediaPreview,
  isUploadingMedia,
  showSystemMessages, setShowSystemMessages,
  showScrollToBottom,
  isNewChatModalOpen: _isNewChatModalOpen, setIsNewChatModalOpen,
  isRefreshing, isSubmitting,
  chatContainerRef, messagesEndRef, replyInputRef, chatFileInputRef,
  getRealProfileName,
  fetchMessages, fetchConsumers, fetchContactHistory,
  handleRunCleanup, handleSendReply, handleMediaSelect, handleSelesaiCS,
  openImageViewer, isGoogleDriveLink, toDriveProxy, isImageUrl,
  scrollToBottom, sbWrite,
}: MessagesTabProps) {
  const findTag = (key: string) => TAG_PRESETS.find(t => t.key === key);

  const countUnread = (wa: string) => {
    const isCs = !!uniqueContacts.find(c => c.nomor_wa === wa)?.bicara_dengan_cs;
    if (!isCs) return 0;
    const msgs = messages.filter(m => m.nomor_wa === wa && m.arah_pesan === 'IN');
    const lastRead = readStatus[wa] ? new Date(readStatus[wa]) : null;
    return msgs.filter(m => !lastRead || new Date(m.waktu_pesan || m.created_at!) > lastRead).length;
  };

  const getEffectiveTag = (wa: string, csMode: boolean) => {
    if (csMode && !chatTags[wa]) return 'followup';
    return chatTags[wa] || '';
  };

  const filterApply = filteredContacts.filter(c => {
    const eff = getEffectiveTag(c.nomor_wa, !!c.bicara_dengan_cs);
    if (chatFilter === 'all') return true;
    if (chatFilter === 'unread') return countUnread(c.nomor_wa) > 0;
    if (chatFilter === 'cs') return c.bicara_dengan_cs;
    if (chatFilter === 'tagged') return Boolean(eff);
    if (chatFilter === 'pinned') return pinnedChats.includes(c.nomor_wa);
    return true;
  });

  const sortedChats = [...filterApply].sort((a, b) => {
    const ap = pinnedChats.includes(a.nomor_wa) ? 1 : 0;
    const bp = pinnedChats.includes(b.nomor_wa) ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return new Date(b.waktu_pesan || b.created_at || 0).getTime() - new Date(a.waktu_pesan || a.created_at || 0).getTime();
  });

  const togglePin = (wa: string) => setPinnedChats(prev => prev.includes(wa) ? prev.filter(w => w !== wa) : [...prev, wa]);

  const setTag = (wa: string, key: string) => {
    setChatTags(prev => {
      const next = { ...prev };
      if (!key) delete next[wa]; else next[wa] = key;
      return next;
    });
    setTagMenuFor(null);
  };

  const totalUnread = uniqueContacts.reduce((sum, c) => sum + countUnread(c.nomor_wa), 0);
  const totalCS = uniqueContacts.filter(c => c.bicara_dengan_cs).length;
  const totalTagged = uniqueContacts.filter(c => getEffectiveTag(c.nomor_wa, !!c.bicara_dengan_cs)).length;

  return (
    <div className="animate-fade-in text-gray-900 h-full bg-white border-y border-gray-200 overflow-hidden flex">
      {/* SIDEBAR: DAFTAR CHAT */}
      <div className={`w-full md:w-80 border-r border-gray-200 flex flex-col bg-white shrink-0 ${selectedWa ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="px-4 py-3 bg-white border-b border-gray-200 flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-bold text-base text-gray-900">All chats</h3>
            <p className="text-[10px] text-gray-500">{uniqueContacts.length} percakapan • {totalUnread > 0 && <span className="text-blue-600 font-bold">{totalUnread} belum dibaca</span>}</p>
          </div>
          <div className="flex items-center gap-1">
            {totalUnread > 0 && (
              <button
                onClick={async () => {
                  const now = new Date().toISOString();
                  const allWa = uniqueContacts.map(c => c.nomor_wa);
                  const next: Record<string, string> = {};
                  allWa.forEach(wa => { next[wa] = now; });
                  setReadStatus(prev => ({ ...prev, ...next }));
                  if (currentUser?.id_karyawan) {
                    await sbWrite({
                      action: 'upsert',
                      table: 'chat_read_status',
                      data: allWa.map(wa => ({ id_karyawan: currentUser!.id_karyawan, nomor_wa: wa, last_read_at: now })),
                      onConflict: 'id_karyawan,nomor_wa',
                    }).catch(() => {});
                  }
                }}
                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                title="Tandai Semua Terbaca"
                aria-label="Tandai Semua Terbaca"
              >✓✓</button>
            )}
            <button onClick={() => { fetchMessages(); fetchConsumers(); }} disabled={isRefreshing} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Refresh" aria-label="Refresh">
              <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
            <button onClick={handleRunCleanup} disabled={isSubmitting} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Bersihkan Sesi" aria-label="Bersihkan Sesi">
              {isSubmitting ? '⏳' : '🧹'}
            </button>
            <button onClick={() => setIsNewChatModalOpen(true)} aria-label="Pesan Baru" title="Pesan Baru" className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition">
              <span className="text-sm font-bold">+</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5 bg-white shrink-0 border-b border-gray-100">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input type="text" title="Cari chat" aria-label="Cari chat" placeholder="Cari nama atau nomor..." value={searchChat} onChange={e => setSearchChat(e.target.value)} className="w-full border border-gray-200 bg-gray-50 rounded-lg pl-10 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FFE500] focus:bg-white transition" />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-2 py-2 bg-white border-b border-gray-100 shrink-0 overflow-x-auto">
          <div className="flex gap-1.5 min-w-max">
            {([
              { k: 'all',     l: 'Semua',         n: uniqueContacts.length },
              { k: 'unread',  l: 'Belum Dibaca',  n: totalUnread },
              { k: 'cs',      l: '🔴 CS Aktif',   n: totalCS },
              { k: 'tagged',  l: '🏷️ Bertag',     n: totalTagged },
              { k: 'pinned',  l: '📌 Pinned',     n: pinnedChats.length },
            ] as const).map(opt => {
              const active = chatFilter === opt.k;
              return (
                <button
                  key={opt.k}
                  onClick={() => setChatFilter(opt.k)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {opt.l} {opt.n > 0 && <span className={`ml-1 px-1.5 rounded-full ${active ? 'bg-white/20' : 'bg-white text-gray-700'}`}>{opt.n}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Contact List */}
        <div className="overflow-y-auto flex-1">
          {sortedChats.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2">📭</div>
              <p className="text-sm font-bold">Tidak ada chat</p>
              <p className="text-xs mt-1">Coba ubah filter atau search.</p>
            </div>
          )}
          {sortedChats.map((c: RiwayatPesan) => {
            const unread = countUnread(c.nomor_wa);
            const isNew = unread > 0;
            const profileName = getRealProfileName(c.nomor_wa);
            const tag = getEffectiveTag(c.nomor_wa, !!c.bicara_dengan_cs);
            const isPinned = pinnedChats.includes(c.nomor_wa);
            const isSelected = selectedWa === c.nomor_wa;
            const isResolved = tag === 'resolved';
            const isAssigned = c.bicara_dengan_cs;
            const msgTime = new Date(c.waktu_pesan || c.created_at || 0);
            const isToday = msgTime.toDateString() === new Date().toDateString();
            const timeStr = isToday
              ? msgTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
              : msgTime.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
            return (
              <div
                key={c.nomor_wa}
                onClick={() => setSelectedWa(c.nomor_wa)}
                className={`group flex items-start gap-3 px-4 py-3 cursor-pointer transition-all border-b border-gray-100 hover:bg-gray-50 ${isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
              >
                <div className="relative shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm uppercase shadow-sm ${isAssigned ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                    {profileName.substring(0, 2)}
                  </div>
                  {isPinned && <div className="absolute -top-1 -right-1 text-[10px]">📌</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-1">
                    <h4 className={`text-sm truncate ${isNew ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>{profileName}</h4>
                    <span className="text-[10px] text-gray-400 shrink-0">{timeStr}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 truncate">{c.nomor_wa}</p>
                  <p className={`text-xs truncate mt-0.5 ${isNew ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                    {c.arah_pesan === 'OUT' && <span className="text-gray-400 mr-1">↗</span>}
                    {c.isi_pesan}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[9px] text-gray-400 font-medium">Nikon Indonesia</span>
                    {isAssigned && !isResolved && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">CS Aktif</span>
                    )}
                    {isResolved && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">Resolved</span>
                    )}
                    {!isAssigned && !isResolved && tag && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${findTag(tag)?.bg} ${findTag(tag)?.text}`}>{findTag(tag)?.label}</span>
                    )}
                    {isNew && (
                      <span className="ml-auto bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">{unread}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className={`flex-1 flex flex-col bg-[#efeae2] relative min-w-0 ${selectedWa ? 'flex' : 'hidden md:flex'}`}>
        {selectedWa ? (() => {
          const isCsActive = !!uniqueContacts.find(c => c.nomor_wa === selectedWa)?.bicara_dengan_cs;
          const selectedTag = getEffectiveTag(selectedWa, isCsActive);
          const isPinned = pinnedChats.includes(selectedWa);
          return (
            <>
              <button
                onClick={() => setSelectedWa(null)}
                className="md:hidden fixed top-20 left-3 z-[200] flex items-center gap-1.5 bg-white/95 border border-gray-300 text-gray-800 text-sm font-semibold px-3 py-2 rounded-full shadow-lg backdrop-blur-sm active:scale-95 transition-transform"
                aria-label="Kembali ke daftar chat"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 12H5M12 5l-7 7 7 7"/>
                </svg>
                Kembali
              </button>

              <div className="px-4 py-2.5 bg-white border-b border-gray-200 flex justify-between items-center shrink-0 z-10">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button aria-label="Kembali" onClick={() => setSelectedWa(null)} className="md:hidden p-1 -ml-2 text-gray-700 hover:bg-gray-200 rounded-full transition shrink-0">
                    <span className="text-xl">←</span>
                  </button>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm uppercase shrink-0 ${isCsActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                    {getRealProfileName(selectedWa).substring(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">{getRealProfileName(selectedWa)}</h3>
                    <p className="text-[10px] text-gray-400">{selectedWa}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => togglePin(selectedWa)}
                    title={isPinned ? 'Unpin' : 'Pin'}
                    aria-label="Pin"
                    className={`p-1.5 rounded transition text-sm ${isPinned ? 'text-amber-600 bg-amber-50' : 'text-gray-400 hover:bg-gray-100'}`}
                  >📌</button>
                  <div className="relative">
                    <button onClick={() => setTagMenuFor(tagMenuFor === selectedWa ? null : selectedWa)} title="Tag" aria-label="Tag" className="p-1.5 rounded text-gray-400 hover:bg-gray-100 transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
                    </button>
                    {tagMenuFor === selectedWa && (
                      <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl p-1.5 space-y-0.5 z-20 min-w-40">
                        {TAG_PRESETS.map(t => (
                          <button key={t.key} onClick={() => setTag(selectedWa, t.key)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-gray-100 transition ${selectedTag === t.key ? 'bg-gray-100 font-bold' : ''}`}>
                            <span className={`w-2 h-2 rounded-full ${t.dot}`}></span>
                            <span className={t.text}>{t.label}</span>
                            {selectedTag === t.key && <span className="ml-auto">✓</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => setShowSystemMessages(v => !v)} title="Toggle sistem" aria-label="Toggle sistem" className={`p-1.5 rounded transition text-xs ${showSystemMessages ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:bg-gray-100'}`}>🤖</button>
                  {isCsActive && (
                    <button onClick={() => handleSelesaiCS(selectedWa)} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-600 transition flex items-center gap-1">
                      <span>✓</span> Selesai CS
                    </button>
                  )}
                  <button
                    onClick={() => { setTag(selectedWa, selectedTag === 'resolved' ? '' : 'resolved'); if (isCsActive) handleSelesaiCS(selectedWa); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${selectedTag === 'resolved' ? 'bg-gray-200 text-gray-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >{selectedTag === 'resolved' ? 'Reopen' : 'Resolve'}</button>
                </div>
              </div>

              <div ref={chatContainerRef} className="flex-1 px-4 py-5 overflow-y-auto space-y-1.5 relative scroll-smooth bg-white">
                {selectedWa && chatHasMore[selectedWa] && (
                  <div className="flex justify-center mb-1">
                    <button
                      onClick={async () => {
                        setChatLoadingMore(true);
                        await fetchContactHistory(selectedWa, chatLoadedCount[selectedWa] || 0);
                        setChatLoadingMore(false);
                      }}
                      disabled={chatLoadingMore}
                      className="bg-[#e9edef] text-gray-600 text-xs px-4 py-1.5 rounded-full shadow-sm hover:bg-gray-200 border border-gray-200 disabled:opacity-50 transition"
                    >
                      {chatLoadingMore ? '⏳ Memuat...' : '↑ Muat pesan lebih lama'}
                    </button>
                  </div>
                )}
                {currentChatThread.map((msg: RiwayatPesan, index: number) => (
                  msg.jenis_pesan === 'system' ? (
                    <div key={msg.id_pesan || index} className="flex justify-center">
                      <div className="bg-[#e9edef] text-gray-600 text-[11px] px-3 py-1 rounded-full shadow-sm max-w-[85%] text-center leading-relaxed">
                        <span className="mr-1 opacity-70">🤖</span>
                        <span>{msg.isi_pesan}</span>
                        <span className="ml-2 text-gray-500 text-[9px]">
                          {(() => { const d = new Date(msg.waktu_pesan || msg.created_at || 0); return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); })()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div key={msg.id_pesan || index} className={`group flex items-end gap-1 ${msg.arah_pesan === 'OUT' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] md:max-w-[72%] px-3 py-2 text-sm relative shadow-[0_1px_2px_rgba(0,0,0,0.13)] ${msg.arah_pesan === 'OUT' ? 'bg-[#dcf8c6] text-gray-900 rounded-t-2xl rounded-bl-2xl rounded-br-sm' : 'bg-white text-gray-900 rounded-t-2xl rounded-br-2xl rounded-bl-sm border border-gray-100'}`}>
                        <button
                          onClick={() => setReplyToMessage(msg)}
                          className={`absolute top-1 ${msg.arah_pesan === 'OUT' ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-gray-200`}
                          title="Balas" aria-label="Balas"
                        >
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v6M3 10l6 6M3 10l6-6" /></svg>
                        </button>
                        {msg.url_media ? (
                          <div>
                            <div className="cursor-pointer rounded-md overflow-hidden max-w-[260px]" onClick={() => openImageViewer(msg.url_media!)}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={isGoogleDriveLink(msg.url_media) ? toDriveProxy(msg.url_media) : msg.url_media}
                                alt="Media"
                                className="w-full max-h-64 object-cover rounded-md"
                                onLoad={scrollToBottom}
                                onError={e => { (e.target as HTMLImageElement).style.display='none'; }}
                              />
                            </div>
                            {msg.isi_pesan && !['[image]','[document]','[video]','[audio]'].includes(msg.isi_pesan) && (
                              <p className="text-xs mt-1 text-gray-600 italic">{msg.isi_pesan}</p>
                            )}
                          </div>
                        ) : isImageUrl(msg.isi_pesan) ? (
                          <div className="cursor-pointer rounded-md overflow-hidden max-w-[260px]" onClick={() => openImageViewer(msg.isi_pesan)}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={isGoogleDriveLink(msg.isi_pesan) ? toDriveProxy(msg.isi_pesan) : msg.isi_pesan} alt="Media" className="w-full max-h-64 object-cover rounded-md" onLoad={scrollToBottom} />
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap leading-relaxed font-medium">{msg.isi_pesan}</p>
                        )}
                        <div className="text-[10px] mt-1.5 text-right text-gray-400 select-none">
                          {(() => {
                            const d = new Date(msg.waktu_pesan || msg.created_at || 0);
                            return isNaN(d.getTime()) ? '-' : `${d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
                          })()}
                        </div>
                      </div>
                    </div>
                  )
                ))}
                <div ref={messagesEndRef} />
                {showScrollToBottom && (
                  <button
                    onClick={scrollToBottom}
                    className="sticky bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-md text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-white transition z-10"
                    aria-label="Scroll ke bawah"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                    Pesan terbaru
                  </button>
                )}
              </div>

              <div className="shrink-0">
                {replyToMessage && (
                  <div className="px-4 pt-3 pb-1 bg-gray-50 border-t border-gray-200 flex items-start gap-2">
                    <div className="flex-1 bg-white rounded-lg p-2.5 border-l-4 border-[#FFE500]">
                      <p className="text-[11px] font-bold text-[#b5880a]">
                        {replyToMessage.arah_pesan === 'OUT' ? 'Anda' : getRealProfileName(replyToMessage.nomor_wa)}
                      </p>
                      <p className="text-xs text-gray-600 truncate">{replyToMessage.isi_pesan.substring(0, 100)}</p>
                    </div>
                    <button aria-label="Tutup Balasan" onClick={() => setReplyToMessage(null)} className="text-gray-400 hover:text-gray-600 p-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                )}
              </div>

              <div className="shrink-0 relative">
                {quickReplyOpen && (() => {
                  const qrs = botSettings
                    .filter(b => b.nama_pengaturan?.startsWith('quick_reply:') && b.description)
                    .map(b => ({ shortcut: b.nama_pengaturan!.replace('quick_reply:', ''), text: b.description! }));
                  const defaultQr = [
                    { shortcut: 'halo', text: 'Halo! Terima kasih telah menghubungi Nikon Indonesia. Ada yang bisa saya bantu?' },
                    { shortcut: 'tunggu', text: 'Mohon tunggu sebentar, saya akan segera membantu Anda.' },
                    { shortcut: 'terima', text: 'Terima kasih sudah menghubungi kami. Semoga masalah Anda sudah teratasi. Sampai jumpa! 😊' },
                    { shortcut: 'jam', text: 'Jam operasional CS kami:\nSenin–Jumat: 10.00–16.00 WIB\nSabtu: 10.00–12.00 WIB' },
                  ];
                  const allQr = [...defaultQr, ...qrs];
                  const filtered = allQr.filter(q =>
                    !quickReplyFilter || q.shortcut.toLowerCase().includes(quickReplyFilter.toLowerCase()) || q.text.toLowerCase().includes(quickReplyFilter.toLowerCase())
                  );
                  if (!filtered.length) return null;
                  return (
                    <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-30 max-h-64 overflow-y-auto">
                      <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">⚡ Quick Reply</span>
                        <span className="text-[10px] text-gray-400">— ketik untuk filter</span>
                      </div>
                      {filtered.map((q, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => { setReplyText(q.text); setQuickReplyOpen(false); setQuickReplyFilter(''); setTimeout(() => replyInputRef.current?.focus(), 50); }}
                          className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition border-b border-gray-50 last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono">/{q.shortcut}</span>
                            <span className="text-xs text-gray-700 truncate">{q.text}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })()}

                <div className="shrink-0 bg-gray-50 border-t border-gray-100">
                  {mediaFile && (
                    <div className="px-4 pt-3 pb-1 flex items-start gap-3">
                      <div className="flex-1 bg-white rounded-xl border border-gray-200 p-2.5 flex items-center gap-3 shadow-sm">
                        {mediaPreview ? (
                          <img src={mediaPreview} alt="preview" className="w-14 h-14 object-cover rounded-lg shrink-0" />
                        ) : (
                          <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{mediaFile.name}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{(mediaFile.size / 1024).toFixed(0)} KB</p>
                        </div>
                        <button onClick={() => { setMediaFile(null); setMediaPreview(null); }} className="p-1 text-gray-400 hover:text-red-500 transition shrink-0" aria-label="Hapus file">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>
                  )}
                  <form onSubmit={handleSendReply} className="p-4 flex gap-2 items-center relative">
                    <input ref={chatFileInputRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={handleMediaSelect} />
                    <button type="button" onClick={() => chatFileInputRef.current?.click()} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition shrink-0" aria-label="Kirim file">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    </button>
                    <div className="flex-1 relative">
                      <input
                        ref={replyInputRef}
                        type="text"
                        value={replyText}
                        onChange={e => {
                          const val = e.target.value;
                          setReplyText(val);
                          if (val.startsWith('/')) {
                            setQuickReplyFilter(val.slice(1));
                            setQuickReplyOpen(true);
                          } else {
                            setQuickReplyOpen(false);
                            setQuickReplyFilter('');
                          }
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Escape') { setQuickReplyOpen(false); setQuickReplyFilter(''); }
                        }}
                        placeholder={mediaFile ? "Tambah keterangan (opsional)..." : "Ketik pesan... (/ untuk quick reply)"}
                        className="w-full border-none bg-white text-gray-900 rounded-full px-5 py-2.5 text-sm outline-none shadow-inner focus:ring-2 focus:ring-[#FFE500]"
                      />
                    </div>
                    <button type="submit" disabled={(!replyText.trim() && !mediaFile) || isUploadingMedia} className="bg-[#FFE500] hover:bg-[#E5CE00] text-black w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-50 transition shadow-md shrink-0" aria-label="Kirim">
                      {isUploadingMedia ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                      ) : (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </>
          );
        })() : (
          <div className="flex-1 flex flex-col justify-center items-center text-gray-500 bg-[#f0f2f5] p-10 text-center">
            <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center mb-5 shadow-md">
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="6" width="36" height="28" rx="6" fill="#e8edf5" stroke="#c5cfe0" strokeWidth="1.5"/>
                <rect x="12" y="18" width="36" height="28" rx="6" fill="#d6e0f0" stroke="#adbdd8" strokeWidth="1.5"/>
                <rect x="8" y="12" width="36" height="28" rx="6" fill="#fff" stroke="#b0bfd6" strokeWidth="1.5"/>
                <line x1="16" y1="21" x2="36" y2="21" stroke="#b0bfda" strokeWidth="1.8" strokeLinecap="round"/>
                <line x1="16" y1="26" x2="32" y2="26" stroke="#b0bfda" strokeWidth="1.8" strokeLinecap="round"/>
                <line x1="16" y1="31" x2="28" y2="31" stroke="#b0bfda" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800">Pilih Percakapan</h3>
            <p className="text-sm max-w-xs mt-2 text-gray-600">Pilih salah satu konsumen di sebelah kiri untuk mulai membalas pesan, beri tag, atau pin chat penting.</p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-md">
              {TAG_PRESETS.filter(t => t.key).map(t => (
                <span key={t.key} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${t.bg} ${t.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`}></span>
                  {t.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT INFO PANEL */}
      {selectedWa && (() => {
        const selConsumer = consumersList.find(k => k.nomor_wa === (selectedWa?.startsWith('62') ? '0' + selectedWa.slice(2) : selectedWa)) || consumersList.find(k => k.nomor_wa === selectedWa);
        const selContact = uniqueContacts.find(c => c.nomor_wa === selectedWa);
        const isCsPanel = !!selContact?.bicara_dengan_cs;
        const tagPanel = getEffectiveTag(selectedWa, isCsPanel);
        const tagInfoPanel = tagPanel ? findTag(tagPanel) : null;
        const firstMsg = messages.filter(m => m.nomor_wa === selectedWa).sort((a, b) => new Date(a.waktu_pesan || a.created_at || 0).getTime() - new Date(b.waktu_pesan || b.created_at || 0).getTime())[0];
        const lastMsg = selContact;
        return (
          <div className="hidden xl:flex w-72 border-l border-gray-200 flex-col bg-white shrink-0 overflow-y-auto">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm uppercase ${isCsPanel ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                  {getRealProfileName(selectedWa).substring(0, 2)}
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900">{getRealProfileName(selectedWa)}</p>
                  <p className="text-[10px] text-gray-400">{selectedWa}</p>
                </div>
              </div>
            </div>
            <div className="p-4 border-b border-gray-100">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Conversation details</p>
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] text-gray-400">Platform</p>
                  <p className="text-xs font-semibold text-gray-700">WhatsApp Business</p>
                  <p className="text-[10px] text-gray-500">Nikon Indonesia</p>
                </div>
                {firstMsg && (
                  <div>
                    <p className="text-[10px] text-gray-400">Created at</p>
                    <p className="text-xs text-gray-700">{new Date(firstMsg.waktu_pesan || firstMsg.created_at || 0).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                )}
                {lastMsg && (
                  <div>
                    <p className="text-[10px] text-gray-400">Last seen</p>
                    <p className="text-xs text-gray-700">{new Date(lastMsg.waktu_pesan || lastMsg.created_at || 0).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-gray-400">Session</p>
                  <p className={`text-xs font-semibold ${isCsPanel ? 'text-orange-500' : 'text-green-600'}`}>{isCsPanel ? '⚡ CS Active' : '● Open'}</p>
                </div>
              </div>
            </div>
            <div className="p-4 border-b border-gray-100">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {tagInfoPanel && tagInfoPanel.key ? (
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold ${tagInfoPanel.bg} ${tagInfoPanel.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${tagInfoPanel.dot}`}></span>
                    {tagInfoPanel.label}
                  </span>
                ) : (
                  <p className="text-[10px] text-gray-400 italic">Belum ada tag</p>
                )}
              </div>
              <div className="mt-2 relative">
                <button onClick={() => setTagMenuFor(tagMenuFor === `right_${selectedWa}` ? null : `right_${selectedWa}`)} className="text-[10px] text-blue-600 hover:underline">+ Tambah tag</button>
                {tagMenuFor === `right_${selectedWa}` && (
                  <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl p-1.5 space-y-0.5 z-20 w-40">
                    {TAG_PRESETS.map(t => (
                      <button key={t.key} onClick={() => { setTag(selectedWa, t.key); setTagMenuFor(null); }} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-gray-100 transition ${tagPanel === t.key ? 'font-bold' : ''}`}>
                        <span className={`w-2 h-2 rounded-full ${t.dot}`}></span>
                        <span className={t.text}>{t.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-b border-gray-100">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Assignees</p>
              {isCsPanel ? (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center uppercase">
                    {(currentUser?.nama_karyawan || 'CS').substring(0, 2)}
                  </div>
                  <p className="text-xs text-gray-700 font-medium">{currentUser?.nama_karyawan || 'CS'}</p>
                </div>
              ) : (
                <p className="text-[10px] text-gray-400 italic">Belum di-assign</p>
              )}
            </div>
            {selConsumer && (
              <div className="p-4">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Customer profile</p>
                <div className="space-y-1.5">
                  {selConsumer.nama_lengkap && <div><p className="text-[10px] text-gray-400">Nama</p><p className="text-xs text-gray-700">{selConsumer.nama_lengkap}</p></div>}
                  {selConsumer.nik && selConsumer.nik !== 'BELUM_DIISI' && <div><p className="text-[10px] text-gray-400">NIK</p><p className="text-xs text-gray-700">{selConsumer.nik}</p></div>}
                  {selConsumer.alamat_rumah && selConsumer.alamat_rumah !== 'BELUM_DIISI' && <div><p className="text-[10px] text-gray-400">Alamat</p><p className="text-xs text-gray-700 line-clamp-2">{selConsumer.alamat_rumah}</p></div>}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
