'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Karyawan } from './index';

interface HeaderProps {
   sidebarOpen: boolean;
   setSidebarOpen: (open: boolean) => void;
   currentUser: Karyawan | null;
   handleLogout: () => void;
   onChangePassword: () => void;
   activeTabLabel?: string;
}

export default function Header({ sidebarOpen, setSidebarOpen, currentUser, handleLogout, onChangePassword, activeTabLabel }: HeaderProps) {
   const [menuOpen, setMenuOpen] = useState(false);
   const menuRef = useRef<HTMLDivElement>(null);

   useEffect(() => {
      function onClick(e: MouseEvent) {
         if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      }
      document.addEventListener('mousedown', onClick);
      return () => document.removeEventListener('mousedown', onClick);
   }, []);

   const initials = currentUser?.nama_karyawan?.substring(0, 2).toUpperCase() ?? '??';

   return (
      <header className="h-12 bg-white border-b border-gray-200 px-4 flex items-center gap-3 sticky top-0 z-30 shrink-0">
         {/* Mobile hamburger */}
         <button
            aria-label="Toggle Sidebar"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-1.5 -ml-1 rounded-md hover:bg-gray-100 transition-colors text-gray-500"
         >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={sidebarOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
            </svg>
         </button>

         {/* Active tab title */}
         <span className="text-sm font-semibold text-gray-800 flex-1">{activeTabLabel ?? 'Dashboard'}</span>

         {/* Chatbot link */}
         <Link
            href="/chatbot"
            target="_blank"
            rel="noopener noreferrer"
            title="Editor Teks Chatbot"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
         >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4-1-1z" />
            </svg>
            Bot
         </Link>

         {/* Avatar dropdown */}
         <div className="relative" ref={menuRef}>
            <button
               onClick={() => setMenuOpen(o => !o)}
               aria-label="Menu pengguna"
               aria-expanded={menuOpen}
               className="w-8 h-8 rounded-full bg-[#FFE500] text-black font-semibold flex items-center justify-center text-xs hover:ring-2 hover:ring-[#FFE500]/50 transition-all"
            >
               {initials}
            </button>

            {menuOpen && (
               <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden z-40">
                  <div className="px-4 py-3 border-b border-gray-100">
                     <p className="text-sm font-semibold text-gray-900 truncate">{currentUser?.nama_karyawan}</p>
                     <p className="text-xs text-gray-500 mt-0.5">{currentUser?.role}</p>
                  </div>
                  <div className="py-1">
                     <button
                        onClick={() => { onChangePassword(); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                     >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        Ganti password
                     </button>
                     <button
                        onClick={() => { handleLogout(); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                     >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                     </button>
                  </div>
               </div>
            )}
         </div>
      </header>
   );
}
