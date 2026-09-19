'use client';

import React from 'react';
import Link from 'next/link';
import { GraduationCap, CheckCircle2 } from 'lucide-react';
import SafeImage from '@/components/SafeImage';
import { Ministry, Progress as UserProgress } from '@/lib/types';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface MinistryListProps {
  ministries: Ministry[];
  onSelect: (ministry: Ministry, action?: string) => void;
  userProgress: UserProgress;
}

export const MinistryList: React.FC<MinistryListProps> = ({ ministries, onSelect, userProgress }) => {
  return (
    <div className="space-y-8 md:space-y-12">
      <div className="grid grid-cols-1 gap-6 md:gap-8">
        {ministries.map((ministry, idx) => {
          const quizzesLength = ministry.quizzes?.length || 0;
          const progress = userProgress[ministry.id] || { completedCount: 0, totalCount: quizzesLength };
          const compCount = progress.completedCount ?? 0;
          const totalCount = progress.totalCount ?? quizzesLength;
          const percentage = totalCount > 0 ? (compCount / totalCount) * 100 : 0;

          return (
            <motion.div
              key={ministry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.15) }}
            >
              <div 
                className={cn(
                  "group relative bg-white p-3 sm:p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center sm:items-stretch gap-4 sm:gap-6 cursor-pointer transition-all hover:shadow-md hover:border-blue-200",
                  percentage === 100 && "bg-slate-50/50"
                )}
                onClick={() => onSelect(ministry)}
              >
                {/* Logo Section */}
                <div className="relative w-24 h-24 sm:w-40 sm:h-40 bg-slate-50 rounded-xl flex items-center justify-center p-2 sm:p-4 border border-slate-100 group-hover:bg-white transition-colors duration-300 flex-shrink-0">
                  {ministry.logo ? (
                    <SafeImage 
                      src={ministry.logo} 
                      alt={ministry.name} 
                      fill
                      className="object-contain p-2 sm:p-4 group-hover:scale-105 transition-transform duration-500"
                      style={{
                        backgroundColor: '#ffffff',
                        borderStyle: 'solid',
                        borderWidth: '5px',
                        borderColor: '#0f0fef',
                        borderRadius: '36px'
                      }}
                    />
                  ) : (
                    <GraduationCap className="w-8 h-8 sm:w-12 sm:h-12 text-slate-200" />
                  )}
                  
                  {percentage === 100 && (
                    <div className="absolute -top-1 -right-1 bg-emerald-500 text-white p-0.5 sm:p-1 rounded-full shadow-lg z-20">
                      <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    </div>
                  )}
                </div>
                
                {/* Content Section */}
                <div className="flex-1 flex flex-col py-1 sm:py-2 min-w-0">
                  <div className="flex justify-between items-start mb-1 sm:mb-2">
                    <div className="space-y-0.5 sm:space-y-1 truncate">
                      <h3 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate font-khmer">
                        {ministry.khmerName || ministry.name}
                      </h3>
                      <p className="text-[10px] sm:text-sm font-medium text-slate-400 uppercase tracking-wider truncate">
                        {ministry.name}
                      </p>
                    </div>
                    <span className="hidden md:inline-block bg-slate-100 text-slate-500 text-[10px] font-mono px-2 py-1 rounded-lg">
                      {ministry.id.toUpperCase()}
                    </span>
                  </div>

                  <p className="hidden sm:block text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2 mb-4 font-khmer">
                    {ministry.description}
                  </p>

                  <div className="mt-auto space-y-2 sm:space-y-3">
                    <div className="flex justify-between items-end">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="flex -space-x-1 sm:hidden md:flex">
                          {[1, 2].map(i => (
                            <div key={i} className="w-4 h-4 rounded-full bg-slate-100 border border-white flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-slate-200" />
                            </div>
                          ))}
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider font-khmer">
                           {ministry.quizzes?.length || 0} វិញ្ញាសា
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-900">{Math.round(percentage)}%</span>
                      </div>
                    </div>

                    <div className="h-1.5 sm:h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${percentage}%` }}
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          percentage === 100 ? "bg-emerald-500" : "bg-blue-600"
                        )}
                      />
                    </div>
                  </div>
                  
                  {/* Action Buttons with instant Next.js Link prefetch */}
                  <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6 pt-4 border-t border-slate-100">
                    <Link 
                      href={`/ministry/${ministry.id}?tab=MCQ`}
                      prefetch={true}
                      onClick={(e) => { e.stopPropagation(); onSelect(ministry, 'MCQ'); }}
                      className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 sm:py-3 rounded-xl transition-colors shadow-sm text-xs sm:text-sm font-khmer"
                    >
                      ចូលធ្វើតេស្ត
                    </Link>
                    <Link 
                      href={`/ministry/${ministry.id}?tab=DOCUMENTS`}
                      prefetch={true}
                      onClick={(e) => { e.stopPropagation(); onSelect(ministry, 'DOCUMENTS'); }}
                      className="flex-1 text-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 sm:py-3 rounded-xl transition-colors shadow-sm text-xs sm:text-sm font-khmer"
                    >
                      មើលឯកសារ
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
