'use client';



import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFirebase } from '@/lib/FirebaseProvider';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

function PaymentSuccessContent() {
  const { upgradeToPremium, user } = useFirebase();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    const processPayment = async () => {
      if (!user || hasProcessedRef.current) {
        // Wait for user to load or skip if already processed
        return;
      }
      hasProcessedRef.current = true;
      
      try {
        const plan = searchParams?.get('plan');
        let months = 120; // default for lifetime
        if (plan === 'BASIC_1M') months = 1;
        else if (plan === 'BASIC_6M') months = 6;
        else if (plan === 'PREMIUM_1Y') months = 12;

        // Upgrade user locally
        await upgradeToPremium(months);
        setStatus('success');
        
        // Redirect after a short delay
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } catch (err) {
        console.error(err);
        setStatus('error');
      }
    };

    processPayment();
  }, [user, searchParams, upgradeToPremium, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center"
      >
        {status === 'processing' && (
          <div className="flex flex-col items-center">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2 font-khmer">កំពុងដំណើរការទូទាត់...</h2>
            <p className="text-slate-600 font-khmer">សូមរង់ចាំបន្តិច ប្រព័ន្ធកំពុងផ្ទៀងផ្ទាត់អំពីការទូទាត់របស់អ្នក។</p>
          </div>
        )}
        
        {status === 'success' && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex flex-col items-center"
          >
            <CheckCircle2 className="w-20 h-20 text-emerald-500 mb-4" />
            <h2 className="text-2xl font-bold text-emerald-700 mb-2 font-khmer">ការទូទាត់ជោគជ័យ! 🎉</h2>
            <p className="text-slate-600 mb-6 font-khmer">អបអរសាទរ! គណនីរបស់អ្នកត្រូវបានក្លាយទៅជា Premium ភ្លាមៗ។</p>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 3 }}
                className="h-full bg-emerald-500"
              />
            </div>
            <p className="text-xs text-slate-400 mt-4 font-khmer">ត្រឡប់ទៅទំព័រដើម...</p>
          </motion.div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">❌</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2 font-khmer">មានបញ្ហាក្នុងការទូទាត់</h2>
            <p className="text-slate-600 mb-6 font-khmer">សូមព្យាយាមម្ដងទៀត ឬទាក់ទងមកកាន់អ្នកគ្រប់គ្រងប្រព័ន្ធ។</p>
            <button 
              onClick={() => router.push('/subscription')}
              className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
            >
              ត្រឡប់ក្រោយ
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
