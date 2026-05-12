'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Karyawan } from './index';

interface HeaderProps {
   sidebarOpen: boolean;
   setSidebarOpen: (open: boolean) => void;
   currentUser: Karyawan | null;
   handleLogout: () => void;
}

const EXTERNAL_PAGES = [
   { href: '/admin/events', label: 'Admin Events', icon: '📅' },
   { href: '/admin/events/attendance', label: 'Kehadiran Event', icon: '📋' },
   { href: '/admin/events/deposit', label: 'Deposit & Refund', icon: '💰' },
   { href: '/claim', label: 'Form Claim (Publik)', icon: '🎫' },
   { href: '/garansi', label: 'Form Garansi (Publik)', icon: '🛡️' },
];

export default function Header({ sidebarOpen, setSidebarOpen, currentUser, handleLogout }: HeaderProps) {
   const [linksOpen, setLinksOpen] = useState(false);
   const linksRef = useRef<HTMLDivElement>(null);

   useEffect(() => {
      function onClick(e: MouseEvent) {
         if (linksRef.current && !linksRef.current.contains(e.target as Node)) setLinksOpen(false);
      }
      document.addEventListener('mousedown', onClick);
      return () => document.removeEventListener('mousedown', onClick);
   }, []);

   return (
      <header className="bg-linear-to-r from-gray-900 via-gray-800 to-gray-900 shadow-lg border-b-4 border-[#FFE500] px-4 md:px-6 py-4 flex justify-between items-center text-white sticky top-0 z-30">
         <div className="flex items-center gap-3 md:gap-4">
            <button aria-label="Toggle Sidebar" onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-1.5 rounded-lg hover:bg-gray-700 transition-colors">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} /></svg>
            </button>
            <div className="shadow-lg rounded-lg overflow-hidden">
               <Image src="/nikon-logo.svg" alt="Nikon" width={100} height={40} className="h-10 w-auto" />
            </div>
            <div>
               <h1 className="text-lg font-bold tracking-wide">Alta Nikindo</h1>
               <p className="text-xs text-gray-400 font-medium">Role: <span className="text-[#FFE500] font-bold">{currentUser?.role}</span></p>
            </div>
         </div>
         <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden lg:block text-right mr-1">
               <span className="text-sm font-medium text-gray-400 block">Selamat datang,</span>
               <span className="text-sm font-bold text-[#FFE500]">{currentUser?.nama_karyawan}</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#FFE500] text-black font-bold flex items-center justify-center shadow-md text-sm">{currentUser?.nama_karyawan?.substring(0, 1).toUpperCase()}</div>

            {/* Quick links dropdown ke halaman eksternal */}
            <div className="relative" ref={linksRef}>
               <button
                  onClick={() => setLinksOpen(o => !o)}
                  aria-label="Halaman Lain"
                  aria-expanded={linksOpen}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-1"
               >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
                  <span className="hidden md:inline">Halaman</span>
               </button>
               {linksOpen && (
                  <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden text-gray-800 z-40">
                     <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Buka Halaman Lain</p>
                     </div>
                     <div className="py-1">
                        {EXTERNAL_PAGES.map(p => (
                           <Link key={p.href} href={p.href} target="_blank" rel="noopener noreferrer" onClick={() => setLinksOpen(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 transition-colors group">
                              <span className="text-lg">{p.icon}</span>
                              <span className="text-sm font-semibold flex-1">{p.label}</span>
                              <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                           </Link>
                        ))}
                     </div>
                  </div>
               )}
            </div>

            <a href="/chatbot" aria-label="Buka Chatbot" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-all shadow-md">
               🤖
            </a>
            <button onClick={handleLogout} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-all shadow-sm">Logout</button>
         </div>
      </header>
   );
}