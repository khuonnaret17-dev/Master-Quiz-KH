'use client';

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { ChevronLeft, ChevronRight, Award, HelpCircle, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import SafeImage from '@/components/SafeImage';
import { Ministry, Quiz, QuizType } from '@/lib/types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { CategorySection } from '@/components/WebDocumentView';
import { generateQuizImageBlob } from '@/lib/quiz-image-generator';

interface QuizViewProps {
  ministry: Ministry;
  category: string;
  quizType: QuizType;
  onBack: () => void;
  onComplete: (score: number) => void;
}

export const QuizView: React.FC<QuizViewProps> = ({ ministry, category, quizType, onBack, onComplete }) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [isFinished, setIsFinished] = useState(false);
  const [showIntermediateResult, setShowIntermediateResult] = useState(false);

  const [shuffledOptions, setShuffledOptions] = useState<{ originalKey: string; value: string }[]>([]);

  const handleShareTelegram = async () => {
    if (!currentQuiz) return;
    setIsSharing(true);
    try {
      const blob = await generateQuizImageBlob(
        {
          question: currentQuiz.question,
          type: quizType === 'MULTIPLE_CHOICE' ? 'mcq' : 'qa',
          options: currentQuiz.options,
          correctAnswer: currentQuiz.correctAnswer,
          answer: currentQuiz.answer,
          explanation: currentQuiz.explanation
        },
        {
          khmerName: ministry.khmerName,
          name: ministry.name,
          logo: ministry.logo
        }
      );

      const file = new File([blob], `Vignasa_Quiz_${currentIdx + 1}.png`, { type: 'image/png' });
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Vignasa Quiz Share',
          text: `សំណួរទី ${currentIdx + 1}: ${currentQuiz.question}`
        });
      } else {
        // Fallback: Download the image
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Vignasa_Quiz_${currentIdx + 1}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert("រូបភាពត្រូវបានរក្សាទុក! អ្នកអាចផ្ញើវាទៅកាន់ Telegram បាន។");
      }
    } catch (err) {
      console.error("Sharing failed:", err);
      alert("បរាជ័យក្នុងការចែករំលែករូបភាព។");
    } finally {
      setIsSharing(false);
    }
  };

  React.useEffect(() => {
    const filtered = (ministry.quizzes || []).filter(q => q.category === category && (q.type || 'MULTIPLE_CHOICE') === quizType);
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    
    const timer = setTimeout(() => {
      setQuizzes(shuffled);
      setCurrentIdx(0);
      setSelectedOption(null);
      setShowExplanation(false);
      setRevealed(false);
      setAnswers({});
      setIsFinished(false);
      setShowIntermediateResult(false);
      setIsLoading(false);
    }, 0);
    
    return () => clearTimeout(timer);
  }, [category, quizType, ministry]);

  const currentQuiz = quizzes[currentIdx];

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (quizType === 'MULTIPLE_CHOICE' && currentQuiz && currentQuiz.options) {
      const entries = Object.entries(currentQuiz.options);
      const shuffled = [...entries].sort(() => Math.random() - 0.5);
      const mapped = shuffled.map(([originalKey, value]) => ({ originalKey, value }));
      timer = setTimeout(() => {
        setShuffledOptions(mapped);
      }, 0);
    } else {
      timer = setTimeout(() => {
        setShuffledOptions([]);
      }, 0);
    }
    return () => clearTimeout(timer);
  }, [currentQuiz, quizType]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full"
        />
        <p className="text-sm font-medium text-[#1B365D]/60 font-khmer">កំពុងរៀបចំសំណួរ...</p>
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div className="text-center py-24 space-y-6 max-w-sm mx-auto">
        <p className="text-lg text-[#1A1A1A]/70 font-khmer">មិនមានសំណួរសម្រាប់វិញ្ញាសានេះទេ។</p>
        <Button onClick={onBack} className="font-khmer bg-[#1B365D] text-white hover:bg-[#1B365D]/90 h-12 px-6 rounded-xl">
          ត្រឡប់ក្រោយ
        </Button>
      </div>
    );
  }

  if (quizType === 'Q_AND_A' || quizType === 'VOCABULARY') {
    return (
      <div className="max-w-4xl mx-auto pb-24 space-y-6 animate-in fade-in slide-in-from-bottom-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <Button 
            variant="ghost" 
            onClick={onBack} 
            className="group gap-2 md:gap-3 text-[10px] md:text-[10px] uppercase tracking-widest font-bold rounded-xl px-2 md:px-4"
            style={{ color: 'rgba(27, 54, 93, 0.6)', backgroundColor: 'rgba(27, 54, 93, 0.05)' }}
          >
            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> ត្រឡប់
          </Button>
        </div>
        <CategorySection category={category} items={quizzes} defaultExpanded={true} />
      </div>
    );
  }

  const optionLabels: { [key: string]: string } = {
    "A": "ក", "B": "ខ", "C": "គ", "D": "ឃ"
  };

  const handleSelect = (option: string) => {
    if (showExplanation) return;
    setSelectedOption(option);
    setAnswers(prev => ({ ...prev, [currentQuiz.id]: option }));
    setShowExplanation(true);
  };

  const handleReveal = () => {
    setRevealed(true);
    setShowExplanation(true);
  };

  const proceedToNext = () => {
    setCurrentIdx(prev => prev + 1);
    setSelectedOption(null);
    setShowExplanation(false);
    setRevealed(false);
  };

  const handleNext = () => {
    if (showIntermediateResult) {
      setShowIntermediateResult(false);
      proceedToNext();
      return;
    }

    if (currentIdx < quizzes.length - 1) {
      if ((currentIdx + 1) % 10 === 0) {
        setShowIntermediateResult(true);
      } else {
        proceedToNext();
      }
    } else {
      setIsFinished(true);
      const score = quizzes.reduce((acc, q) => {
        if (quizType === 'MULTIPLE_CHOICE') {
          return acc + (answers[q.id] === q.correctAnswer ? 1 : 0);
        }
        return acc + 1; // For Q&A and Vocabulary, we count completion for now
      }, 0);
      onComplete(score);
      if (score === quizzes.length) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }
  };

  const scoreCount = quizzes.reduce((acc, q) => {
    return acc + (answers[q.id] === q.correctAnswer ? 1 : 0);
  }, 0);

  if (isFinished || showIntermediateResult) {
    const isIntermediate = showIntermediateResult && !isFinished;
    const currentChunkStartIndex = Math.floor(currentIdx / 10) * 10;
    const currentChunkEndIndex = currentIdx;
    const chunkQuizzes = quizzes.slice(currentChunkStartIndex, currentChunkEndIndex + 1);
    
    // For QA and Vocab, score count might not mean "correctness" the same way, but it works for MCQ.
    const chunkScoreCount = chunkQuizzes.reduce((acc, q) => {
      return acc + (answers[q.id] === q.correctAnswer ? 1 : 0);
    }, 0);

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl mx-auto py-8 md:py-12 px-4"
      >
        <Card className="text-center rounded-[2rem] md:rounded-[2.5rem] border-none shadow-[0_20px_60px_rgba(27,54,93,0.1)] bg-white p-8 md:p-12 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 prestige-gradient" />
          <CardHeader>
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-xl border border-[#1B365D]/5 relative overflow-hidden p-3"
            >
              {ministry.logo ? (
                <SafeImage 
                  src={ministry.logo} 
                  alt={ministry.name} 
                  fill
                  className="object-contain p-3"
                />
              ) : (
                <Award className="w-10 h-10 md:w-12 md:h-12 text-[#D4AF37]" />
              )}
            </motion.div>
            <CardTitle className="text-3xl md:text-4xl font-bold text-[#1B365D] font-serif">
              {isIntermediate ? 'អបអរសាទរ!' : 'អបអរសាទរ!'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 md:space-y-10">
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#1B365D]/40">
                {isIntermediate ? 'លទ្ធផល ១០ សំណួរនេះ' : 'លទ្ធផលសរុបរបស់អ្នក'}
              </p>
              <div className="text-6xl md:text-8xl font-bold prestige-text-gradient">
                {isIntermediate ? chunkScoreCount : scoreCount} <span className="text-xl md:text-2xl text-[#1B365D]/20">/ {isIntermediate ? chunkQuizzes.length : quizzes.length}</span>
              </div>
            </div>
            <p className="text-sm md:text-base text-[#1A1A1A]/60 leading-relaxed max-w-sm mx-auto">
              {isIntermediate ? (
                <>អ្នកបានឆ្លងកាត់ការរៀនវិញ្ញាសា <span className="text-[#1B365D] font-bold">&quot;{category}&quot;</span> ជាបន្តបន្ទាប់។ បន្តទៅសំណួរបន្ទាប់ទៀត!</>
              ) : (
                <>អ្នកបានបញ្ចប់ការរៀនវិញ្ញាសា <span className="text-[#1B365D] font-bold">&quot;{category}&quot;</span> សម្រាប់ {ministry.name} ដោយជោគជ័យ។</>
              )}
            </p>
          </CardContent>
          <CardFooter className="pt-6 md:pt-8">
            {isIntermediate ? (
              <Button 
                className="w-full h-14 md:h-16 rounded-xl md:rounded-2xl prestige-gradient hover:shadow-lg hover:shadow-[#1B365D]/20 text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all" 
                onClick={handleNext}
              >
                បន្តទៅមុខទៀត
              </Button>
            ) : (
              <Button 
                className="w-full h-14 md:h-16 rounded-xl md:rounded-2xl prestige-gradient hover:shadow-lg hover:shadow-[#1B365D]/20 text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all" 
                onClick={onBack}
              >
                ត្រឡប់ទៅការជ្រើសរើសវិញ្ញាសា
              </Button>
            )}
          </CardFooter>
        </Card>
      </motion.div>
    );
  }

  return (
    <div id="quiz-container" className="max-w-4xl mx-auto space-y-8 md:space-y-12 pb-24">
      {/* Quiz Header */}
      <div className="flex items-center justify-between gap-4">
        <Button 
          variant="ghost" 
          onClick={onBack} 
          className="group gap-2 md:gap-3 text-[10px] md:text-[10px] uppercase tracking-widest font-bold rounded-xl px-2 md:px-4"
          style={{ color: 'rgba(27, 54, 93, 0.6)', backgroundColor: 'rgba(27, 54, 93, 0.05)' }}
        >
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> ត្រឡប់
        </Button>
        <div className="px-4 md:px-6 py-2 bg-white rounded-full border shadow-sm truncate max-w-[200px] md:max-w-none" style={{ borderColor: 'rgba(27, 54, 93, 0.05)', fontFamily: 'var(--font-khmer)' }}>
          <span className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-[#D4AF37]">
            {category}
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start gap-8 md:gap-12">
        {/* Question Area */}
        <div className="flex-grow space-y-8 md:space-y-10 w-full order-2 lg:order-1">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3">
              <span className="w-8 h-[2px] bg-[#D4AF37]" />
              <span 
                className="text-[#D4AF37] font-bold uppercase tracking-[0.4em]"
                style={{
                  fontFamily: 'Arial, sans-serif',
                  width: '132.073px',
                  height: '20.0026px',
                  paddingTop: '2px',
                  marginLeft: '-3px',
                  marginTop: '0px',
                  lineHeight: '16px',
                  fontSize: '11px',
                  borderStyle: 'solid',
                  borderRadius: '1px',
                  borderWidth: '0px'
                }}
              >
                សំណួរទី {currentIdx + 1} នៃ {quizzes.length}
              </span>
            </div>
            <h2 className="text-2xl md:text-4xl font-bold leading-[1.3] md:leading-[1.2] text-[#f8004c] whitespace-pre-wrap">
              {currentQuiz.question}
            </h2>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuiz.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {quizType === 'MULTIPLE_CHOICE' ? (
                <div className="grid grid-cols-1 gap-4 md:gap-5">
                  {shuffledOptions.map((item, index) => {
                    const key = item.originalKey;
                    const value = item.value;
                    const isSelected = selectedOption === key;
                    const isCorrect = showExplanation && key === currentQuiz.correctAnswer;
                    const isWrong = showExplanation && isSelected && key !== currentQuiz.correctAnswer;
                    
                    const slotKey = ["A", "B", "C", "D"][index] || "A";
                    const label = optionLabels[slotKey] || slotKey;

                    return (
                      <motion.button
                        whileHover={!showExplanation ? { scale: 1.015, y: -2 } : { scale: 1 }}
                        whileTap={!showExplanation ? { scale: 0.98 } : { scale: 1 }}
                        animate={
                          isSelected && isCorrect
                            ? { scale: [1, 1.04, 0.98, 1.01, 1], y: [0, -8, 2, -1, 0] }
                            : isSelected && isWrong
                            ? { x: [0, -12, 10, -8, 6, -4, 2, 0] }
                            : {}
                        }
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 15,
                          duration: 0.6
                        }}
                        key={key}
                        disabled={showExplanation}
                        onClick={() => handleSelect(key)}
                        className={cn(
                          "group relative flex items-center gap-4 md:gap-5 p-5 md:p-6 border-2 rounded-2xl md:rounded-[1.5rem] transition-all duration-500 text-left w-full overflow-hidden hover:z-10",
                          !showExplanation && "bg-white border-slate-200 hover:border-[#D4AF37] hover:shadow-[0_8px_30px_rgb(212,175,55,0.15)] hover:bg-gradient-to-br hover:from-white hover:to-[#FCF9F2]",
                          isSelected && !showExplanation && "border-[#D4AF37] bg-gradient-to-br from-white to-[#FCF9F2] ring-4 ring-[#D4AF37]/10 z-10",
                          isCorrect && "border-emerald-500 bg-emerald-50 ring-4 ring-emerald-500/20 z-10",
                          isWrong && "border-rose-500 bg-rose-50 ring-4 ring-rose-500/20 z-10",
                          showExplanation && !isCorrect && !isWrong && "border-slate-100 opacity-60 bg-slate-50/50 grayscale-[0.5]"
                        )}
                        style={{
                          boxShadow: !showExplanation && isSelected ? '0 10px 40px -10px rgba(212,175,55,0.3)' : undefined,
                        }}
                      >
                        <div className={cn(
                          "flex-shrink-0 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full border-2 font-bold text-sm md:text-base transition-all duration-500 shadow-sm z-10",
                          !showExplanation && isSelected ? "bg-[#D4AF37] text-white border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.4)] scale-110" : "bg-white text-slate-400 border-slate-200 group-hover:border-[#D4AF37] group-hover:text-[#D4AF37] group-hover:bg-[#FCF9F2]",
                          isCorrect && "bg-emerald-500 text-white border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-110",
                          isWrong && "bg-rose-500 text-white border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)] scale-110",
                          showExplanation && !isCorrect && !isWrong && "bg-slate-100 text-slate-300 border-slate-200"
                        )}>
                          {isCorrect ? <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" /> : isWrong ? <XCircle className="w-5 h-5 md:w-6 md:h-6" /> : label}
                        </div>
                        <span className={cn(
                          "flex-grow text-base md:text-lg font-medium transition-colors relative z-10",
                          isSelected || isCorrect || isWrong ? "text-slate-900 font-bold" : "text-slate-600 group-hover:text-slate-900"
                        )}
                        style={{ fontFamily: 'var(--font-khmer)' }}
                        >
                          {value}
                        </span>
                        
                        {/* Right side animated status badges */}
                        {showExplanation && (
                          <div className="relative z-15 shrink-0 ml-2">
                            {isSelected && isCorrect && (
                              <motion.div
                                initial={{ scale: 0, opacity: 0, rotate: -15 }}
                                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                transition={{ type: "spring", stiffness: 350, damping: 12, delay: 0.15 }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-bold font-khmer shadow-md shadow-emerald-500/20 border border-emerald-400"
                              >
                                <Sparkles className="w-3.5 h-3.5 animate-bounce" />
                                <span>ត្រឹមត្រូវ! 🎉</span>
                              </motion.div>
                            )}
                            {isSelected && isWrong && (
                              <motion.div
                                initial={{ scale: 0, opacity: 0, rotate: 15 }}
                                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                transition={{ type: "spring", stiffness: 350, damping: 12, delay: 0.15 }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-bold font-khmer shadow-md shadow-rose-500/20 border border-rose-400"
                              >
                                <XCircle className="w-3.5 h-3.5 animate-pulse" />
                                <span>ខុសហើយ! ❌</span>
                              </motion.div>
                            )}
                            {isCorrect && !isSelected && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.95 }}
                                transition={{ duration: 0.3, delay: 0.2 }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-850 text-xs font-medium font-khmer border border-emerald-200"
                              >
                                <span>ចម្លើយត្រឹមត្រូវ</span>
                              </motion.div>
                            )}
                          </div>
                        )}

                        {/* Sparkle burst decoration for correct chosen option */}
                        {isSelected && isCorrect && (
                          <>
                            <motion.div
                              initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                              animate={{ scale: [0, 1.25, 0], opacity: [0, 1, 0], x: [-35, -75], y: [-15, -45] }}
                              transition={{ duration: 1.2, ease: "easeOut" }}
                              className="absolute right-12 top-2 text-yellow-500 pointer-events-none z-20"
                            >
                              <Sparkles className="w-5 h-5 fill-yellow-400" />
                            </motion.div>
                            <motion.div
                              initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                              animate={{ scale: [0, 1.25, 0], opacity: [0, 1, 0], x: [15, 60], y: [15, 45] }}
                              transition={{ duration: 1.3, ease: "easeOut", delay: 0.05 }}
                              className="absolute right-24 bottom-2 text-emerald-400 pointer-events-none z-20"
                            >
                              <Sparkles className="w-4 h-4 fill-emerald-300" />
                            </motion.div>
                            <motion.div
                              initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                              animate={{ scale: [0, 1, 0], opacity: [0, 0.85, 0], x: [-25, -50], y: [15, 30] }}
                              transition={{ duration: 1.0, ease: "easeOut", delay: 0.1 }}
                              className="absolute left-1/3 top-1 text-sky-400 pointer-events-none z-20"
                            >
                              <Sparkles className="w-4 h-4 fill-sky-300" />
                            </motion.div>
                          </>
                        )}
                        
                        {isCorrect && (
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-green-500/5 rounded-2xl md:rounded-[1.5rem]" />
                        )}
                        {isWrong && (
                          <div 
                            className="absolute inset-0 bg-gradient-to-r from-transparent to-red-500/5 rounded-2xl md:rounded-[1.5rem]" 
                            style={{ backgroundColor: '#ecdada' }}
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-6 md:space-y-8">
                  {!revealed ? (
                    <Button 
                      onClick={handleReveal}
                      className="w-full h-24 md:h-32 rounded-[1.5rem] md:rounded-[2.5rem] bg-white border-2 border-dashed border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/5 hover:border-[#D4AF37] transition-all group px-4"
                    >
                      <div className="flex flex-col items-center gap-2 md:gap-3">
                        <HelpCircle className="w-6 h-6 md:w-8 md:h-8 group-hover:scale-110 transition-transform" />
                        <span className="font-bold uppercase tracking-widest text-[9px] md:text-xs">ចុចដើម្បីមើលចម្លើយត្រឹមត្រូវ</span>
                      </div>
                    </Button>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-8 md:p-10 rounded-2xl md:rounded-[2.5rem] bg-white border-2 border-green-500/20 shadow-lg shadow-green-500/5"
                    >
                      <div className="flex items-center gap-4 mb-4 md:mb-6">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-green-500 rounded-xl md:rounded-2xl flex items-center justify-center text-white">
                          <Award className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                        <h3 className="font-bold text-green-600 uppercase tracking-widest text-[10px] md:text-xs">ចម្លើយត្រឹមត្រូវ</h3>
                      </div>
                      <p className="text-xl md:text-2xl font-bold text-[#1B365D] leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'var(--font-khmer)' }}>
                        {currentQuiz.answer || currentQuiz.correctAnswer}
                      </p>
                    </motion.div>
                  )}
                </div>
              )}

              {showExplanation && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 md:space-y-6"
                >
                  {currentQuiz.explanation && (
                    <div className="p-6 md:p-8 rounded-2xl md:rounded-[2rem] bg-white border border-[#D4AF37]/20 shadow-lg shadow-[#D4AF37]/5 flex flex-col md:flex-row gap-4 md:gap-6">
                      <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 bg-[#D4AF37]/10 rounded-xl md:rounded-2xl flex items-center justify-center text-[#D4AF37]">
                        <HelpCircle className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4AF37]">ឯកសារយោង / ពន្យល់</h3>
                        <p className="text-sm md:text-base leading-relaxed text-[#1A1A1A]/80 italic font-medium whitespace-pre-wrap">
                          {currentQuiz.explanation?.split(/(https?:\/\/[^\s]+|www\.[^\s]+)/g).map((part: string, i: number) => 
                            part.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/g) ? (
                              <a key={i} href={part.startsWith('www.') ? `https://${part}` : part} target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] hover:text-[#B3932F] underline break-all not-italic font-bold relative z-10 pointer-events-auto">
                                {part}
                              </a>
                            ) : (
                              <span key={i}>{part}</span>
                            )
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end items-center pt-4 md:pt-6">
                    <Button 
                      onClick={handleNext}
                      className="h-14 md:h-16 px-8 md:px-12 rounded-xl md:rounded-2xl prestige-gradient hover:shadow-xl hover:shadow-[#1B365D]/20 text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all gap-2 md:gap-3"
                    >
                      {currentIdx < quizzes.length - 1 ? 'សំណួរបន្ទាប់' : 'មើលលទ្ធផល'} <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
