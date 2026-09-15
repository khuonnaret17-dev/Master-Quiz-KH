'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import SafeImage from '@/components/SafeImage';
import { ChevronLeft, GraduationCap, Gavel, Globe, Cpu, ChevronRight, BookOpen } from 'lucide-react';
import { Ministry, QuizType } from '@/lib/types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface VignasaSelectorProps {
  ministry: Ministry;
  onSelect: (category: string, type: QuizType) => void;
  onBack: () => void;
}

const QUIZ_TYPE_LABELS: Record<QuizType, string> = {
  'MULTIPLE_CHOICE': 'ផ្នែកសំណួរពហុចម្លើយ',
  'Q_AND_A': 'ផ្នែកសំណួរចម្លើយ',
  'VOCABULARY': 'ផ្នែកពន្យល់ពាក្យ'
};

export const VignasaSelector: React.FC<VignasaSelectorProps> = ({ 
  ministry, 
  onSelect, 
  onBack,
}) => {
  const [selectedType, setSelectedType] = React.useState<QuizType | null>(null);

  const getCategoriesForType = (type: QuizType) => {
    return Array.from(
      new Set(
        (ministry.quizzes || [])
          .filter(q => (q.type || 'MULTIPLE_CHOICE') === type)
          .map(q => q.category)
          .filter((c): c is string => typeof c === 'string' && c.trim() !== '')
      )
    );
  };

  const getCategoryIcon = (category?: string) => {
    if (category?.includes('ច្បាប់')) return <Gavel className="w-6 h-6" />;
    if (category?.includes('ចំណេះដឹងទូទៅ')) return <GraduationCap className="w-6 h-6" />;
    if (category?.includes('បច្ចេកទេស')) return <Cpu className="w-6 h-6" />;
    return <Globe className="w-6 h-6" />;
  };

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={selectedType ? () => setSelectedType(null) : onBack} 
          className="group gap-3 text-[10px] uppercase tracking-widest font-bold text-[#1B365D]/60 hover:text-[#1B365D] hover:bg-[#1B365D]/5 rounded-xl px-4"
        >
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> 
          {selectedType ? 'ត្រឡប់ក្រោយ' : 'ត្រឡប់ទៅបញ្ជីក្រសួង'}
        </Button>
      </div>

      <div className="max-w-3xl">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-[1px] bg-[#D4AF37]" />
            <span className="text-[#D4AF37] font-bold text-xs uppercase tracking-[0.4em]">
              {selectedType ? QUIZ_TYPE_LABELS[selectedType] : 'ជ្រើសរើសផ្នែកសិក្សា'}
            </span>
          </div>
      <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
        {ministry.logo && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-[1.5rem] md:rounded-[2rem] p-3 md:p-4 shadow-[0_20px_50px_rgba(27,54,93,0.1)] flex items-center justify-center shrink-0 border border-[#1B365D]/5 relative"
          >
            <SafeImage 
              src={ministry.logo} 
              alt={ministry.name} 
              fill
              className="object-contain p-4 md:p-6"
            />
          </motion.div>
        )}
        <div className="space-y-3 md:space-y-4">
          <h2 className="text-3xl md:text-5xl font-bold text-[#1B365D] leading-tight font-serif">
            {ministry.name}
          </h2>
          <p className="text-[#1A1A1A]/60 text-base md:text-lg leading-relaxed max-w-xl">
            {selectedType 
              ? 'សូមជ្រើសរើសវិញ្ញាសាដែលអ្នកចង់សិក្សា និងធ្វើការវាយតម្លៃសមត្ថភាពរបស់លោកអ្នក។'
              : 'សូមជ្រើសរើសប្រភេទនៃវិញ្ញាសាដែលអ្នកចង់សិក្សា។'}
          </p>
        </div>
      </div>
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {!selectedType ? (
          <motion.div 
            key="types"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8"
          >
            {(['MULTIPLE_CHOICE', 'Q_AND_A', 'VOCABULARY'] as QuizType[]).map((type) => {
              const typeQuizzes = (ministry.quizzes || []).filter(q => (q.type || 'MULTIPLE_CHOICE') === type);
              const isAvailable = typeQuizzes.length > 0;

              return (
                <Card 
                  key={type}
                  onClick={isAvailable ? () => setSelectedType(type) : undefined}
                  className={cn(
                    "group relative rounded-[2rem] md:rounded-[2.5rem] border-none shadow-[0_15px_40px_rgba(27,54,93,0.05)] transition-all duration-500 bg-white flex flex-col h-full overflow-hidden",
                    isAvailable ? "cursor-pointer hover:shadow-[0_25px_60px_rgba(27,54,93,0.1)]" : "opacity-50 grayscale cursor-not-allowed"
                  )}
                >
                  <CardHeader className="p-8 md:p-10 pb-4 md:pb-6">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-[#FAF9F6] text-[#1B365D] rounded-2xl md:rounded-3xl flex items-center justify-center mb-6 md:mb-8 shadow-sm border border-[#1B365D]/5 overflow-hidden p-2 relative">
                      {ministry.logo ? (
                        <SafeImage 
                          src={ministry.logo} 
                          alt={ministry.name} 
                          fill
                          className="object-contain p-2"
                        />
                      ) : (
                        type === 'MULTIPLE_CHOICE' ? <GraduationCap className="w-6 h-6 md:w-8 md:h-8" /> : type === 'Q_AND_A' ? <BookOpen className="w-6 h-6 md:w-8 md:h-8" /> : <Globe className="w-6 h-6 md:w-8 md:h-8" />
                      )}
                    </div>
                    <CardTitle className="text-xl md:text-2xl font-bold text-[#1B365D] mb-2 md:mb-3 font-serif group-hover:text-[#D4AF37] transition-colors">
                      {QUIZ_TYPE_LABELS[type]}
                    </CardTitle>
                    <p className="text-[9px] md:text-[10px] text-[#1B365D]/40 font-bold uppercase tracking-[0.2em]">
                      {typeQuizzes.length} សំណួរក្នុងផ្នែកនេះ
                    </p>
                  </CardHeader>
                  <CardContent className="p-8 md:p-10 pt-0 mt-auto">
                    <div className="h-[1px] w-full bg-[#FAF9F6] mb-6 md:mb-8" />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-[#1B365D]">
                        {isAvailable ? 'ចូលទៅកាន់ផ្នែកនេះ' : 'មិនទាន់មានទិន្នន័យ'}
                      </span>
                      {isAvailable && <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-[#D4AF37]" />}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </motion.div>
        ) : (
          <motion.div 
            key="categories"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {getCategoriesForType(selectedType).map((category) => {
              const categoryQuizzes = (ministry.quizzes || []).filter(q => (q.type || 'MULTIPLE_CHOICE') === selectedType && q.category === category);
              
              return (
                <Card 
                  key={category}
                  className="group relative cursor-pointer rounded-[2.5rem] border-none shadow-[0_15px_40px_rgba(27,54,93,0.05)] hover:shadow-[0_25px_60px_rgba(27,54,93,0.1)] transition-all duration-500 bg-white flex flex-col h-full overflow-hidden"
                  onClick={() => onSelect(category, selectedType)}
                >
                  <CardHeader className="p-10 pb-6">
                    <div className="w-16 h-16 bg-[#FAF9F6] text-[#1B365D] rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500 shadow-sm border border-[#1B365D]/5 overflow-hidden p-2 relative">
                      {ministry.logo ? (
                        <SafeImage 
                          src={ministry.logo} 
                          alt={ministry.name} 
                          fill
                          className="object-contain p-2"
                        />
                      ) : (
                        getCategoryIcon(category)
                      )}
                    </div>
                    <CardTitle className="text-3xl font-bold text-[#1B365D] mb-3 font-serif group-hover:text-[#D4AF37] transition-colors">
                      {category}
                    </CardTitle>
                    <p className="text-sm text-[#1B365D]/40 font-bold uppercase tracking-[0.2em]">
                      {categoryQuizzes.length} វិញ្ញាសាប៉ុណ្ណោះក្នុងមាតិកានេះ
                    </p>
                  </CardHeader>
                  <CardContent className="p-10 pt-0 mt-auto">
                    <div className="h-[1px] w-full bg-[#FAF9F6] mb-8" />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-[#1B365D]">ចូលទៅកាន់វិញ្ញាសា</span>
                      <ChevronRight className="w-5 h-5 text-[#D4AF37]" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
