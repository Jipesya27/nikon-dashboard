import React from 'react';
import Image from 'next/image';
import { Karyawan } from './index';

interface HeaderProps {
   sidebarOpen: boolean;
   setSidebarOpen: (open: boolean) => void;
   currentUser: Karyawan | null;
   handleLogout: () => void;
}

export default function Header({ sidebarOpen, setSidebarOpen, currentUser, handleLogout }: HeaderProps) {
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
         <div className="flex items-center gap-3">
            <div className="hidden md:block text-right">
               <span className="text-sm font-medium text-gray-400 block">Selamat datang,</span>
               <span className="text-sm font-bold text-[#FFE500]">{currentUser?.nama_karyawan}</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#FFE500] text-black font-bold flex items-center justify-center shadow-md text-sm">{currentUser?.nama_karyawan?.substring(0, 1).toUpperCase()}</div>
            <a href="/chatbot" aria-label="Buka Chatbot" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-all shadow-md">
               🤖
            </a>
            <button onClick={handleLogout} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-all shadow-sm">Logout</button>
         </div>
      </header>
   );
}