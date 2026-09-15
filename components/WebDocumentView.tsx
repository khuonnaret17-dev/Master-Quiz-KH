import React, { useState } from 'react';
import { Ministry, Quiz, PdfDocument } from '@/lib/types';
import { HelpCircle, MessageSquare, Globe, AlertCircle, ChevronDown, ChevronUp, FileText, Download } from 'lucide-react';

interface WebDocumentViewProps {
  ministry: Ministry;
  documents?: PdfDocument[];
}

export const CategorySection = ({ category, items, defaultExpanded = false }: { category: string, items: Quiz[], defaultExpanded?: boolean }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="space-y-4 bg-white/20 p-2 rounded-2xl">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left px-5 py-4 bg-white/70 shadow-sm border border-slate-100 rounded-xl hover:bg-white transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-slate-800">
            ផ្នែក៖ {category}
          </span>
          <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-lg">
            {items.length} ឯកសារ
          </span>
        </div>
        {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
      </button>
      
      {isExpanded && (
        <div className="space-y-8 pl-4 lg:pl-8 border-l-2 border-amber-200/50 mt-6 animate-in fade-in slide-in-from-top-2">
          {items.map((item, idx) => (
            <div key={item.id} className="space-y-3 bg-white/40 p-6 rounded-2xl border border-white/50 shadow-sm">
              <div className="flex gap-4">
                <span className="font-bold text-[#1B365D] mt-1 bg-white w-8 h-8 flex items-center justify-center rounded-full shadow-sm shrink-0">{idx + 1}</span>
                <div className="space-y-4 flex-1">
                  <h4 className="text-lg font-bold text-slate-900 leading-relaxed font-khmer whitespace-pre-wrap">{item.question}</h4>
                  
                  {/* Options for MCQ */}
                  {item.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {Object.entries(item.options).map(([key, value]) => {
                        const isCorrect = key === item.correctAnswer;
                        return (
                          <div 
                            key={key} 
                            className={`flex items-start gap-3 p-4 rounded-xl border ${
                              isCorrect ? 'bg-green-50 border-green-200' : 'bg-white border-slate-100'
                            }`}
                          >
                            <span className={`font-bold shrink-0 ${isCorrect ? 'text-green-600' : 'text-slate-500'}`}>
                              {key.toUpperCase()}.
                            </span>
                            <span className={`${isCorrect ? 'text-green-800 font-medium' : 'text-slate-600'} whitespace-pre-wrap`}>
                              {value as React.ReactNode}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Answer for Q&A */}
                  {item.answer && (
                    <div className="bg-blue-50/70 rounded-xl p-5 border border-blue-100/50 mt-2">
                      <p className="text-slate-800 leading-relaxed font-khmer whitespace-pre-wrap">
                        <span className="font-bold text-blue-800 mr-2 block mb-1">ចម្លើយ៖</span>
                        {item.answer?.split(/(https?:\/\/[^\s]+|www\.[^\s]+)/g).map((part: string, i: number) => 
                          part.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/g) ? (
                            <a key={i} href={part.startsWith('www.') ? `https://${part}` : part} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline break-all relative z-10 pointer-events-auto">
                              {part}
                            </a>
                          ) : (
                            <span key={i}>{part}</span>
                          )
                        )}
                      </p>
                    </div>
                  )}

                  {/* Explanation */}
                  {item.explanation && (
                    <div className="mt-4 p-4 md:p-6 rounded-2xl bg-white/90 border border-[#D4AF37]/20 shadow-sm flex flex-col md:flex-row gap-3 md:gap-4">
                      <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center text-[#D4AF37]">
                        <HelpCircle className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                      <div className="space-y-1 md:space-y-2">
                        <h3 className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4AF37]">ឯកសារយោង / ពន្យល់</h3>
                        <p className="text-sm leading-relaxed text-[#1A1A1A]/80 italic font-medium whitespace-pre-wrap">
                          {item.explanation?.split(/(https?:\/\/[^\s]+|www\.[^\s]+)/g).map((part: string, i: number) => 
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
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const WebDocumentView: React.FC<WebDocumentViewProps> = ({ ministry, documents = [] }) => {
  const quizzes = ministry.quizzes || [];
  const [activeType, setActiveType] = useState<string | null>(null);

  if (quizzes.length === 0 && documents.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-800 mb-2">មិនមានឯកសារ</h3>
        <p className="text-slate-500 text-sm">មិនទាន់មានសំណួរនិងចម្លើយដែលបានបញ្ចូលទៅក្នុងប្រព័ន្ធនៅឡើយទេ។</p>
      </div>
    );
  }

  // Group by type and category
  const grouped = quizzes.reduce((acc, quiz) => {
    const typeLabel = quiz.type === 'MULTIPLE_CHOICE' ? 'សំណួរពហុចម្លើយ' 
                    : quiz.type === 'Q_AND_A' ? 'សំណួរចម្លើយ' 
                    : quiz.type === 'VOCABULARY' ? 'ពន្យល់ពាក្យ' 
                    : 'ទូទៅ';
    
    if (!acc[typeLabel]) acc[typeLabel] = {};
    if (!acc[typeLabel][quiz.category]) acc[typeLabel][quiz.category] = [];
    acc[typeLabel][quiz.category].push(quiz);
    return acc;
  }, {} as Record<string, Record<string, Quiz[]>>);

  const typeKeys = Object.keys(grouped);
  if (documents.length > 0) {
    typeKeys.push('ឯកសារយោង (PDF)');
  }
  
  // Set initial active type if null
  if (!activeType && typeKeys.length > 0) {
    setActiveType(typeKeys[0]);
  }

  const activeCategories = (activeType && activeType !== 'ឯកសារយោង (PDF)') ? grouped[activeType] : {};

  return (
    <div className="rounded-[2rem] shadow-xl p-8 md:p-12 max-w-4xl mx-auto space-y-8" style={{ backgroundColor: '#ffffca' }}>
      <div className="text-center space-y-4 relative">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-khmer">ឯកសារមេរៀន និង វិញ្ញាសា</h1>
        <p className="text-lg text-slate-600 font-khmer mb-6">{ministry.name}</p>
      </div>

      {/* Tabs for Document Types */}
      {typeKeys.length > 1 && (
        <div className="flex flex-wrap gap-2 justify-center border-b border-slate-200/50 pb-6">
          {typeKeys.map((typeLabel) => (
            <button
              key={typeLabel}
              onClick={() => setActiveType(typeLabel)}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                activeType === typeLabel
                  ? 'bg-[#1B365D] text-white shadow-md'
                  : 'bg-white/50 text-slate-600 hover:bg-white border border-slate-200 hover:text-[#1B365D]'
              }`}
            >
              {typeLabel === 'សំណួរពហុចម្លើយ' && <HelpCircle className="w-4 h-4" />}
              {typeLabel === 'សំណួរចម្លើយ' && <MessageSquare className="w-4 h-4" />}
              {typeLabel === 'ពន្យល់ពាក្យ' && <Globe className="w-4 h-4" />}
              {typeLabel === 'ឯកសារយោង (PDF)' && <FileText className="w-4 h-4" />}
              {typeLabel}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-16 pt-4">
        {activeType && activeType !== 'ឯកសារយោង (PDF)' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-bold text-[#1B365D] border-b-2 border-[#1B365D]/10 pb-4 flex items-center gap-3">
              {activeType === 'សំណួរពហុចម្លើយ' && <HelpCircle className="w-6 h-6" />}
              {activeType === 'សំណួរចម្លើយ' && <MessageSquare className="w-6 h-6" />}
              {activeType === 'ពន្យល់ពាក្យ' && <Globe className="w-6 h-6" />}
              {activeType}
            </h2>

            <div className="space-y-4">
              {Object.entries(activeCategories).map(([category, items]) => (
                <CategorySection key={category} category={category} items={items} />
              ))}
            </div>
          </div>
        )}

        {activeType === 'ឯកសារយោង (PDF)' && documents.length > 0 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-bold text-[#1B365D] border-b-2 border-[#1B365D]/10 pb-4 flex items-center gap-3">
              <FileText className="w-6 h-6" />
              ឯកសារយោង (PDF)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map(doc => (
                <a 
                  key={doc.id}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/70 p-5 rounded-2xl border border-white flex items-center justify-between hover:bg-white hover:shadow-lg transition-all group"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-slate-800 line-clamp-2 text-sm">{doc.title}</span>
                  </div>
                  <Download className="w-5 h-5 text-slate-400 group-hover:text-blue-600 shrink-0 ml-3" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
