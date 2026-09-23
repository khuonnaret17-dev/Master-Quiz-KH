'use client';



import { motion } from "motion/react";
import { useFirebase } from "@/lib/FirebaseProvider";
import { Search, Info, AlertCircle, LogIn, CheckCircle2, User, Lock, X, History, Heart } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

import { useRouter } from "next/navigation";
import { UserNav } from "@/components/UserNav";
import { MinistryList } from "@/components/MinistryList";
import SafeImage from "@/components/SafeImage";

export default function Home() {
  const { ministries, loading, authLoading, user, userProgress, loginCustomMember, registerCustomMember, loginCustomAdmin, userRole } = useFirebase();
  const [searchTerm, setSearchTerm] = useState("");
  const [mainTab, setMainTab] = useState<'INSTITUTION' | 'SUBJECT'>('INSTITUTION');
  const router = useRouter();

  // Recent searches state & persistence
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cambodia_ministry_recent_searches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const addRecentSearch = (term: string) => {
    if (!term.trim()) return;
    const cleaned = term.trim();
    const updated = [cleaned, ...recentSearches.filter(s => s !== cleaned)].slice(0, 6);
    setRecentSearches(updated);
    try {
      localStorage.setItem('cambodia_ministry_recent_searches', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const removeRecentSearch = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s !== term);
    setRecentSearches(updated);
    try {
      localStorage.setItem('cambodia_ministry_recent_searches', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('cambodia_ministry_recent_searches');
    } catch {
      // ignore
    }
  };

  // Custom dual-mode authentication state fields
  const [activeTab, setActiveTab] = useState<'MEMBER' | 'ADMIN'>('MEMBER');
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [conPassword, setConPassword] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [localAuthError, setLocalAuthError] = useState<string | null>(null);
  const [localAuthSuccess, setLocalAuthSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCustomAuth = async (e: React.FormEvent) => {
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
            setLocalAuthSuccess('ចុះឈ្មោះបានជកជ័យ!');
          } else {
            setLocalAuthError(res.error || 'មានបញ្ហាចុះឈ្មោះគណនី');
          }
        } else {
          const res = await loginCustomMember(username, password);
          if (res.success) {
            setLocalAuthSuccess('បានចូលប្រើប្រាស់ជោគជ័យ!');
          } else {
            setLocalAuthError(res.error || 'ឈ្មោះគណនី ឬលេខសម្ងាត់មិនត្រឹមត្រូវ');
          }
        }
      } else {
        const res = await loginCustomAdmin(adminPass);
        if (res.success) {
          setLocalAuthSuccess('បានចូលជា Admin ជោគជ័យ!');
        } else {
          setLocalAuthError(res.error || 'លេខសម្ងាត់អ្នកគ្រប់គ្រងមិនត្រឹមត្រូវ');
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'មានបញ្ហាបច្ចេកទេស';
      setLocalAuthError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMinistries = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return ministries.filter(m => {
      const matchesSearch = !q || (m.name?.toLowerCase().includes(q) || false) || (m.khmerName?.includes(searchTerm) || false);
      const matchesGroup = (mainTab === 'INSTITUTION' && (!m.groupType || m.groupType === 'INSTITUTION')) || 
                           (mainTab === 'SUBJECT' && m.groupType === 'SUBJECT');
      return matchesSearch && matchesGroup;
    });
  }, [ministries, searchTerm, mainTab]);

  const totalKhmerDigits = useMemo(() => {
    const total = ministries.reduce((acc, m) => {
      const count = (m.quizzes?.length || 0);
      interface LocalCategory {
        items?: unknown[];
        subCategories?: LocalCategory[];
      }
      const countItems = (cats?: LocalCategory[]): number => {
        if (!cats) return 0;
        return cats.reduce((sum, cat) => {
          return sum + (cat.items?.length || 0) + countItems(cat.subCategories);
        }, 0);
      };
      return acc + count + countItems(m.mcqs as LocalCategory[]) + countItems(m.shortAnswers as LocalCategory[]);
    }, 0);
    
    const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
    return total.toString().split('').map(d => khmerDigits[parseInt(d)] || d).join('');
  }, [ministries]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent text-slate-700 font-bold">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
          <p className="text-sm">កំពុងផ្ទុកទិន្នន័យ...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-transparent p-4 md:p-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8 md:mb-12 text-center relative pt-4 md:pt-0">
          <div 
            className="pt-4 md:pt-6 pb-12 flex flex-col items-center relative mx-2 md:mx-4 overflow-hidden rounded-[2.5rem] shadow-2xl" 
            style={{ 
              backgroundColor: '#094C72',
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h20v20H0V0zm10 17L3 10l7-7 7 7-7 7z\' fill=\'%23D4AF37\' fill-opacity=\'0.04\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
              border: '2px solid rgba(212, 175, 55, 0.35)',
              boxShadow: '0 20px 40px -15px rgba(5,44,66,0.3), inset 0 0 40px rgba(212,175,55,0.05)'
            }}
          >
            {/* Animated Background Gradients */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#094C72]/80 via-[#052c42]/80 to-[#031926]/90 mix-blend-overlay z-0"></div>
            
            <motion.div
              animate={{ 
                x: [0, 50, 0],
                y: [0, -30, 0],
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-0 right-0 md:right-1/4 w-[30rem] h-[30rem] bg-amber-500/20 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 z-0"
            />
            <motion.div
              animate={{ 
                x: [0, -50, 0],
                y: [0, 30, 0],
                scale: [1, 1.4, 1],
                opacity: [0.2, 0.5, 0.2],
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-0 left-0 md:left-1/4 w-[30rem] h-[30rem] bg-blue-400/20 rounded-full blur-[120px] pointer-events-none translate-y-1/2 z-0"
            />
            
            {/* Top Navigation Row inside banner */}
            <div className="w-full flex justify-end items-center gap-3 px-4 sm:px-6 md:px-8 mb-4 md:mb-6 z-30 relative">
              {userRole === 'ADMIN' && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link 
                    href="/admin" 
                    id="admin-link"
                    className="flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#FCECB8] border border-[#FCECB8]/50 rounded-2xl text-[#094C72] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all shadow-md group font-black text-xs md:text-sm font-khmer"
                  >
                    <Info className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                    <span className="hidden sm:inline">គ្រប់គ្រង (Admin)</span>
                  </Link>
                </motion.div>
              )}
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link 
                  href="/favorites"
                  className="flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 bg-white/10 border border-white/20 rounded-2xl text-white hover:bg-white/20 transition-all shadow-md font-black text-xs md:text-sm font-khmer"
                >
                  <Heart className="w-4 h-4" />
                  <span className="hidden sm:inline">ចូលចិត្ត</span>
                </Link>
              </motion.div>
              <div className="text-white relative z-50 flex-shrink-0">
                <UserNav />
              </div>
            </div>

            {/* Glowing amber ornament lights under-layer */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative w-32 h-32 md:w-36 md:h-36 mb-6 flex items-center justify-center bg-white rounded-full shadow-[0_0_50px_rgba(212,175,55,0.6)] ring-4 ring-[#D4AF37]/50 overflow-hidden hover:scale-105 hover:shadow-[0_0_60px_rgba(212,175,55,0.8)] transition-all duration-300"
            >
              <SafeImage 
                src="https://i.ibb.co/FkGwqJVL/3-QCM-Ep4-1.jpg"
                alt="Logo"
                fill
                priority
                unoptimized
                className="object-cover drop-shadow-xl"
              />
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#FFFDF6] via-[#FCECB8] to-[#E2BD55] mb-4 drop-shadow-sm leading-tight text-center font-khmer pb-1 pt-3 pr-4 ml-0 h-[141px] w-full max-w-[615px] flex items-center justify-center"
            >
              កម្មវិធីត្រៀមប្រឡងក្របខ័ណ្ឌ
            </motion.h1>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 140 }}
              className="h-0.5 bg-[#D4AF37]/50 rounded-full mx-auto mb-4"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-2 flex flex-col items-center gap-4 px-4"
            >
              <div className="relative p-[1.5px] rounded-2xl overflow-hidden mx-auto md:w-auto w-full max-w-3xl group shadow-2xl">
                {/* Rotating Conic Gradients for the border */}
                <div className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2BD55_0%,transparent_10%,transparent_100%)]" />
                <div className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_270deg_at_50%_50%,#E2BD55_0%,transparent_10%,transparent_100%)]" />
                
                <div className="relative bg-gradient-to-r from-[#094C72]/90 to-[#052c42]/90 backdrop-blur-xl border-white/5 rounded-[15px] p-1.5 flex flex-col md:flex-row items-center w-full h-full">
                {/* Total Data Section */}
                <div className="flex items-center justify-center gap-3 px-4 py-2 w-full md:w-auto">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#FCECB8]/70 mb-0.5">ទិន្នន័យសរុប</span>
                    <span className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFFDF6] to-[#E2BD55] font-khmer">
                      {totalKhmerDigits}
                    </span>
                  </div>
                  <div className="w-px h-8 bg-white/20" />
                  <div className="flex flex-col items-start bg-transparent">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider whitespace-nowrap">វិញ្ញាសាដែលបានបញ្ចូល</span>
                    <span className="text-[11px] text-[#FCECB8] font-medium whitespace-nowrap">ក្នុងប្រព័ន្ធសិក្សាផ្លូវការ</span>
                  </div>
                  <div className="hidden md:block w-px h-10 bg-white/20 ml-2" />
                </div>

                {/* Main Tabs (only if logged in) */}
                {user && (
                  <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
                    <div className="flex gap-1 w-full md:w-[320px]">
                      <button
                        type="button"
                        onClick={() => setMainTab('INSTITUTION')}
                        className={`flex-1 px-4 py-2.5 text-center rounded-xl text-sm font-black transition-all font-khmer cursor-pointer whitespace-nowrap ${
                          mainTab === 'INSTITUTION'
                            ? 'bg-[#E2BD55] text-[#094C72] shadow-md'
                            : 'text-white hover:text-[#E2BD55] hover:bg-white/10'
                        }`}
                      >
                        ក្រសួង ស្ថាប័ន
                      </button>
                      <button
                        type="button"
                        onClick={() => setMainTab('SUBJECT')}
                        className={`flex-1 px-4 py-2.5 text-center rounded-xl text-sm font-black transition-all font-khmer cursor-pointer whitespace-nowrap ${
                          mainTab === 'SUBJECT'
                            ? 'bg-[#E2BD55] text-[#094C72] shadow-md'
                            : 'text-white hover:text-[#E2BD55] hover:bg-white/10'
                        }`}
                      >
                        វិញ្ញាសា
                      </button>
                    </div>
                  </div>
                )}
              </div>
              </div>
            </motion.div>
          </div>
        </header>

        {!user ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto p-6 md:p-8 rounded-[2rem] bg-white border-2 border-amber-500/30 shadow-2xl relative overflow-hidden"
            style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h20v20H0V0zm10 17L3 10l7-7 7 7-7 7z\' fill=\'%23D4AF37\' fill-opacity=\'0.02\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")'
            }}
          >
            {/* Corner Traditional Accents */}
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl opacity-60" />
            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl opacity-60" />

            <div className="w-full text-left">
              {/* Login Form Container */}
              <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 flex flex-col space-y-5 shadow-inner">
                {/* Tab Switcher */}
                <div id="auth-tab-container" className="bg-slate-200/70 p-1 rounded-2xl flex gap-1 w-full border border-slate-300/40">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('MEMBER');
                      setLocalAuthError(null);
                      setLocalAuthSuccess(null);
                    }}
                    className={`flex-1 py-2.5 text-center rounded-xl text-xs font-black transition-all font-khmer cursor-pointer ${
                      activeTab === 'MEMBER'
                        ? 'bg-[#094C72] text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-900'
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
                    className={`flex-1 py-2.5 text-center rounded-xl text-xs font-black transition-all font-khmer cursor-pointer ${
                      activeTab === 'ADMIN'
                        ? 'bg-[#094C72] text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ចូលជាអ្នកគ្រប់គ្រង
                  </button>
                </div>

                <div className="space-y-1 text-center">
                  <h3 className="text-sm font-black text-slate-800 font-khmer">
                    {activeTab === 'MEMBER'
                      ? (isRegistering ? 'ចុះឈ្មោះសមាជិកថ្មី' : 'សមាជិកចូលគណនី')
                      : 'ការចូលជាអ្នកគ្រប់គ្រង'
                    }
                  </h3>
                  <p className="text-[10px] text-slate-400 font-khmer">
                    {activeTab === 'MEMBER'
                      ? (isRegistering ? 'ឈ្មោះអក្សរអង់គ្លេសសុទ្ធ និងលេខសម្ងាត់ ៦ខ្ទង់' : 'សូមបំពេញឈ្មោះគណនី និងលេខសម្ងាត់')
                      : 'សូមបញ្ចូលលេខសម្ងាត់សម្រាប់អ្នកគ្រប់គ្រង'
                    }
                  </p>
                </div>

                <form onSubmit={handleCustomAuth} className="space-y-3.5">
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
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                          <input 
                            type="text"
                            required
                            placeholder="ឈ្មោះគណនី"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#094C72] transition-all font-sans"
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
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#094C72] transition-all font-sans"
                          />
                        </div>
                      </div>

                      {isRegistering && (
                        <>
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
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#094C72] transition-all font-sans"
                              />
                            </div>
                          </div>
                          <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-xl text-left">
                            <p className="text-[11px] text-blue-800 font-khmer leading-relaxed">
                              ✅ គណនីដែលបានចុះឈ្មោះរួច អាចយកទៅ Login ប្រើប្រាស់លើទូរស័ព្ទ ឬកុំព្យូទ័រផ្សេងទៀតបានធម្មតា។
                            </p>
                          </div>
                        </>
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
                          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#094C72] transition-all font-sans"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-6 bg-[#094C72] text-white rounded-xl font-bold text-xs shadow-lg shadow-slate-900/15 hover:bg-[#073652] disabled:opacity-50 transition-all cursor-pointer font-khmer"
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

                {activeTab === 'MEMBER' && (
                  <button
                    type="button"
                    onClick={() => setIsRegistering(!isRegistering)}
                    className="w-full text-center text-[10px] text-slate-500 hover:text-[#094C72] underline cursor-pointer font-khmer mt-2"
                  >
                    {isRegistering ? 'មានគណនីរួចហើយ? ចូលគណនី' : 'មិនទាន់មានគណនី? បង្កើតគណនីថ្មី'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Search Input Bar */}
            <div className="mb-4 max-w-xl mx-auto">
              <div className="relative flex items-center">
                <Search className="absolute left-4 text-slate-400 w-5 h-5 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchTerm.trim()) {
                      addRecentSearch(searchTerm);
                    }
                  }}
                  placeholder={mainTab === 'INSTITUTION' ? "ស្វែងរកឈ្មោះក្រសួង ឬស្ថាប័ន..." : "ស្វែងរកវិញ្ញាសា..."}
                  className="w-full pl-12 pr-10 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#094C72] focus:border-transparent transition-all font-khmer placeholder:text-slate-400"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3.5 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Recent Searches Chips */}
              {recentSearches.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 px-1">
                  <div className="flex items-center gap-1 text-xs text-slate-500 font-khmer mr-1">
                    <History className="w-3.5 h-3.5 text-[#094C72]" />
                    <span>ស្វែងរកថ្មីៗ៖</span>
                  </div>
                  {recentSearches.map((term, i) => (
                    <button
                      key={i}
                      onClick={() => setSearchTerm(term)}
                      className="group inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-700 shadow-2xs transition-all font-khmer cursor-pointer"
                    >
                      <span>{term}</span>
                      <span
                        onClick={(e) => removeRecentSearch(e, term)}
                        className="text-slate-400 hover:text-red-500 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={clearRecentSearches}
                    className="text-[10px] text-slate-400 hover:text-red-500 font-khmer ml-auto underline transition-colors cursor-pointer"
                  >
                    លុបប្រវត្តិទាំងអស់
                  </button>
                </div>
              )}
            </div>

            {/* Content Display */}
            <MinistryList 
              ministries={filteredMinistries}
              userProgress={userProgress}
              onSelect={(m, act) => {
                addRecentSearch(m.khmerName || m.name);
                router.push(`/ministry/${m.id}${act ? `?tab=${act}` : ''}`);
              }}
            />

            {filteredMinistries.length === 0 && (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-khmer">រកមិនឃើញទិន្នន័យដែលអ្នកស្វែងរកទេ...</p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
