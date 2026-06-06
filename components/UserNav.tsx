'use client';

import { useFirebase } from "@/lib/FirebaseProvider";
import { LogIn, LogOut, User as UserIcon, ChevronDown, Brain, Crown, X, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import SafeImage from "@/components/SafeImage";
import Link from "next/link";

export function UserNav() {
  const { user, logout, authLoading, isLoggingIn, userRole, isPremium, loginCustomMember, registerCustomMember, loginCustomAdmin } = useFirebase();
  const [isOpen, setIsOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Modal Login States
  const [activeTab, setActiveTab] = useState<'MEMBER' | 'ADMIN'>('MEMBER');
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [conPassword, setConPassword] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [localAuthError, setLocalAuthError] = useState<string | null>(null);
  const [localAuthSuccess, setLocalAuthSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (authLoading) {
    return (
      <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse" />
    );
  }

  const handleModalAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalAuthError(null);
    setLocalAuthSuccess(null);
    setIsSubmitting(true);

    try {
      if (activeTab === 'MEMBER') {
        if (isRegistering) {
          if (password !== conPassword) {
            setLocalAuthError('លេខសម្ងាត់ពីរដងមិនដូចគ្នាទេ!');
            setIsSubmitting(false);
            return;
          }
          const res = await registerCustomMember(username, password);
          if (res.success) {
            setLocalAuthSuccess('ចុះឈ្មោះបានជោគជ័យ!');
            setTimeout(() => {
              setShowLoginModal(false);
              setLocalAuthSuccess(null);
            }, 1000);
          } else {
            setLocalAuthError(res.error || 'មានបញ្ហាចុះឈ្មោះគណនី');
          }
        } else {
          const res = await loginCustomMember(username, password);
          if (res.success) {
            setLocalAuthSuccess('បានចូលប្រើប្រាស់ជោគជ័យ!');
            setTimeout(() => {
              setShowLoginModal(false);
              setLocalAuthSuccess(null);
            }, 1000);
          } else {
            setLocalAuthError(res.error || 'ឈ្មោះគណនី ឬលេខសម្ងាត់មិនត្រឹមត្រូវ');
          }
        }
      } else {
        const res = await loginCustomAdmin(adminPass);
        if (res.success) {
          setLocalAuthSuccess('បានចូលជា Admin ជោគជ័យ!');
          setTimeout(() => {
            setShowLoginModal(false);
            setLocalAuthSuccess(null);
          }, 1000);
        } else {
          setLocalAuthError(res.error || 'លេខសម្ងាត់អ្នកគ្រប់គ្រងមិនត្រឹមត្រូវ');
        }
      }
    } catch (err: any) {
      setLocalAuthError(err.message || 'មានបញ្ហាបច្ចេកទេស');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <>
        <button
          onClick={() => {
            setLocalAuthError(null);
            setLocalAuthSuccess(null);
            setShowLoginModal(true);
          }}
          disabled={isLoggingIn}
          className="group relative flex items-center gap-2 px-7 py-2.5 bg-gradient-to-r from-[#094C72] to-[#0A5A8A] text-white rounded-full transition-all duration-300 text-sm font-bold font-khmer overflow-hidden border border-[#166EAA] shadow-md hover:shadow-lg hover:shadow-[#094C72]/30 hover:-translate-y-0.5"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h20v20H0V0zm10 17L3 10l7-7 7 7-7 7z\' fill=\'%23D4AF37\' fill-opacity=\'0.05\' fill-rule=\'evenodd\'/%3E%3C/svg%3E')] opacity-50 pointer-events-none" />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-all ease-in-out pointer-events-none" />
          <LogIn className="w-4 h-4 text-[#D4AF37] relative z-10 transition-transform group-hover:-translate-x-1" />
          <span className="relative z-10">ចូលគណនី</span>
        </button>

        {/* Modal Overlay */}
        <AnimatePresence>
          {showLoginModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowLoginModal(false)}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100 z-10 flex flex-col space-y-5"
              >
                {/* Close Button */}
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="absolute right-4 top-4 p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>

                {/* Header Title */}
                <div className="text-center space-y-1 pr-6">
                  <h3 className="text-lg font-black text-slate-900 font-khmer">
                    សូមចូលគណនីរបស់អ្នក
                  </h3>
                  <p className="text-xs text-slate-400 font-khmer">
                    ត្រៀមប្រឡងក្របខ័ណ្ឌរដ្ឋផ្លូវការ
                  </p>
                </div>

                {/* Tab Switcher */}
                <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 w-full border border-slate-200/50">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('MEMBER');
                      setLocalAuthError(null);
                      setLocalAuthSuccess(null);
                    }}
                    className={`flex-1 py-2 text-center rounded-xl text-xs font-black transition-all font-khmer cursor-pointer ${
                      activeTab === 'MEMBER'
                        ? 'bg-[#094C72] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-850'
                    }`}
                  >
                    ចូលជាសមាជិក
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('ADMIN');
                      setLocalAuthError(null);
                      setLocalAuthSuccess(null);
                    }}
                    className={`flex-1 py-2 text-center rounded-xl text-xs font-black transition-all font-khmer cursor-pointer ${
                      activeTab === 'ADMIN'
                        ? 'bg-[#094C72] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-850'
                    }`}
                  >
                    ចូលជាអ្នកគ្រប់គ្រង
                  </button>
                </div>

                <form onSubmit={handleModalAuth} className="space-y-4">
                  {localAuthError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-[11px] font-bold font-khmer flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{localAuthError}</span>
                    </div>
                  )}
                  {localAuthSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-bold font-khmer flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{localAuthSuccess}</span>
                    </div>
                  )}

                  {activeTab === 'MEMBER' ? (
                    <>
                      <div className="space-y-1 text-left">
                        <label className="text-[10px] font-bold text-slate-500 font-khmer ml-1">ឈ្មោះអ្នកប្រើប្រាស់ (User Name)</label>
                        <div className="relative">
                          <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                          <input 
                            type="text"
                            required
                            placeholder="ឈ្មោះគណនី"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#094C72] transition-all font-sans"
                          />
                        </div>
                      </div>

                      <div className="space-y-1 text-left">
                        <label className="text-[10px] font-bold text-slate-500 font-khmer ml-1">លេខសម្ងាត់ (Password)</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                          <input 
                            type="password"
                            required
                            placeholder="លេខសម្ងាត់"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#094C72] transition-all font-sans"
                          />
                        </div>
                      </div>

                      {isRegistering && (
                        <div className="space-y-1 text-left">
                          <label className="text-[10px] font-bold text-slate-500 font-khmer ml-1">បញ្ជាក់លេខសម្ងាត់ (Confirm Password)</label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input 
                              type="password"
                              required
                              placeholder="បញ្ជាក់លេខសម្ងាត់"
                              value={conPassword}
                              onChange={(e) => setConPassword(e.target.value)}
                              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#094C72] transition-all font-sans"
                            />
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-bold text-slate-500 font-khmer ml-1">លេខសម្ងាត់ (Password)</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input 
                          type="password"
                          required
                          placeholder="បញ្ចូលលេខសម្ងាត់អ្នកគ្រប់គ្រង"
                          value={adminPass}
                          onChange={(e) => setAdminPass(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#094C72] transition-all font-sans"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#094C72] text-white rounded-xl font-bold text-xs shadow-lg hover:bg-[#073652] transition-all cursor-pointer font-khmer"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <LogIn className="w-4 h-4" />
                    )}
                    <span>
                      {isSubmitting
                        ? 'កំពុងភ្ជាប់...'
                        : (activeTab === 'MEMBER'
                          ? (isRegistering ? 'ចុះឈ្មោះជាសមាជិក' : 'ចូលប្រើប្រាស់ជាសមាជិក')
                          : 'ចូលប្រើប្រាស់ជាអ្នកគ្រប់គ្រង'
                        )
                      }
                    </span>
                  </button>
                </form>


              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-1.5 pr-2 bg-white/90 backdrop-blur-md border border-slate-200 rounded-full hover:border-[#D4AF37] hover:bg-white transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-[#D4AF37]/10 cursor-pointer group relative"
      >
        <div className="relative">
          {user.photoURL ? (
            <div className="w-9 h-9 rounded-full overflow-hidden relative ring-2 ring-white shadow-sm border border-slate-100 group-hover:ring-[#D4AF37]/20 transition-all">
              <SafeImage src={user.photoURL} alt={user.displayName || ""} fill className="object-cover" />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200/50 flex items-center justify-center ring-2 ring-white shadow-sm group-hover:ring-[#D4AF37]/20 transition-all text-[#094C72]">
              <UserIcon className="w-4 h-4" />
            </div>
          )}
          {isPremium && (
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-[#FCECB8] to-[#D4AF37] text-white p-[3px] rounded-full shadow border border-white">
              <Crown className="w-[10px] h-[10px] text-yellow-900" />
            </div>
          )}
        </div>
        <div className="hidden md:flex flex-col items-start px-1">
          <p className="text-xs font-bold text-slate-800 font-sans leading-tight group-hover:text-[#094C72] transition-colors truncate max-w-[120px]">
             {user.displayName || user.email}
          </p>
          <p className="text-[10px] font-medium text-slate-400 leading-tight uppercase font-khmer mt-0.5">
             {userRole === 'ADMIN' ? 'អ្នកគ្រប់គ្រង' : isPremium ? 'Premium' : 'សមាជិកធម្មតា'}
          </p>
        </div>
        <div className={`ml-1 bg-slate-50 rounded-full p-1 group-hover:bg-blue-50 transition-colors ${isOpen ? 'rotate-180 bg-blue-50 text-[#094C72]' : ''}`}>
           <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#094C72] transition-colors" />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-35" 
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
                    (Admin)
                  </div>
                )}
              </div>
              <div className="p-2">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 font-medium hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
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
