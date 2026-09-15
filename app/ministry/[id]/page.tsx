'use client';



import { useParams, useSearchParams } from 'next/navigation';
import { useFirebase } from '@/lib/FirebaseProvider';
import { QuizType, PdfDocument } from '@/lib/types';
import { firestoreService } from '@/lib/firestore-service';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Globe, BookOpen, HelpCircle, MessageSquare, ChevronRight, CheckCircle2, ChevronLeft, FileText, Crown, Download, Lock } from 'lucide-react';
import Link from 'next/link';
import { useState, useMemo, useEffect, Suspense } from 'react';
import { QuizView } from '@/components/QuizView';
import { WebDocumentView } from '@/components/WebDocumentView';
import SafeImage from '@/components/SafeImage';

function MinistryDetailContent() {
  const params = useParams();
  const id = params?.id as string;
  const searchParams = useSearchParams();
  const rawTab = searchParams?.get('tab');
  const initialTab = (['INFO', 'MCQ', 'QA', 'VOCABULARY', 'DOCUMENTS'].includes(rawTab || '') ? rawTab : 'INFO') as 'INFO' | 'MCQ' | 'QA' | 'VOCABULARY' | 'DOCUMENTS';
  const { ministries, loading, authLoading, user, saveProgress, isPremium, userRole } = useFirebase();
  const [activeTab, setActiveTab] = useState<'INFO' | 'MCQ' | 'QA' | 'VOCABULARY' | 'DOCUMENTS'>(initialTab);
  const [navigationPath, setNavigationPath] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [documents, setDocuments] = useState<PdfDocument[]>([]);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfCategory, setPdfCategory] = useState<string | null>(null);

  const handleDownloadPdf = async (categoryPath: string | null = null) => {
    if (!ministry) return;
    setIsDownloadingPdf(true);
    setPdfCategory(categoryPath);
    
    setTimeout(async () => {
      try {
        const element = document.getElementById('pdf-print-template');
        if (!element) throw new Error("Template not found");
        
        const { toJpeg } = await import('html-to-image');
        const { jsPDF } = await import('jspdf');

        const imgData = await toJpeg(element, {
          quality: 0.95,
          pixelRatio: 2,
          backgroundColor: '#ffffff'
        });
        
        const pdf = new jsPDF({
          orientation: 'p',
          unit: 'px',
          format: [element.offsetWidth, element.offsetHeight]
        });
        
        pdf.addImage(imgData, 'JPEG', 0, 0, element.offsetWidth, element.offsetHeight);
        const suffix = categoryPath ? `_${categoryPath.replace(/\s+/g, '_').replace(/\//g, '-')}` : '';
        pdf.save(`Vignasa_${ministry.khmerName.replace(/\s+/g, '_')}${suffix}.pdf`);
      } catch (err) {
        console.error(err);
        alert("បរាជ័យក្នុងការទាញយក PDF។");
      } finally {
        setIsDownloadingPdf(false);
        setPdfCategory(null);
      }
    }, 200); // give react time to re-render the template
  };

  const ministry = ministries.find(m => m.id === id);

  useEffect(() => {
    if (ministry) {
      firestoreService.getDocumentsByMinistry(ministry.id).then(setDocuments);
    }
  }, [ministry]);

  const categoryTree = useMemo(() => {
    if (!ministry || !ministry.quizzes) return {};
    const type = activeTab === 'MCQ' ? 'MULTIPLE_CHOICE' : activeTab === 'QA' ? 'Q_AND_A' : 'VOCABULARY';
    const filtered = ministry.quizzes.filter(q => (q.type || 'MULTIPLE_CHOICE') === type);
    const uniqueCategories = Array.from(
      new Set(
        filtered
          .map(q => q.category)
          .filter((c): c is string => typeof c === 'string' && c.trim() !== '')
      )
    );
    
    interface CategoryNode {
      isLeaf: boolean;
      fullPath: string | null;
      children: Record<string, CategoryNode>;
    }
    const tree: Record<string, CategoryNode> = {};
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

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent text-slate-700 font-bold">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
          <p className="text-sm">កំពុងផ្ទុកទិន្នន័យ...</p>
        </div>
      </div>
    );
  }

  if (!ministry) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-transparent px-6 text-center">
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

  const isBlocked = !user;
  
  const pdfQuizzes = ministry.quizzes ? (pdfCategory 
    ? ministry.quizzes.filter(q => q.category && (q.category === pdfCategory || q.category.startsWith(pdfCategory + '/')))
    : ministry.quizzes) : [];

  return (
    <div className="min-h-screen bg-transparent">
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
            <div className="flex-1 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
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
              
              {userRole === 'ADMIN' && (
                <button
                  onClick={() => handleDownloadPdf(null)}
                  disabled={isDownloadingPdf}
                  className="inline-flex items-center justify-center px-4 py-2 bg-blue-600/80 hover:bg-blue-600 text-white text-sm font-bold rounded-xl backdrop-blur-md border border-blue-500/30 transition-all shadow-lg hover:shadow-blue-500/20 disabled:opacity-50"
                >
                  {isDownloadingPdf ? (
                    <span className="animate-pulse">កំពុងទាញយក...</span>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      ទាញយកជា PDF
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {isBlocked ? (
        <main className="max-w-xl mx-auto px-6 py-12">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 md:p-12 text-center rounded-[2rem] bg-white border-2 border-amber-500/30 shadow-2xl relative overflow-hidden"
            style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h20v20H0V0zm10 17L3 10l7-7 7 7-7 7z\' fill=\'%23D4AF37\' fill-opacity=\'0.02\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")'
            }}
          >
            {/* Background Effects */}
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl opacity-60" />
            <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl opacity-60" />

            <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 mb-6 shadow-inner">
              <Lock className="w-10 h-10" />
            </div>

            <div className="space-y-4">
              <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
                សូមចូលគណនីដើម្បីចូលរៀន!
              </h2>

              <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
                ដើម្បីអនុវត្តសួរចម្លើយ វិញ្ញាសាពហុចម្លើយ មើលវាក្យសព្ទ និងទាញយកសន្លឹកកិច្ចការ PDF របស់ <strong className="text-slate-800 font-bold">{ministry.khmerName}</strong> សូមចូលគណនីរបស់អ្នកជាមុនសិន។
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-4">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center gap-2">
                <Link
                  href="/"
                  className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
                >
                  ត្រឡប់ទៅកម្មវិធីដើម្បីចូលគណនី
                </Link>
              </div>
            </div>
          </motion.div>
        </main>
      ) : (
        <>
          {/* Tabs */}
          <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
            <div className="max-w-5xl mx-auto px-6">
              <div className="flex gap-8 overflow-x-auto no-scrollbar">
                {(
                  [
                    { id: 'INFO', label: 'ព័ត៌មានទូទៅ', icon: BookOpen },
                    { id: 'MCQ', label: 'ផ្នែកសំណួរពហុចម្លើយ', icon: HelpCircle },
                    { id: 'QA', label: 'ផ្នែកសំណួរចម្លើយ', icon: MessageSquare },
                    { id: 'VOCABULARY', label: 'ផ្នែកពន្យល់ពាក្យ', icon: Globe },
                    { id: 'DOCUMENTS', label: 'ឯកសារ (Web Document)', icon: FileText }
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
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
          <main className="max-w-5xl mx-auto px-6 py-8" style={{ backgroundColor: '#d4cda8' }}>
            <AnimatePresence mode="wait">
              {!isPremium && ['MCQ', 'QA', 'VOCABULARY'].includes(activeTab) ? (
                <motion.div
                  key="premium-blocked"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="max-w-xl mx-auto p-8 md:p-12 text-center rounded-[2rem] bg-white border-2 border-[#D4AF37]/50 shadow-2xl relative overflow-hidden"
                >
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 mb-6 shadow-inner">
                    <Crown className="w-10 h-10" />
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 font-khmer">
                      លក្ខណៈនេះសម្រាប់តែគណនី Premium
                    </h2>
                    <p className="text-sm text-slate-500 font-khmer max-w-md mx-auto leading-relaxed">
                      ដើម្បីអាចធ្វើតេស្តវិញ្ញាសា (ពហុចម្លើយ, សំណួរចម្លើយ និងវាក្យសព្ទ) សូមអាប់ដេតគណនីរបស់អ្នកទៅជាគម្រោង Premium ឬ VIP។
                    </p>
                  </div>
                  <div className="mt-8 text-center p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <p className="text-sm font-bold text-amber-800 font-khmer">កំណាត់សម្គាល់</p>
                    <p className="text-sm text-amber-700 font-khmer mt-2">គម្រោង Premium ត្រូវបានផ្ដល់ជូនដោយអ្នកគ្រប់គ្រងផ្ទាល់។ សូមទាក់ទងអ្នកគ្រប់គ្រងដើម្បីទទួលបានសិទ្ធិប្រើប្រាស់។</p>
                  </div>
                </motion.div>
              ) : selectedCategory && activeTab !== 'DOCUMENTS' ? (
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
              ) : activeTab === 'DOCUMENTS' ? (
                <motion.div
                  key="documents"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <WebDocumentView ministry={ministry} documents={documents} />
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
                      <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm whitespace-pre-wrap">
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
                          <div key={part} className="group bg-white p-4 md:p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
                            <button
                              onClick={() => {
                                  if (node.isLeaf) {
                                      setSelectedCategory(node.fullPath);
                                  } else {
                                      setNavigationPath([...navigationPath, part]);
                                  }
                              }}
                              className="flex-1 text-left flex items-center gap-4 w-full"
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
                            
                            {userRole === 'ADMIN' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadPdf(node.fullPath);
                                }}
                                disabled={isDownloadingPdf}
                                className="inline-flex items-center justify-center px-4 py-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 text-sm font-bold rounded-xl transition-colors disabled:opacity-50 border border-slate-200 hover:border-blue-200 w-full sm:w-auto mt-2 sm:mt-0"
                              >
                                {isDownloadingPdf && pdfCategory === node.fullPath ? (
                                  <span className="animate-pulse">...</span>
                                ) : (
                                  <>
                                    <Download className="w-4 h-4 mr-2" />
                                    PDF
                                  </>
                                )}
                              </button>
                            )}
                          </div>
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
        </>
      )}

      {/* Dynamic Off-screen High-Fidelity Printable Template with native browser layout capability */}
      {ministry && ministry.quizzes && (
        <div className="absolute left-[-9999px] top-0 pointer-events-none select-none z-[-1]" style={{ width: "794px" }}>
          <div id="pdf-print-template" style={{ width: "794px", fontFamily: "\"Times New Roman\", var(--font-khmer), sans-serif", color: "#111827", backgroundColor: "#ffffff", padding: "48px", textAlign: "left" }}>
            {/* Cambodian Traditional Royal Header */}
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "bold", letterSpacing: "0.025em", margin: "0 0 6px 0", fontFamily: "\"Times New Roman\", var(--font-khmer)", color: "#111827" }}>ព្រះរាជាណាចក្រកម្ពុជា</h3>
              <h4 style={{ fontSize: "14px", fontWeight: "600", letterSpacing: "0.05em", margin: "0 0 8px 0", fontFamily: "\"Times New Roman\", var(--font-khmer)", color: "#374151" }}>ជាតិ សាសនា ព្រះមហាក្សត្រ</h4>
              {/* Double traditional Cambodian wavy divider or dotted separator */}
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", paddingTop: "4px" }}>
                <span style={{ width: "6px", height: "6px", backgroundColor: "#111827", borderRadius: "50%", display: "inline-block" }} />
                <span style={{ width: "56px", height: "1px", backgroundColor: "#64748b", display: "inline-block" }} />
                <span style={{ width: "6px", height: "6px", backgroundColor: "#111827", borderRadius: "50%", display: "inline-block" }} />
              </div>
            </div>

            {/* Ministry Specific Information Section */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #cbd5e1", paddingBottom: "16px", marginBottom: "24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: "bold", color: "#094C72", margin: 0, fontFamily: "\"Times New Roman\", var(--font-khmer)" }}>{ministry.khmerName}</h2>
                <p style={{ fontSize: "10px", color: "#64748b", fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>{ministry.name}</p>
              </div>
              <div style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "monospace", fontWeight: "bold" }}>
                ID: {ministry.id.toUpperCase()}
              </div>
            </div>

            {/* Main Worksheet Title */}
            <div style={{ textAlign: "center", marginBottom: "40px" }}>
              <h1 style={{ fontSize: "20px", fontWeight: "800", color: "#094C72", margin: "0 0 6px 0", fontFamily: "\"Times New Roman\", var(--font-khmer)" }}>
                សន្លឹកកិច្ចការ និងកម្រងវិញ្ញាសាត្រៀមប្រឡងក្របខ័ណ្ឌរដ្ឋ
              </h1>
              <p style={{ fontSize: "12px", color: "#64748b", fontWeight: "500", margin: 0 }}>
                ឯកសារសិក្សាផ្លូវការ (Official Civil Service Practice Workbook)
              </p>
            </div>

            {/* Quizzes Wrapper */}
            <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
              {pdfQuizzes.map((quiz, idx) => (
                <div key={idx} style={{ padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", marginBottom: "24px", display: "block" }}>
                  {/* Question header */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px", marginBottom: "16px" }}>
                    <span style={{ padding: "4px 12px", backgroundColor: "#094C72", color: "#ffffff", fontSize: "10px", fontWeight: "bold", borderRadius: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      សំណួរទី {idx + 1}
                    </span>
                    <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "monospace" }}>
                      Category: {quiz.category || "General"}
                    </span>
                  </div>

                  {/* Question */}
                  <p style={{ fontSize: "14px", fontWeight: "bold", lineHeight: "1.6", color: "#111827", margin: "0 0 16px 0", fontFamily: "\"Times New Roman\", var(--font-khmer)" }}>
                    {quiz.question}
                  </p>

                  {/* Options */}
                  {quiz.options && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px", paddingLeft: "8px", paddingTop: "4px" }}>
                      {Object.entries(quiz.options).map(([key, val]) => {
                        const isCorrect = key === quiz.correctAnswer;
                        return (
                          <div 
                            key={key} 
                            style={{
                              display: "flex",
                              alignItems: "start",
                              gap: "10px",
                              padding: "12px",
                              borderRadius: "12px",
                              border: isCorrect ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                              backgroundColor: isCorrect ? "#f0fdf4" : "#ffffff",
                              color: isCorrect ? "#166534" : "#475569",
                              fontSize: "12px",
                              lineHeight: "1.5"
                            }}
                          >
                            <span style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "6px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: "bold",
                              fontSize: "10px",
                              flexShrink: 0,
                              border: isCorrect ? "1px solid #22c55e" : "1px solid #cbd5e1",
                              backgroundColor: isCorrect ? "#22c55e" : "#f1f5f9",
                              color: isCorrect ? "#ffffff" : "#64748b"
                            }}>
                              {key.toUpperCase()}
                            </span>
                            <span style={{ fontFamily: "\"Times New Roman\", var(--font-khmer)" }}>{val}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Answer & Explanation */}
                  <div style={{ paddingTop: "10px", marginTop: "10px", borderTop: "1px dashed #cbd5e1" }}>
                    {quiz.answer && (
                      <div style={{ fontSize: "12px", fontWeight: "semibold", color: "#15803d", display: "flex", alignItems: "center", gap: "6px", fontFamily: "\"Times New Roman\", var(--font-khmer)", marginBottom: "8px" }}>
                        <span>✓ ចម្លើយដោះស្រាយ៖</span>
                        <span style={{ color: "#1e293b", fontWeight: "bold", marginLeft: "4px" }}>{quiz.answer}</span>
                      </div>
                    )}
                    {quiz.explanation && (
                      <div style={{ padding: "16px", borderRadius: "12px", backgroundColor: "#fffbeb", border: "1px solid #fef3c7", fontSize: "12px", color: "#78350f", lineHeight: "1.5", marginTop: "12px" }}>
                        <div style={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px", color: "#92400e", marginBottom: "4px" }}>
                          <span>💡 ការពន្យល់ / គន្លឹះដោះស្រាយ ៖</span>
                        </div>
                        <p style={{ margin: 0, paddingLeft: "4px", fontFamily: "\"Times New Roman\", var(--font-khmer)" }}>{quiz.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* PDF print Footer */}
            <div style={{ marginTop: "48px", paddingTop: "24px", borderTop: "1px solid #cbd5e1", textAlign: "center", fontSize: "10px", color: "#94a3b8", fontFamily: "sans-serif", letterSpacing: "0.025em" }}>
              <p style={{ margin: "0 0 4px 0" }}>© រក្សាសិទ្ធិគ្រប់យ៉ាងដោយ Cambodia Ministry Hub & Co.</p>
              <p style={{ margin: "0" }}>សិទ្ធិត្រូវបានបើកជូន៖ MEMBER ({user?.email}) • ឯកសារសិក្សាទាញយកដោយឥតគិតថ្លៃ ១០០%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MinistryDetail() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-transparent"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
      <MinistryDetailContent />
    </Suspense>
  );
}

