'use client';



import { useState, useMemo } from 'react';
import { useFirebase } from '@/lib/FirebaseProvider';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, ArrowLeft, RotateCcw, Trophy, Brain, Heart } from 'lucide-react';
import Link from 'next/link';

export default function QuizPage() {
  const { ministries, loading, authLoading, user, userRole, isPremium, favorites, toggleFavorite } = useFirebase();
  const [currentStep, setCurrentStep] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [quizSeed, setQuizSeed] = useState(0);

  // Generate a quiz from ministries data - memoized so options don't reshuffle on answer selection
  const quizzes = useMemo(() => {
    if (ministries.length < 4 || quizSeed < 0) return [];
    
    return ministries.slice(0, 5).map((m, i) => {
      const isKhmerQuestion = i % 2 === 0;
      const options = [m, ...ministries.filter(x => x.id !== m.id).sort(() => 0.5 - Math.random()).slice(0, 3)]
        .sort(() => 0.5 - Math.random());
      
      return {
        ministryId: m.id,
        question: isKhmerQuestion 
          ? `តើ " ${m.khmerName} " មានឈ្មោះជាភាសាអង់គ្លេសថាអ្វី?`
          : `Which ministry is responsible for: "${m.description}"?`,
        options: options.map(o => isKhmerQuestion ? o.name : o.khmerName),
        correctIndex: options.findIndex(o => o.id === m.id),
        explanation: `${m.khmerName} is ${m.name}.`
      };
    });
  }, [ministries, quizSeed]);

  const handleAnswer = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    setIsAnswered(true);
    if (index === quizzes[currentStep]?.correctIndex) {
      setScore(score + 1);
    }
  };

  const nextQuestion = () => {
    if (currentStep < quizzes.length - 1) {
      setCurrentStep(currentStep + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setShowResult(true);
    }
  };

  const resetQuiz = () => {
    setCurrentStep(0);
    setScore(0);
    setShowResult(false);
    setSelectedOption(null);
    setIsAnswered(false);
    setQuizSeed(s => s + 1);
  };

  const isBlocked = !user || (!isPremium && userRole !== 'ADMIN');

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent text-slate-700 font-bold">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
          <p className="text-sm">កំពុងផ្ទៀងផ្ទាត់សមាជិកភាព...</p>
        </div>
      </div>
    );
  }

  if (isBlocked) {
    const isLoggedIn = !!user;
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-6 md:p-12">
        <div className="max-w-md w-full">
          <header className="mb-8">
            <Link href="/" className="inline-flex items-center text-slate-500 hover:text-slate-800 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              ត្រឡប់ទៅដើមវិញ (Home)
            </Link>
          </header>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 text-center rounded-[2rem] bg-white border-2 border-amber-500/30 shadow-2xl relative overflow-hidden"
            style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h20v20H0V0zm10 17L3 10l7-7 7 7-7 7z\' fill=\'%23D4AF37\' fill-opacity=\'0.02\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")'
            }}
          >
            {/* Background Effects */}
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl opacity-60" />
            <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl opacity-60" />

            <div className="w-24 h-24 mx-auto rounded-3xl bg-amber-100 flex items-center justify-center text-amber-500 border border-amber-200 mb-6 shadow-inner">
              <Trophy className="w-12 h-12 fill-amber-500/20 animate-pulse" />
            </div>

            <div className="space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider">
                👑 {isLoggedIn ? 'PREMIUM REQUIRED' : 'LOGIN REQUIRED'}
              </div>

              <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
                {isLoggedIn 
                  ? 'អ្នកត្រូវការគម្រោង Premium ដើម្បីលេង!'
                  : 'សូមចូលគណនីដើម្បីចាប់ផ្ដើម!'}
              </h2>

              <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
                {isLoggedIn 
                  ? 'សាកល្បងសមត្ថភាពស្វែងយល់ពីក្រសួងនិងស្ថាប័នរដ្ឋផ្សេងៗ ជាមួយមុខងារតេស្តពិសេសរបស់សមាជិកវីរជន Premium។'
                  : 'សូមចូលគណនីរបស់អ្នកដើម្បីទទួលបានសិទ្ធិចូលប្រើមុខងារតេស្តចំណេះដឹងពិសេស។'}
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-4">
              {isLoggedIn ? (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center gap-3 text-center">
                  <p className="text-xs text-slate-500 font-bold">កំណត់សម្គាល់</p>
                  <p className="text-sm text-slate-600 font-khmer">គម្រោង Premium ត្រូវបានផ្ដល់ជូនដោយអ្នកគ្រប់គ្រងផ្ទាល់។ សូមទាក់ទងអ្នកគ្រប់គ្រងដើម្បីទទួលបានសិទ្ធិប្រើប្រាស់។</p>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center gap-3">
                  <p className="text-xs text-slate-500 font-bold">សូមសាកល្បងចូលគណនីរបស់អ្នកជាមុនសិន</p>
                  <Link
                    href="/"
                    className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
                  >
                    ចូលទៅកាន់ការចូលគណនី
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <Brain className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-black text-slate-800 mb-2 font-khmer">មិនទាន់មានទិន្នន័យគ្រប់គ្រាន់សម្រាប់វិញ្ញាសាតេស្តទេ</h2>
          <p className="text-sm text-slate-500 mb-6 font-khmer">ត្រូវការទិន្នន័យស្ថាប័នយ៉ាងតិច ៤ ដើម្បីបង្កើតសំណួរពហុជ្រើសរើស។</p>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#094C72] text-white font-bold rounded-xl text-xs font-khmer hover:bg-[#073652] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            ត្រឡប់ទៅទំព័រដើម
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        <header className="mb-12 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Home
          </Link>
          <div className="bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="font-bold text-slate-700">Score: {score}</span>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {!showResult ? (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100"
            >
              <div className="mb-8">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">
                  Question {currentStep + 1} of {quizzes.length}
                </span>
                <div className="flex justify-between items-start gap-4">
                  <h2 className="text-2xl font-bold text-slate-900 mt-4 leading-tight">
                    {quizzes[currentStep].question}
                  </h2>
                  <button 
                    onClick={() => toggleFavorite(quizzes[currentStep].ministryId)}
                    className={`mt-4 p-2 rounded-full transition-colors ${favorites.includes(quizzes[currentStep].ministryId) ? 'text-red-500 bg-red-50' : 'text-slate-300 hover:text-red-400'}`}
                  >
                    <Heart className={`w-6 h-6 ${favorites.includes(quizzes[currentStep].ministryId) ? 'fill-red-500' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="grid gap-4">
                {quizzes[currentStep].options.map((option, index) => {
                   const isCorrect = index === quizzes[currentStep].correctIndex;
                   const isSelected = selectedOption === index;
                   
                   let buttonClass = "w-full p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden ";
                   if (!isAnswered) {
                     buttonClass += "border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 text-slate-700 font-medium";
                   } else if (isCorrect) {
                     buttonClass += "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold";
                   } else if (isSelected && !isCorrect) {
                     buttonClass += "border-red-500 bg-red-50 text-red-900 font-bold";
                   } else {
                     buttonClass += "border-slate-50 bg-slate-50 text-slate-400";
                   }

                   return (
                     <button
                       key={index}
                       onClick={() => handleAnswer(index)}
                       disabled={isAnswered}
                       className={buttonClass}
                     >
                       <span className="relative z-10 flex items-center justify-between">
                         {option}
                         {isAnswered && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                         {isAnswered && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500" />}
                       </span>
                     </button>
                   );
                })}
              </div>

              {isAnswered && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 pt-8 border-t border-slate-100"
                >
                  <p className="text-slate-500 text-sm mb-6 flex items-start gap-2 italic">
                    <Brain className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    {quizzes[currentStep].explanation}
                  </p>
                  <button 
                    onClick={nextQuestion}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
                  >
                    {currentStep === quizzes.length - 1 ? 'Finish' : 'Next Question'}
                  </button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl p-12 shadow-xl border border-slate-100 text-center"
            >
              <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-12 h-12 text-amber-500" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Quiz Completed!</h2>
              <p className="text-slate-500 mb-8">You answered {score} out of {quizzes.length} correctly.</p>
              
              <div className="flex gap-4">
                <button 
                  onClick={resetQuiz}
                  className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  Try Again
                </button>
                <Link 
                  href="/"
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center"
                >
                  Go Home
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
