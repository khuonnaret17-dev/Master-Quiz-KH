import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  QrCode,
  ArrowRight,
  Download,
  AlertCircle,
  Phone,
  User,
  Hash,
  ExternalLink,
} from 'lucide-react';
import { registerPaidUser } from '../services/firebase';
import { UserSession } from '../types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultUsername?: string;
  onPaymentSuccess: (session: UserSession) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  defaultUsername = '',
  onPaymentSuccess,
}) => {
  const [username, setUsername] = useState(defaultUsername);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Sync default username when prop updates
  React.useEffect(() => {
    if (defaultUsername) {
      setUsername(defaultUsername);
    }
  }, [defaultUsername]);

  if (!isOpen) return null;

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setErrorMsg('សូមបញ្ចូលឈ្មោះគណនី (Username) ដែលត្រូវផ្តល់សិទ្ធិប្រើប្រាស់!');
      return;
    }

    setIsSubmitting(true);

    try {
      const paidRecord = await registerPaidUser({
        username: cleanUsername,
        phoneNumber: phoneNumber.trim(),
        transactionRef: transactionRef.trim() || undefined,
        method: 'KHQR_BAKONG_ABA',
        note: `បង់ប្រាក់ $10.00 តាមរយៈ KHQR (ABA / Bakong) កាលបរិច្ឆេទ ${new Date().toLocaleDateString('km-KH')}`,
      });

      setIsSuccess(true);

      const session: UserSession = {
        username: cleanUsername,
        role: 'user',
        loggedInAt: new Date().toISOString(),
        isPaid: true,
        permanentAccess: true,
        paidAt: paidRecord.paidAt,
        transactionRef: paidRecord.transactionRef,
      };

      // Store in localStorage for persistent session
      localStorage.setItem('master_pro_quiz_session', JSON.stringify(session));

      setTimeout(() => {
        onPaymentSuccess(session);
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'បរាជ័យក្នុងការចុះឈ្មោះទូទាត់ សូមព្យាយាមម្តងទៀត!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative bg-slate-900 border border-amber-500/40 w-full max-w-xl rounded-3xl p-5 sm:p-7 shadow-2xl text-slate-150 my-auto max-h-[95vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-moul text-base sm:text-lg text-amber-300">
                ប្រព័ន្ធទូទាត់ KHQR (Payment)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-600">
                ពេញមួយជីវិត
              </span>
            </div>
            <p className="text-xs text-slate-300">
              ស្កេនទូទាត់ $10.00 ដើម្បីទទួលបានសិទ្ធិចូលប្រើប្រាស់ប្រព័ន្ធពេញមួយជីវិត (Lifetime Access)
            </p>
          </div>
        </div>

        {/* Success Alert */}
        {isSuccess ? (
          <div className="p-6 rounded-2xl bg-emerald-950/70 border border-emerald-500 text-emerald-200 text-center space-y-3 animate-fadeIn my-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-lg">
              <CheckCircle2 className="w-8 h-8 animate-bounce" />
            </div>
            <h4 className="font-moul text-lg text-emerald-300">
              ការបង់ប្រាក់ទទួលបានជោគជ័យ!
            </h4>
            <p className="text-xs text-emerald-200/90 leading-relaxed max-w-md mx-auto">
              គណនី «<strong>{username}</strong>» ត្រូវបានផ្តល់សិទ្ធិចូលរៀន និងធ្វើតេស្តវិញ្ញាសាពេញមួយជីវិត
              (Permanent Lifetime Access) ដោយជោគជ័យ។ កំពុងនាំលោកអ្នកចូលទៅកាន់ប្រព័ន្ធ...
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-red-950/70 border border-red-500/60 text-red-200 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Official KHQR Payment Card Display */}
            <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-4 sm:p-5 flex flex-col md:flex-row items-center gap-5">
              {/* QR Image Box */}
              <div className="relative group shrink-0">
                <div className="w-52 sm:w-56 rounded-2xl overflow-hidden border-2 border-amber-400/80 shadow-2xl bg-white p-1">
                  <img
                    src="/assets/aistudio/image_13971c05.png"
                    alt="KHQR Payment Code"
                    className="w-full h-auto object-contain rounded-xl"
                  />
                </div>
                <div className="flex flex-col gap-1.5 mt-2.5">
                  <a
                    href="https://link.payway.com.kh/ABAPAYox450999g"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span>បើក Link បង់ប្រាក់ ABA PayWay</span>
                  </a>
                  <a
                    href="/assets/aistudio/image_13971c05.png"
                    download="MasterQuiz_KHQR.png"
                    className="py-1.5 text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center justify-center gap-1 font-semibold transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ទាញយករូបភាព QR</span>
                  </a>
                </div>
              </div>

              {/* Instructions & Details */}
              <div className="flex-1 space-y-3 text-xs">
                <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-750 space-y-1.5">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>ឈ្មោះគណនីទទួល៖</span>
                    <strong className="text-slate-100 font-semibold">KHOUN NARET Master QuizKH</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>ប្រភេទប្រព័ន្ធ៖</span>
                    <strong className="text-cyan-400">KHQR / ABA PayWay</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>តម្លៃចូលរៀន៖</span>
                    <span className="text-base font-bold text-amber-400">$ 10.00 USD</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300 border-t border-slate-800 pt-1.5 mt-1.5">
                    <span>រយៈពេលប្រើប្រាស់៖</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>ពេញមួយជីវិត (Permanent)</span>
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 space-y-1 pl-1">
                  <p className="flex items-center gap-1.5 text-amber-300/90 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>ការណែនាំអំពីការបង់ប្រាក់៖</span>
                  </p>
                  <p>១. បើកកម្មវិធីធនាគារ (ABA, Bakong, Acleda, Wing...) ស្កេន QR ឬចុចប៊ូតុង <strong className="text-cyan-300">បើក Link បង់ប្រាក់ ABA PayWay</strong></p>
                  <p>២. ផ្ទៀងផ្ទាត់ឈ្មោះ <strong>KHOUN NARET Master QuizKH</strong> និងទឹកប្រាក់ <strong>$10.00</strong></p>
                  <p>៣. បន្ទាប់ពីទូទាត់ជោគជ័យ សូមបំពេញ Username ខាងក្រោមរួចចុច «បញ្ជាក់ការបង់ប្រាក់»</p>
                </div>
              </div>
            </div>

            {/* Account Registration & Confirmation Form */}
            <form onSubmit={handleConfirmPayment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    <span>ឈ្មោះគណនី (Username) <span className="text-red-400">*</span></span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ឧ. Sokha ឬ Dara"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400 transition"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    ឈ្មោះនេះនឹងត្រូវបានផ្តល់សិទ្ធិអចិន្ត្រៃយ៍
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>លេខទូរស័ព្ទ ឬ Telegram (ជម្រើស)</span>
                  </label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="ឧ. 012 345 678 ឬ @username"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400 transition"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    សម្រាប់ទំនាក់ទំនង និងផ្ទៀងផ្ទាត់គណនី
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-amber-400" />
                  <span>លេខកូដប្រតិបត្តិការ ឬចំណាំ (Transaction Ref / Note)</span>
                </label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="ឧ. លេខកន្ទុយប្រតិបត្តិការ ABA ឬ Bakong"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>កំពុងចុះឈ្មោះ និងផ្ទៀងផ្ទាត់សិទ្ធិ...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-slate-950" />
                    <span>ខ្ញុំបានស្កេនទូទាត់ជោគជ័យ — ចូលប្រើប្រាស់ពេញមួយជីវិត</span>
                    <ArrowRight className="w-4 h-4 text-slate-950" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
