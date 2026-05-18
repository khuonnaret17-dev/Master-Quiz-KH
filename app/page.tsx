'use client';

import { motion } from "motion/react";
import { useFirebase } from "@/lib/FirebaseProvider";
import { Search, Info, Brain, AlertCircle } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserNav } from "@/components/UserNav";
import { MinistryList } from "@/components/MinistryList";
import SafeImage from "@/components/SafeImage";

export default function Home() {
  const { ministries, loading, user, userProgress, userRole, error } = useFirebase();
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  const filteredMinistries = ministries.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.khmerName.includes(searchTerm)
  );

  if (loading && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-12">
      <div className="max-w-7xl mx-auto">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-in fade-in slide-in-from-top-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-bold">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="ml-auto text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors"
            >
              ព្យាយាមម្ដងទៀត
            </button>
          </div>
        )}
        {/* Header */}
        <header className="mb-8 md:mb-12 text-center relative pt-4 md:pt-0">
          <div className="flex flex-wrap gap-2 sm:gap-3 justify-center md:absolute md:top-0 md:right-0 md:justify-end items-center mb-6 md:mb-0">
            {userRole === 'ADMIN' && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link 
                  href="/admin" 
                  id="admin-link"
                  className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 transition-all shadow-sm group font-bold text-sm mt-0 ml-0 mr-[380px]"
                >
                  <Info className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                  <span>គ្រប់គ្រង (Admin)</span>
                </Link>
              </motion.div>
            )}
            <div className="md:ml-2">
              <UserNav />
            </div>
          </div>
          <div className="pt-8 md:pt-12 pb-8 flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative w-32 h-32 md:w-40 md:h-40 mb-8 flex items-center justify-center bg-white rounded-full shadow-2xl shadow-slate-300/60 ring-8 ring-white/80 overflow-hidden"
            >
              <SafeImage 
                src="https://i.ibb.co/FkGwqJVL/3-QCM-Ep4-1.jpg"
                alt="Logo"
                fill
                unoptimized
                className="object-cover"
              />
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-bold text-[#ec2222] italic mb-[25px] drop-shadow-sm tracking-tight leading-[69px] ml-0 -mt-[2px]"
            >
              កម្មវិធីត្រៀមប្រឡងក្របខ័ណ្ឌ
            </motion.h1>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 80 }}
              className="h-1.5 bg-blue-600 rounded-full mx-auto"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/70 backdrop-blur-md p-4 rounded-3xl shadow-xl shadow-slate-200/50 border border-white mb-12">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text"
                placeholder="ស្វែងរកក្រសួង... (Search...)"
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </header>

        {/* List Display */}
        <MinistryList 
          ministries={filteredMinistries}
          userProgress={userProgress}
          onSelect={(m) => router.push(`/ministry/${m.id}`)}
        />

        {filteredMinistries.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
            <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">រកមិនឃើញក្រសួងដែលអ្នកស្វែងរកទេ...</p>
          </div>
        )}
      </div>
    </main>
  );
}
