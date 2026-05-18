'use client';

import { useParams } from 'next/navigation';
import { useFirebase } from '@/lib/FirebaseProvider';
import { Ministry, QuizType } from '@/lib/types';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Globe, MapPin, Phone, ExternalLink, BookOpen, HelpCircle, MessageSquare, ChevronRight, CheckCircle2, ChevronLeft, Award } from 'lucide-react';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { QuizView } from '@/components/QuizView';
import SafeImage from '@/components/SafeImage';

export default function MinistryDetail() {
  const { id } = useParams();
  const { ministries, loading, user, saveProgress } = useFirebase();
  const [activeTab, setActiveTab] = useState<'INFO' | 'MCQ' | 'QA' | 'VOCABULARY'>('INFO');
  const [navigationPath, setNavigationPath] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const ministry = ministries.find(m => m.id === id);

  const categoryTree = useMemo(() => {
    if (!ministry || !ministry.quizzes) return {};
    const type = activeTab === 'MCQ' ? 'MULTIPLE_CHOICE' : activeTab === 'QA' ? 'Q_AND_A' : 'VOCABULARY';
    const filtered = ministry.quizzes.filter(q => (q.type || 'MULTIPLE_CHOICE') === type);
    const uniqueCategories = Array.from(new Set(filtered.map(q => q.category)));
    
    const tree: any = {};
    uniqueCategories.forEach(cat => {
      const parts = cat.split(' > ');
      let current = tree;
      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = { 
            isLeaf: index === parts.length - 1, 
            fullPath: index === parts.length - 1 ? cat : null, 
            children: {} 
          };
        }
        current = current[part].children;
      });
    });
    return tree;
  }, [ministry, activeTab]);

  const currentNode = useMemo(() => {
    let current = { children: categoryTree };
    navigationPath.forEach(part => {
      current = current.children[part];
    });
    return current;
  }, [categoryTree, navigationPath]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!ministry) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <Globe className="w-10 h-10 text-slate-300" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">រកមិនឃើញក្រសួងនេះទេ</h1>
        <p className="text-slate-500 mb-8">Ministry not found.</p>
        <Link 
          href="/" 
          className="flex items-center gap-2 text-blue-600 font-medium hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to list
        </Link>
      </div>
    );
  }

  const handleComplete = async (score: number) => {
    console.log(`Quiz completed with score: ${score}`);
    if (user && ministry && selectedCategory) {
      try {
        const progressKey = `${ministry.id}_${activeTab}_${selectedCategory.replace(/\s+/g, '_')}`;
        await saveProgress({
          [progressKey]: {
            score,
            completedAt: new Date().toISOString(),
            ministryId: ministry.id!,
            category: selectedCategory,
            type: activeTab
          }
        });
      } catch (err) {
        console.error("Failed to save progress:", err);
      }
    }
    setSelectedCategory(null);
  };

  const currentType: QuizType = activeTab === 'MCQ' ? 'MULTIPLE_CHOICE' : activeTab === 'QA' ? 'Q_AND_A' : 'VOCABULARY';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Header */}
      <div className="relative h-64 md:h-80 bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <SafeImage src={ministry.logo} alt="" fill className="object-cover blur-xl" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
        
        <div className="relative max-w-5xl mx-auto h-full px-6 flex flex-col justify-end pb-8">
          <Link 
            href="/" 
            className="absolute top-8 left-6 inline-flex items-center text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Home
          </Link>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row items-center md:items-end gap-6"
          >
            <div className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-3xl p-3 shadow-2xl flex-shrink-0 relative overflow-hidden">
              <SafeImage src={ministry.logo} alt={ministry.name} fill className="object-contain p-2" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <span className="inline-block px-3 py-1 bg-white/10 text-white/80 rounded-full text-xs font-mono mb-2 backdrop-blur-sm border border-white/5">
                {ministry.id.toUpperCase()}
              </span>
              <h1 className="text-2xl md:text-4xl font-bold text-white mb-1 leading-tight">
                {ministry.khmerName}
              </h1>
              <p className="text-white/70 text-sm md:text-base font-medium">
                {ministry.name}
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex gap-8 overflow-x-auto no-scrollbar">
            {[
              { id: 'INFO', label: 'ព័ត៌មានទូទៅ', icon: BookOpen },
              { id: 'MCQ', label: 'ផ្នែកសំណួរពហុចម្លើយ', icon: HelpCircle },
              { id: 'QA', label: 'ផ្នែកសំណួរចម្លើយ', icon: MessageSquare },
              { id: 'VOCABULARY', label: 'ផ្នែកពន្យល់ពាក្យ', icon: Globe }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSelectedCategory(null);
                  setNavigationPath([]);
                }}
                className={`py-4 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap font-medium text-sm ${
                  activeTab === tab.id 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {selectedCategory ? (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <QuizView 
                ministry={ministry}
                category={selectedCategory}
                quizType={currentType}
                onBack={() => {
                   setSelectedCategory(null);
                   setNavigationPath([]);
                }}
                onComplete={handleComplete}
              />
            </motion.div>
          ) : activeTab === 'INFO' ? (
            <motion.div
              key="info"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-12"
            >
              <div className="lg:col-span-3 space-y-8">
                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    Description (អំពីក្រសួង)
                  </h2>
                  <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
                    {ministry.details || ministry.description}
                  </div>
                </section>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-slate-900">
                    {navigationPath.length > 0 ? navigationPath[navigationPath.length - 1] : 'ជ្រើសរើសវិញ្ញាសា'}
                </h2>
                {navigationPath.length > 0 && (
                    <button onClick={() => setNavigationPath(navigationPath.slice(0, -1))} className="text-sm text-blue-600 font-bold flex items-center gap-1">
                        <ChevronLeft className="w-4 h-4" /> ត្រឡប់ក្រោយ
                    </button>
                )}
              </div>
              
              {Object.keys(currentNode.children).length > 0 ? (
                <div className="space-y-4">
                  {Object.keys(currentNode.children).sort().map((part) => {
                    const node = currentNode.children[part];
                    
                    return (
                      <button
                        key={part}
                        onClick={() => {
                            if (node.isLeaf) {
                                setSelectedCategory(node.fullPath);
                            } else {
                                setNavigationPath([...navigationPath, part]);
                            }
                        }}
                        className={`group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all text-left flex items-center gap-4 w-full`}
                      >
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-900 font-serif group-hover:text-blue-600 transition-colors">
                            {part}
                            </h3>
                        </div>
                        <ChevronRight className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-20 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <HelpCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-400">មិនទាន់មានទិន្នន័យនៅឡើយទេ</h3>
                  <p className="text-slate-300 text-sm">ព័ត៌មាននឹងត្រូវបន្ថែមក្នុងពេលឆាប់ៗនេះ</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

