'use client';

import { useFirebase } from "@/lib/FirebaseProvider";
import { LogIn, LogOut, User as UserIcon, ChevronDown, Brain } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import SafeImage from "@/components/SafeImage";
import Link from "next/link";

export function UserNav() {
  const { user, login, logout, authLoading, isLoggingIn, userRole } = useFirebase();
  const [isOpen, setIsOpen] = useState(false);
  const [showLoginOptions, setShowLoginOptions] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [selectedMode, setSelectedMode] = useState<'MEMBER' | 'ADMIN' | null>(null);

  if (authLoading) {
    return (
      <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse" />
    );
  }

  if (!user) {
    if (showLoginOptions) {
      return (
        <div className="flex flex-col gap-2 bg-white p-3 rounded-2xl shadow-xl border border-slate-100 min-w-[240px]">
          {!selectedMode ? (
            <>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1">ជ្រើសរើសប្រភេទគណនី</p>
              <button
                onClick={() => login('MEMBER')}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <UserIcon className="w-4 h-4" />
                </div>
                ចូលជាសមាជិក (Member)
              </button>
              <button
                onClick={() => setSelectedMode('ADMIN')}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                  <UserIcon className="w-4 h-4" />
                </div>
                អ្នកគ្រប់គ្រង (Admin)
              </button>
              <button 
                onClick={() => setShowLoginOptions(false)}
                className="text-[10px] text-slate-400 font-bold uppercase mt-1 hover:text-slate-600 transition-colors"
              >
                បោះបង់ (Cancel)
              </button>
            </>
          ) : (
            <div className="p-1 space-y-3">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest px-1">បញ្ចូលលេខកូដអ្នកគ្រប់គ្រង</p>
              <input 
                type="password"
                placeholder="លេខកូដ (Admin Code)"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-all font-mono"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => login('ADMIN', adminCode)}
                  className="flex-1 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all"
                >
                  យល់ព្រម
                </button>
                <button
                  onClick={() => {
                    setSelectedMode(null);
                    setAdminCode('');
                  }}
                  className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
                >
                  ត្រឡប់ក្រោយ
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        onClick={() => setShowLoginOptions(true)}
        disabled={isLoggingIn}
        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-bold shadow-lg shadow-slate-900/20"
      >
        {isLoggingIn ? (
          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        ) : (
          <LogIn className="w-4 h-4" />
        )}
        {isLoggingIn ? 'កំពុងបញ្ចូល...' : 'ចូលគណនី (Sign In)'}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 transition-all shadow-sm"
      >
        {user.photoURL ? (
          <div className="w-8 h-8 rounded-xl overflow-hidden relative">
            <SafeImage src={user.photoURL} alt={user.displayName || ""} fill className="object-cover" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-blue-600" />
          </div>
        )}
        <div className="hidden md:block text-left px-1">
          <p className="text-xs font-bold text-slate-800 truncate max-w-[120px]">
            {user.displayName || user.email}
          </p>
          {userRole === 'ADMIN' && (
            <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest leading-none mt-0.5">ADMIN</p>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-30" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-40"
            >
              <div className="p-4 border-b border-slate-50">
                <p className="text-sm font-bold text-slate-900">{user.displayName}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
                {userRole === 'ADMIN' && (
                  <div className="mt-2 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full inline-block uppercase tracking-wider">
                    អ្នកគ្រប់គ្រង (Admin)
                  </div>
                )}
              </div>
              <div className="p-2 border-b border-slate-50">
                {userRole === 'ADMIN' && (
                  <Link
                    href="/admin"
                    onClick={() => setIsOpen(false)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 font-medium hover:bg-slate-50 rounded-xl transition-colors mb-1"
                  >
                    <LogIn className="w-4 h-4 text-blue-600" />
                    គ្រប់គ្រង (Admin Panel)
                  </Link>
                )}
                <Link
                  href="/quiz"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 font-medium hover:bg-slate-50 rounded-xl transition-colors"
                >
                  <Brain className="w-4 h-4 text-purple-600" />
                  ប្រឡងសំណួរ (Quiz)
                </Link>
              </div>
              <div className="p-2">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 font-medium hover:bg-red-50 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  ចាកចេញ (Sign Out)
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
