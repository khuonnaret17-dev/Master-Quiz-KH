'use client';



import { motion } from "motion/react";
import { Check, Crown, Zap, ArrowLeft, X } from "lucide-react";
import { useFirebase } from "@/lib/FirebaseProvider";
import { useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import { useState } from "react";

export default function SubscriptionPage() {
  const { user } = useFirebase();
  const router = useRouter();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const plans = [
    { id: 'BASIC_1M', name: 'គម្រោង ១ខែ', price: '2.50$', duration: '១ខែ', paywayUrl: 'https://link.payway.com.kh/ABAPAYWd450806K' },
    { id: 'BASIC_6M', name: 'គម្រោង ៦ខែ', price: '10$', duration: '៦ខែ', paywayUrl: 'https://link.payway.com.kh/ABAPAYbX4508070' },
    { id: 'PREMIUM_1Y', name: 'គម្រោង ១ឆ្នាំ', price: '15$', duration: '១ឆ្នាំ', paywayUrl: 'https://link.payway.com.kh/ABAPAYZr450808t' },
    { id: 'LIFETIME', name: 'គម្រោងប្រើប្រាស់រហូត', price: '30$', duration: 'ប្រើប្រាស់រហូត', paywayUrl: 'https://link.payway.com.kh/ABAPAYg6450809C' },
  ];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-slate-600">សូមចូលគណនីជាមុនសិន ដើម្បីទិញគម្រោង Premium</p>
      </div>
    );
  }

  // extract the clean username
  let currentUsername = user?.displayName || user?.email || 'Unknown';
  if (user?.uid?.startsWith('custom_')) {
    currentUsername = user.uid.replace('custom_', '');
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 flex justify-start">
          <button onClick={() => router.back()} className="inline-flex items-center text-slate-500 hover:text-slate-800 transition-colors text-sm font-bold font-khmer">
            <ArrowLeft className="w-4 h-4 mr-2" />
            ត្រឡប់ក្រោយ
          </button>
        </header>

        <header className="mb-12 text-center">
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 mb-4 font-khmer">ជ្រើសរើសគម្រោង Premium</h1>
          <p className="text-slate-600 font-khmer">បង្កើនសមត្ថភាពសិក្សាជាមួយគម្រោងពិសេសរបស់យើង</p>
        </header>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <motion.div 
              key={plan.id}
              whileHover={{ y: -5 }}                
              className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-amber-100/50 rounded-2xl text-amber-600">
                  <Crown className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">{plan.name}</h3>
              <p className="text-3xl font-black text-slate-900 mb-6">{plan.price}</p>
              
              <ul className="space-y-3 mb-8 flex-grow text-sm text-slate-600">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> ចូលប្រើវិញ្ញាសាពិសេស</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> ការពន្យល់លម្អិត</li>
                <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> អាទិភាពក្នុងប្រព័ន្ធ</li>
              </ul>

              <button 
                onClick={() => setSelectedPlanId(plan.id)}
                className="w-full py-3 bg-[#094C72] text-white font-bold rounded-xl shadow-md hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {plan.paywayUrl ? 'បង់តាមរយៈ ABA PayWay' : 'ទំនាក់ទំនងទិញ'}
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Payment Modal */}
      {selectedPlanId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedPlanId(null)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200 max-w-sm w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedPlanId(null)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
            
            {plans.find(p => p.id === selectedPlanId)?.paywayUrl ? (
              <div className="text-center w-full">
                <div className="bg-[#005faa] text-white p-4 rounded-t-3xl font-bold flex justify-between items-center -mx-6 -mt-6 border-b-4 border-[#d5131a] mb-6">
                   <span className="font-khmer text-sm">ទូទាត់ប្រាក់តាមរយៈ</span>
                   <span className="font-sans text-xl uppercase tracking-wider font-black">ABA PAY</span>
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-1 font-khmer">ស្កេនដើម្បីទូទាត់ប្រាក់</h3>
                <p className="text-sm text-slate-500 mb-4 font-khmer">សម្រាប់ {plans.find(p => p.id === selectedPlanId)?.name}</p>
                
                <a href={plans.find(p => p.id === selectedPlanId)?.paywayUrl} target="_blank" rel="noopener noreferrer" className="flex justify-center mb-6 bg-white p-3 rounded-2xl border-4 border-[#005faa] inline-block mx-auto hover:border-[#d5131a] transition-colors cursor-pointer relative group shadow-[0_0_20px_rgba(0,0,0,0.1)]">
                  <QRCodeCanvas 
                     value={plans.find(p => p.id === selectedPlanId)?.paywayUrl || ''} 
                     size={220} 
                     fgColor="#005faa" 
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/70 backdrop-blur-[1px] rounded-xl flex-col gap-2">
                     <span className="bg-[#d5131a] text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg font-khmer">ចុចទីនេះដើម្បីបើក</span>
                  </div>
                </a>

                <a 
                   href={plans.find(p => p.id === selectedPlanId)?.paywayUrl} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="w-full py-3.5 bg-[#d5131a] text-white font-black rounded-xl hover:bg-red-800 transition-colors block text-sm font-khmer mb-2 shadow-md shadow-red-500/20"
                >
                   បង់លុយតាមទូរស័ព្ទ (Click to Pay)
                </a>
              </div>
            ) : (
              <div className="text-center py-6">
                <h3 className="text-xl font-black text-slate-800 mb-2 font-khmer">លេខគណនីទូទាត់</h3>
                <p className="text-3xl font-mono font-bold text-[#094C72] mb-2 tracking-wider">006 618 823</p>
                <p className="text-sm text-slate-500 font-khmer">សម្រាប់ {plans.find(p => p.id === selectedPlanId)?.name}</p>
              </div>
            )}

            <div className="mt-2 bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center flex-col text-center">
              <p className="text-xs mb-3 text-blue-800 font-khmer leading-relaxed">
                បន្ទាប់ពីបង់ប្រាក់រួចរាល់ សូមផ្ញើវិក្កយបត្រ (Receipt) មកកាន់ Admin ដើម្បីបញ្ជាក់។
              </p>
              <a 
                href={`https://t.me/Oudom_S_A_B?text=${encodeURIComponent(`សួស្ដី Admin, ខ្ញុំបានបង់ប្រាក់សម្រាប់ ${plans.find(p => p.id === selectedPlanId)?.name}។ នេះជាឈ្មោះគណនីរបស់ខ្ញុំ៖ ${currentUsername}`)}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full py-3 bg-[#0088cc] text-white text-sm font-bold rounded-xl shadow-md hover:bg-black transition-colors font-khmer flex justify-center items-center gap-2"
                onClick={() => setSelectedPlanId(null)}
              >
                ផ្ញើវិក្កយបត្រទៅកាន់ Admin
              </a>
            </div>
            
            <button 
              onClick={() => {
                setSelectedPlanId(null);
                router.push(`/payment/success?plan=${selectedPlanId}`);
              }}
              className="mt-4 w-full py-3 text-slate-500 font-bold rounded-xl hover:bg-slate-100 transition-colors text-xs"
            >
              ចូលទៅកាន់ទំព័របញ្ជាក់ថាបានបង់ប្រាក់រួច
            </button>
          </motion.div>
        </div>
      )}
    </main>
  );
}
