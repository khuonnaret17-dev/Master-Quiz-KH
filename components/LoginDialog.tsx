'use client';

import React, { useState } from 'react';
import { Shield, Users, ArrowRight, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { UserRole } from '@/lib/types';

import { 
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth } from '@/lib/firebase';


export default function LoginDialog() {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const handleGoogleLogin = async () => {
    if (!selectedRole) return;
    
    setIsLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      // Store requested role to be used during session sync
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('vignasa_session_role', selectedRole);
      }
      
      await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
      const message = err instanceof Error ? err.message : String(err);
      if (code === 'auth/popup-blocked') {
        setError('សូមអនុញ្ញាត Popup នៅក្នុង Browser របស់អ្នក ដើម្បីចូលប្រើប្រាស់។');
      } else {
        setError('មានបញ្ហាក្នុងការភ្ជាប់ទៅកាន់ Google: ' + message);
      }
      console.error(err);
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#FAF9F6] p-4">
      {/* Decorative Background */}
      <div className="absolute inset-0 overflow-hidden opacity-5 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#1B365D] rounded-full blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#D4AF37] rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl relative p-2"
      >
        <Card className="rounded-[2.5rem] md:rounded-[3rem] border-none shadow-[0_30px_80px_rgba(27,54,93,0.15)] overflow-hidden bg-white">
          <CardHeader className="bg-[#1B365D] text-white p-8 md:p-12 text-center space-y-4 md:space-y-6 relative">
            <div className="absolute top-0 left-0 w-full h-full prestige-gradient opacity-10" />
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl md:rounded-[1.5rem] flex items-center justify-center mx-auto mb-2 shadow-2xl relative z-10"
            >
              <BookOpen className="h-8 w-8 md:h-10 md:w-10 text-[#1B365D]" />
            </motion.div>
            <div className="relative z-10">
              <CardTitle className="text-2xl md:text-3xl font-bold tracking-tight font-serif">
                វិញ្ញាសា<span className="text-[#D4AF37]">កម្ពុជា</span>
              </CardTitle>
              <CardDescription className="text-white/40 text-[8px] md:text-[10px] mt-2 md:mt-4 uppercase tracking-[0.4em] font-bold">ប្រព័ន្ធសិក្សាវិញ្ញាសារបស់អ្នក</CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="p-8 md:p-12 space-y-8 md:space-y-10">
            <AnimatePresence mode="wait">
              {!selectedRole ? (
                <motion.div 
                  key="role-selection"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6 md:space-y-8"
                >
                  <div className="text-center space-y-2">
                    <h3 className="text-lg md:text-xl font-bold text-[#1B365D]">សូមជ្រើសរើសប្រភេទគណនី</h3>
                    <p className="text-xs md:text-sm text-[#1A1A1A]/60">ដើម្បីចាប់ផ្តើម សូមជ្រើសរើសតួនាទីរបស់អ្នក</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    <button 
                      onClick={() => setSelectedRole('MEMBER')}
                      className="group p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] border-2 border-[#1B365D]/5 hover:border-[#1B365D] hover:bg-[#1B365D]/5 transition-all text-center space-y-3 md:space-y-4"
                    >
                      <div className="w-12 h-12 md:w-16 md:h-16 bg-[#FAF9F6] rounded-xl md:rounded-2xl flex items-center justify-center mx-auto group-hover:bg-white group-hover:shadow-lg transition-all">
                        <Users className="w-6 h-6 md:w-8 md:h-8 text-[#1D4ED8]" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#1B365D] text-sm md:text-base">ចូលជាសមាជិក</h4>
                        <p className="text-[8px] md:text-[10px] text-black/40 mt-1 uppercase tracking-widest leading-none">សម្រាប់សិស្ស-និស្សិត</p>
                      </div>
                    </button>

                    <button 
                      onClick={() => setSelectedRole('ADMIN')}
                      className="group p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] border-2 border-[#1B365D]/5 hover:border-[#1B365D] hover:bg-[#1B365D]/5 transition-all text-center space-y-3 md:space-y-4"
                    >
                      <div className="w-12 h-12 md:w-16 md:h-16 bg-[#FAF9F6] rounded-xl md:rounded-2xl flex items-center justify-center mx-auto group-hover:bg-white group-hover:shadow-lg transition-all">
                        <Shield className="w-6 h-6 md:w-8 md:h-8 text-[#D4AF37]" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#1B365D] text-sm md:text-base">ចូលជាអ្នកគ្រប់គ្រង</h4>
                        <p className="text-[8px] md:text-[10px] text-black/40 mt-1 uppercase tracking-widest leading-none">សម្រាប់បុគ្គលិក-មន្ត្រី</p>
                      </div>
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="login-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6 md:space-y-8"
                >
                  <div className="flex items-center gap-4">
                    <Button 
                      variant="ghost" 
                      onClick={() => setSelectedRole(null)}
                      className="w-8 h-8 md:w-10 md:h-10 rounded-full p-0 flex items-center justify-center"
                    >
                      <ArrowRight className="h-3 w-3 md:h-4 md:w-4 rotate-180" />
                    </Button>
                    <div>
                      <h3 className="text-lg md:text-xl font-bold text-[#1B365D]">
                        ចូលជា{selectedRole === 'ADMIN' ? 'អ្នកគ្រប់គ្រង' : 'សមាជិក'}
                      </h3>
                      <p className="text-xs text-[#1A1A1A]/60">សូមប្រើប្រាស់គណនី Google របស់អ្នក</p>
                    </div>
                  </div>

                  <div className="bg-[#FAF9F6] p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-[#1B365D]/5 space-y-6">
                    <p className="text-xs md:text-sm text-[#1A1A1A]/60 leading-relaxed text-center">
                      {selectedRole === 'ADMIN' 
                        ? 'ការចូលជាអ្នកគ្រប់គ្រង តម្រូវឱ្យមានការអនុញ្ញាតជាមុនពីប្រព័ន្ធ។' 
                        : 'សមាជិកអាចរក្សារាល់រាល់វឌ្ឍនភាពសិក្សា និងពិន្ទុវិញ្ញាសាបានភ្លាមៗ។'}
                    </p>

                    <Button 
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                      className="w-full h-14 md:h-16 bg-white border-2 border-[#1B365D]/10 hover:border-[#1B365D] hover:bg-white text-[#1B365D] rounded-xl md:rounded-2xl text-[10px] md:text-sm font-bold transition-all flex items-center justify-center gap-3 md:gap-4 group shadow-sm"
                    >
                      {isLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 md:h-5 md:w-5 border-2 border-[#1B365D] border-t-transparent" />
                      ) : (
                        <>
                          <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                          </svg>
                          <span>បន្តជាមួយ Google</span>
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-[9px] md:text-[10px] font-bold uppercase tracking-widest bg-red-50 p-3 md:p-4 rounded-xl md:rounded-2xl text-center italic"
              >
                * {error}
              </motion.div>
            )}
          </CardContent>

          <CardFooter className="p-6 md:p-8 pt-0 flex flex-col gap-4 md:gap-6">
            <div className="flex items-center gap-4 w-full">
              <div className="h-[1px] flex-grow bg-[#1B365D]/10" />
              <span className="text-[8px] md:text-[9px] uppercase tracking-[0.3em] font-bold text-[#1B365D]/30">Vignasa Cambodia</span>
              <div className="h-[1px] flex-grow bg-[#1B365D]/10" />
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
