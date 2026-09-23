'use client';

import { useFirebase } from '@/lib/FirebaseProvider';
import { MinistryList } from '@/components/MinistryList';
import { ArrowLeft, Heart } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { motion } from 'motion/react';

export default function FavoritesPage() {
  const { ministries, user, favorites, userProgress } = useFirebase();
  const router = useRouter();

  const favoriteMinistries = useMemo(() => {
    return ministries.filter(m => favorites.includes(m.id));
  }, [ministries, favorites]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-black text-slate-800 mb-4 font-khmer">សូមចូលគណនី</h2>
          <Link href="/" className="px-6 py-2.5 bg-[#094C72] text-white font-bold rounded-xl hover:bg-[#073652] transition-colors">
            ត្រឡប់ទៅទំព័រដើម
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-12">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex items-center gap-4">
          <Link href="/" className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-500 fill-red-500" />
            <h1 className="text-2xl font-black text-slate-900 font-khmer">សំណួរដែលចូលចិត្ត</h1>
          </div>
        </header>

        {favoriteMinistries.length > 0 ? (
          <MinistryList 
            ministries={favoriteMinistries}
            userProgress={userProgress}
            onSelect={(m, act) => {
              router.push(`/ministry/${m.id}${act ? `?tab=${act}` : ''}`);
            }}
          />
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300"
          >
            <Heart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-khmer">អ្នកមិនទាន់បានដាក់សំណួរចូលក្នុងបញ្ជីដែលចូលចិត្តនៅឡើយទេ។</p>
            <Link href="/" className="mt-6 inline-block px-6 py-2.5 bg-[#094C72] text-white font-bold rounded-xl hover:bg-[#073652] transition-colors font-khmer">
              ទៅស្វែងរកសំណួរ
            </Link>
          </motion.div>
        )}
      </div>
    </main>
  );
}
