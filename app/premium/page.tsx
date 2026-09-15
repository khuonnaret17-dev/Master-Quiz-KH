'use client';



import { motion } from "motion/react";
import { ArrowLeft, CheckCircle2, Crown, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFirebase } from "@/lib/FirebaseProvider";

export default function PremiumPage() {
  const { user } = useFirebase();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-900 text-[#eceff4] flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Decorative Traditional and Golden Background Elements */}
      <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl opacity-70 pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl opacity-60 pointer-events-none" />

      <div className="max-w-2xl w-full text-center space-y-8 z-10">
        <header className="mb-6 flex justify-start">
          <button onClick={() => router.back()} className="inline-flex items-center text-slate-400 hover:text-white transition-colors text-sm font-bold font-khmer">
            <ArrowLeft className="w-4 h-4 mr-2" />
            ត្រឡប់ក្រោយ
          </button>
        </header>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 md:p-12 text-center rounded-[2.5rem] bg-slate-950/65 border-2 border-amber-500/30 shadow-2xl relative overflow-hidden backdrop-blur-md"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h20v20H0V0zm10 17L3 10l7-7 7 7-7 7z\' fill=\'%23D4AF37\' fill-opacity=\'0.03\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")'
          }}
        >
          {/* Glowing Premium Trophy Badge */}
          <div className="w-24 h-24 mx-auto rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-500 mb-8 relative">
            <div className="absolute inset-0 rounded-full bg-amber-500/5 animate-ping" />
            <Trophy className="w-12 h-12 fill-amber-500/10" />
          </div>

          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-widest">
              <Crown className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
              <span>សមាជិកភាព Premium ឥតគិតថ្លៃ ១០០%</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight font-khmer mt-2">
              គម្រោង Premium ត្រូវបានបើកជូនលោកអ្នកដោយសេរី!
            </h1>

            <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-lg mx-auto pt-2">
              ដើម្បីគាំទ្រការសិក្សា និងការត្រៀមប្រឡងក្របខ័ណ្ឌរបស់បងប្អូនសិស្សានុសិស្សទាំងអស់គ្នា គម្រោង Premium និងមុខងារស្មុគស្មាញទាំងអស់ត្រូវបានសម្រេចបើកដំណើរការដោយឥតគិតថ្លៃទាំងស្រុង។ លោកអ្នកលែងត្រូវការទូទាត់ប្រាក់ទៀតហើយ!
            </p>
          </div>

          {/* List of Unlocked Perks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto pt-8 text-left">
            <div className="flex items-start gap-3 bg-slate-905 p-4 rounded-2xl border border-slate-800">
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">វិញ្ញាសាគ្រប់ក្រសួង</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">មើលមេរៀន និងលំហាត់គ្រប់វិស័យ</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-905 p-4 rounded-2xl border border-slate-800">
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">ទាញយក PDF ផ្លូវការ</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">សន្លឹកកិច្ចការគំរូអាចព្រីនចេញបាន</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-905 p-4 rounded-2xl border border-slate-800">
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">លេងល្បែងតេស្តគ្មានដែនកំណត់</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Quiz tests គ្រប់គ្រសួងទាំងអស់</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-905 p-4 rounded-2xl border border-slate-800">
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">ជំនួយការ AI Chat</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">សួរមេរៀនជាមួយ AI កម្រិតខ្ពស់</p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/60 flex flex-col items-center justify-center gap-4">
            <Link
              href="/"
              className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-slate-950 rounded-2xl font-black text-xs md:text-sm shadow-xl shadow-amber-500/10 flex items-center justify-center gap-2 transition-all cursor-pointer animate-pulse"
            >
              <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
              <span>ចាប់ផ្តើមសិក្សា និងអនុវត្តវិញ្ញាសាភ្លាមៗ ⚡</span>
            </Link>

            {user && (
              <p className="text-[10px] text-slate-500 font-mono">
                សកម្មភាពក្រោមគណនី: <span className="text-slate-400">{user.email}</span>
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
