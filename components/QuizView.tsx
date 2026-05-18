'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Award, HelpCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import SafeImage from '@/components/SafeImage';
import { Ministry, Quiz, QuizType } from '@/lib/types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface QuizViewProps {
  ministry: Ministry;
  category: string;
  quizType: QuizType;
  onBack: () => void;
  onComplete: (score: number) => void;
}

export const QuizView: React.FC<QuizViewProps> = ({ ministry, category, quizType, onBack, onComplete }) => {
  const quizzes = (ministry.quizzes || []).filter(q => q.category === category && (q.type || 'MULTIPLE_CHOICE') === quizType);
  
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [isFinished, setIsFinished] = useState(false);
  const [showIntermediateResult, setShowIntermediateResult] = useState(false);

  const downloadPDF = async () => {
    const element = document.getElementById('quiz-container');
    if (!element) return;
    
    const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    
    const doc = new jsPDF('p', 'mm', 'a4');
    const imgProps = doc.getImageProperties(imgData);
    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    doc.save(`${ministry.name}_${category}.pdf`);
  };

  const viewPDF = async () => {
    const element = document.getElementById('quiz-container');
    if (!element) return;
    
    const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    
    const doc = new jsPDF('p', 'mm', 'a4');
    const imgProps = doc.getImageProperties(imgData);
    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    doc.output('dataurlnewwindow');
  };

  const currentQuiz = quizzes[currentIdx];
  const progressPercentage = ((currentIdx + 1) / quizzes.length) * 100;

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
          className="group gap-2 md:gap-3 text-[10px] md:text-[10px] uppercase tracking-widest font-bold text-[#1B365D]/60 hover:text-[#1B365D] hover:bg-[#1B365D]/5 rounded-xl px-2 md:px-4"
        >
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> ត្រឡប់
        </Button>
        <div className="flex gap-2">
          <div className="px-4 md:px-6 py-2 bg-white rounded-full border border-[#1B365D]/5 shadow-sm truncate max-w-[200px] md:max-w-none">
            <span className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-[#D4AF37]">
              {category}
            </span>
          </div>
          <div className="flex gap-2">
            <Button 
                variant="outline"
                onClick={viewPDF}
                className="rounded-full px-4 md:px-6 py-2 border border-[#1B365D]/5 flex items-center gap-2 text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-[#1B365D]"
            >
                View PDF
            </Button>
            <Button 
                variant="outline"
                onClick={downloadPDF}
                className="rounded-full px-4 md:px-6 py-2 border border-[#1B365D]/5 flex items-center gap-2 text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-[#1B365D]"
            >
                <Download className="w-3 h-3" /> PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start gap-8 md:gap-12">
        {/* Question Area */}
        <div className="flex-grow space-y-8 md:space-y-10 w-full order-2 lg:order-1">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3">
              <span className="w-8 h-[2px] bg-[#D4AF37]" />
              <span className="text-[#D4AF37] font-bold text-[10px] md:text-xs uppercase tracking-[0.4em]">សំណួរទី {currentIdx + 1} នៃ {quizzes.length}</span>
            </div>
            <h2 className="text-2xl md:text-4xl font-bold leading-[1.3] md:leading-[1.2] text-[#f8004c]">
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
                <div className="grid grid-cols-1 gap-4 md:gap-6">
                  {currentQuiz.options && Object.entries(currentQuiz.options).map(([key, value]) => {
                    const isSelected = selectedOption === key;
                    const isCorrect = showExplanation && key === currentQuiz.correctAnswer;
                    const isWrong = showExplanation && isSelected && key !== currentQuiz.correctAnswer;
                    const label = optionLabels[key] || key;

                    return (
                      <button
                        key={key}
                        disabled={showExplanation}
                        onClick={() => handleSelect(key)}
                        className={cn(
                          "group relative flex items-center gap-4 md:gap-6 p-6 md:p-8 bg-white border-2 border-transparent rounded-2xl md:rounded-[2rem] transition-all duration-300 text-left hover:shadow-xl hover:shadow-black/5 h-full min-h-[5rem]",
                          isSelected ? "border-[#1B365D] bg-[#1B365D]/[0.02]" : "border-white shadow-[0_10px_30px_rgba(0,0,0,0.03)]",
                          isCorrect && "border-green-500/50 bg-green-50/50",
                          isWrong && "border-red-500/50 bg-red-50/50",
                          showExplanation && !isCorrect && !isWrong && "opacity-60 grayscale-[0.5]"
                        )}
                      >
                        <div className={cn(
                          "flex-shrink-0 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl border-2 border-[#1B365D]/10 font-bold text-sm transition-all duration-300",
                          isSelected ? "bg-[#1B365D] text-white border-[#1B365D] scale-110" : "bg-[#FAF9F6] text-[#1B365D] group-hover:border-[#1B365D]",
                          isCorrect && "bg-green-500 text-white border-green-500",
                          isWrong && "bg-red-500 text-white border-red-500"
                        )}>
                          {label}
                        </div>
                        <span className={cn(
                          "flex-grow text-base md:text-lg font-medium transition-colors",
                          isSelected ? "text-[#1B365D]" : "text-[#1A1A1A]/70"
                        )}>
                          {value}
                        </span>
                      </button>
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
                      <p className="text-xl md:text-2xl font-bold text-[#1B365D] leading-relaxed whitespace-pre-wrap">
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
                        <h3 className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4AF37]">ការពន្យល់ (Explanation)</h3>
                        <p className="text-sm md:text-base leading-relaxed text-[#1A1A1A]/80 italic font-medium">
                          {currentQuiz.explanation}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-4 md:pt-6">
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
