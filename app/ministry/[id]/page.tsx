'use client';

export const dynamic = 'force-dynamic';

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
    
    // Give React time to re-render the template with the chosen category
    setTimeout(async () => {
      try {
        // Ensure web fonts are completely loaded for crystal-clear glyph rendering
        if (typeof document !== 'undefined' && document.fonts) {
          await document.fonts.ready;
        }

        const element = document.getElementById('pdf-print-template');
        if (!element) throw new Error("Template not found");

        // Workaround for html-to-image bug (Cannot read properties of undefined (reading 'split'))
        // Ensures all child elements have a defined style.fontFamily to prevent the internal font parser from crashing
        const ensureFontFamily = (el: HTMLElement) => {
          if (!el.style.fontFamily) {
            try {
              const comp = window.getComputedStyle(el);
              el.style.fontFamily = (comp && comp.fontFamily) ? comp.fontFamily : 'sans-serif';
            } catch {
              el.style.fontFamily = 'sans-serif';
            }
          }
          Array.from(el.children).forEach(child => {
            if (child instanceof HTMLElement) ensureFontFamily(child);
          });
        };
        ensureFontFamily(element);
        
        // Capture at 3x ultra-sharp resolution (equivalent to ~300 DPI high-grade print)
        const { toCanvas, toPng } = await import('html-to-image');
        let fullCanvas: HTMLCanvasElement;
        try {
          fullCanvas = await toCanvas(element, {
            pixelRatio: 3,
            backgroundColor: '#ffffff',
            cacheBust: true,
          });
        } catch (canvasErr) {
          console.warn("toCanvas fallback to toPng:", canvasErr);
          const pngUrl = await toPng(element, {
            pixelRatio: 3,
            backgroundColor: '#ffffff',
            cacheBust: true,
          });
          fullCanvas = await new Promise<HTMLCanvasElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              const c = document.createElement('canvas');
              c.width = img.width;
              c.height = img.height;
              const ctx = c.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                resolve(c);
              } else {
                reject(new Error("Failed to get 2d context"));
              }
            };
            img.onerror = reject;
            img.src = pngUrl;
          });
        }

        const elementWidth = element.offsetWidth || 794;
        const totalHeight = element.offsetHeight;
        const scale = fullCanvas.width / elementWidth; // 3x scale factor

        // Standard A4 dimensions at 794px width (ratio 297/210 ≈ 1.414): 1123px height
        const A4_HEIGHT_PX = 1123;
        const targetPageWidth = Math.round(794 * scale);
        const targetPageHeight = Math.round(A4_HEIGHT_PX * scale);

        // Find question card elements to avoid slicing questions across page breaks
        const cards = Array.from(element.querySelectorAll<HTMLElement>('.pdf-quiz-card'));
        const cardBoxes = cards.map(c => ({
          top: c.offsetTop,
          bottom: c.offsetTop + c.offsetHeight,
          height: c.offsetHeight
        }));

        // Calculate intelligent page cuts along question card gaps
        const cuts: number[] = [0];
        let currentTop = 0;

        while (currentTop < totalHeight) {
          const isFirstPage = cuts.length === 1;
          const availableHeight = isFirstPage ? 1060 : 1020;
          const targetBottom = currentTop + availableHeight;

          if (targetBottom >= totalHeight) {
            cuts.push(totalHeight);
            break;
          }

          // Find the last card that fits completely before targetBottom
          let bestCut = -1;
          for (let i = 0; i < cardBoxes.length; i++) {
            const box = cardBoxes[i];
            const nextTop = i + 1 < cardBoxes.length ? cardBoxes[i + 1].top : totalHeight;
            if (box.bottom <= targetBottom && box.bottom > currentTop) {
              bestCut = Math.round((box.bottom + nextTop) / 2);
            }
          }

          if (bestCut > currentTop) {
            cuts.push(bestCut);
            currentTop = bestCut;
          } else {
            cuts.push(targetBottom);
            currentTop = targetBottom;
          }
        }

        const totalPages = cuts.length - 1;
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
          compress: true
        });

        for (let p = 0; p < totalPages; p++) {
          const sliceTop = cuts[p];
          const sliceBottom = cuts[p + 1];
          const sliceHeight = sliceBottom - sliceTop;

          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = targetPageWidth;
          pageCanvas.height = targetPageHeight;
          const ctx = pageCanvas.getContext('2d');
          if (!ctx) continue;

          // Pure white background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetPageWidth, targetPageHeight);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // On page 1 start at 0, on subsequent pages add top margin
          const destY = p === 0 ? 0 : Math.round(36 * scale);

          ctx.drawImage(
            fullCanvas,
            0,
            Math.round(sliceTop * scale),
            fullCanvas.width,
            Math.round(sliceHeight * scale),
            0,
            destY,
            fullCanvas.width,
            Math.round(sliceHeight * scale)
          );

          // Draw crisp professional A4 page footer with divider line and page numbering
          const footerY = Math.round((A4_HEIGHT_PX - 22) * scale);
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 1 * scale;
          ctx.beginPath();
          ctx.moveTo(Math.round(48 * scale), footerY);
          ctx.lineTo(Math.round((794 - 48) * scale), footerY);
          ctx.stroke();

          ctx.fillStyle = '#64748b';
          ctx.font = `${Math.round(9 * scale)}px 'Kantumruy Pro', 'Battambang', sans-serif`;
          ctx.textAlign = 'left';
          ctx.fillText(
            `${ministry.khmerName} • កម្រងវិញ្ញាសាត្រៀមប្រឡងក្របខ័ណ្ឌរដ្ឋ`,
            Math.round(48 * scale),
            footerY + Math.round(14 * scale)
          );

          ctx.textAlign = 'right';
          ctx.fillText(
            `ទំព័រទី ${p + 1} នៃ ${totalPages}`,
            Math.round((794 - 48) * scale),
            footerY + Math.round(14 * scale)
          );

          if (p > 0) {
            pdf.addPage('a4', 'portrait');
          }

          const pageImgData = pageCanvas.toDataURL('image/png');
          pdf.addImage(pageImgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
        }

        const suffix = categoryPath ? `_${categoryPath.replace(/\s+/g, '_').replace(/\//g, '-')}` : '';
        pdf.save(`Vignasa_${ministry.khmerName.replace(/\s+/g, '_')}${suffix}.pdf`);
      } catch (err) {
        console.error("PDF generation error:", err);
        alert("បរាជ័យក្នុងការទាញយក PDF។ សូមព្យាយាមម្ដងទៀត។");
      } finally {
        setIsDownloadingPdf(false);
        setPdfCategory(null);
      }
    }, 250);
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
              
              {(userRole === 'ADMIN' || isPremium || !isBlocked) && (
                <button
                  onClick={() => handleDownloadPdf(null)}
                  disabled={isDownloadingPdf}
                  className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl backdrop-blur-md border border-blue-400/30 transition-all shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 gap-2"
                  title="ទាញយកវិញ្ញាសាទាំងអស់ជាឯកសារ PDF កម្រិតច្បាស់ខ្ពស់"
                >
                  {isDownloadingPdf && !pdfCategory ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>កំពុងទាញយក PDF កម្រិតច្បាស់...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>ទាញយកជា PDF (កម្រិតច្បាស់)</span>
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
            <AnimatePresence initial={false}>
              {!isPremium && ['MCQ', 'QA', 'VOCABULARY'].includes(activeTab) ? (
                <motion.div
                  key="premium-blocked"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  <WebDocumentView ministry={ministry} documents={documents} />
                </motion.div>
              ) : activeTab === 'INFO' ? (
                <motion.div
                  key="info"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
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
                            
                            {(userRole === 'ADMIN' || isPremium || !isBlocked) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadPdf(node.fullPath);
                                }}
                                disabled={isDownloadingPdf}
                                className="inline-flex items-center justify-center px-4 py-2 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 text-sm font-bold rounded-xl transition-colors disabled:opacity-50 border border-slate-200 hover:border-blue-200 w-full sm:w-auto mt-2 sm:mt-0 gap-1.5"
                                title="ទាញយកវិញ្ញាសាផ្នែកនេះជា PDF កម្រិតច្បាស់"
                              >
                                {isDownloadingPdf && pdfCategory === node.fullPath ? (
                                  <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Download className="w-4 h-4" />
                                )}
                                <span>PDF</span>
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
        <div style={{ position: "fixed", top: 0, left: "-9999px", width: "794px", pointerEvents: "none", zIndex: -999, backgroundColor: "#ffffff" }}>
          <div 
            id="pdf-print-template" 
            style={{ 
              width: "794px", 
              fontFamily: "'Kantumruy Pro', 'Battambang', 'Siemreap', 'Khmer OS', system-ui, sans-serif", 
              color: "#0f172a", 
              backgroundColor: "#ffffff", 
              padding: "48px 48px 36px 48px", 
              textAlign: "left",
              WebkitFontSmoothing: "antialiased",
              MozOsxFontSmoothing: "grayscale",
              textRendering: "optimizeLegibility"
            }}
          >
            {/* Cambodian Traditional Royal Header */}
            <div style={{ textAlign: "center", marginBottom: "28px" }}>
              <h3 style={{ fontSize: "17px", fontWeight: "bold", letterSpacing: "0.02em", margin: "0 0 6px 0", fontFamily: "'Moul', 'Kantumruy Pro', 'Battambang', sans-serif", color: "#0f172a" }}>ព្រះរាជាណាចក្រកម្ពុជា</h3>
              <h4 style={{ fontSize: "13.5px", fontWeight: "600", letterSpacing: "0.04em", margin: "0 0 8px 0", fontFamily: "'Moul', 'Kantumruy Pro', 'Battambang', sans-serif", color: "#334155" }}>ជាតិ សាសនា ព្រះមហាក្សត្រ</h4>
              {/* Double traditional Cambodian wavy divider or dotted separator */}
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", paddingTop: "4px" }}>
                <span style={{ width: "6px", height: "6px", backgroundColor: "#094C72", borderRadius: "50%", display: "inline-block" }} />
                <span style={{ width: "64px", height: "1.5px", backgroundColor: "#094C72", display: "inline-block" }} />
                <span style={{ width: "6px", height: "6px", backgroundColor: "#094C72", borderRadius: "50%", display: "inline-block" }} />
              </div>
            </div>

            {/* Ministry Specific Information Section */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1.5px solid #094C72", paddingBottom: "14px", marginBottom: "22px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <h2 style={{ fontSize: "17px", fontWeight: "bold", color: "#094C72", margin: 0, fontFamily: "'Moul', 'Kantumruy Pro', 'Battambang', sans-serif" }}>{ministry.khmerName}</h2>
                <p style={{ fontSize: "11px", color: "#64748b", fontFamily: "sans-serif", letterSpacing: "0.05em", textTransform: "uppercase", margin: 0, fontWeight: "600" }}>{ministry.name}</p>
              </div>
              <div style={{ fontSize: "11px", color: "#094C72", fontWeight: "bold", backgroundColor: "#eff6ff", padding: "4px 10px", borderRadius: "8px", border: "1px solid #bfdbfe", fontFamily: "monospace" }}>
                ID: {ministry.id.toUpperCase()}
              </div>
            </div>

            {/* Main Worksheet Title */}
            <div style={{ textAlign: "center", marginBottom: "32px", backgroundColor: "#f8fafc", padding: "16px 20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <h1 style={{ fontSize: "18px", fontWeight: "bold", color: "#094C72", margin: "0 0 6px 0", fontFamily: "'Moul', 'Kantumruy Pro', sans-serif" }}>
                សន្លឹកកិច្ចការ និងកម្រងវិញ្ញាសាត្រៀមប្រឡងក្របខ័ណ្ឌរដ្ឋ
              </h1>
              <p style={{ fontSize: "12px", color: "#475569", fontWeight: "500", margin: 0, fontFamily: "'Kantumruy Pro', sans-serif" }}>
                ឯកសារសិក្សាផ្លូវការ (Official Civil Service Practice Workbook)
              </p>
            </div>

            {/* Quizzes Wrapper */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {pdfQuizzes.map((quiz, idx) => (
                <div 
                  key={idx} 
                  className="pdf-quiz-card"
                  style={{ 
                    padding: "22px 24px", 
                    borderRadius: "16px", 
                    border: "1.5px solid #e2e8f0", 
                    backgroundColor: "#f8fafc", 
                    marginBottom: "20px", 
                    display: "block",
                    pageBreakInside: "avoid",
                    breakInside: "avoid"
                  }}
                >
                  {/* Question header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px", marginBottom: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ padding: "4px 12px", backgroundColor: "#094C72", color: "#ffffff", fontSize: "11px", fontWeight: "bold", borderRadius: "8px", letterSpacing: "0.02em", fontFamily: "'Kantumruy Pro', sans-serif" }}>
                        សំណួរទី {idx + 1}
                      </span>
                      <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "600", fontFamily: "'Kantumruy Pro', sans-serif" }}>
                        ផ្នែក៖ {quiz.category || "ទូទៅ"}
                      </span>
                    </div>
                  </div>

                  {/* Question */}
                  <p style={{ fontSize: "14.5px", fontWeight: "bold", lineHeight: "1.7", color: "#0f172a", margin: "0 0 16px 0", fontFamily: "'Kantumruy Pro', 'Battambang', sans-serif" }}>
                    {quiz.question}
                  </p>

                  {/* Options */}
                  {quiz.options && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", paddingLeft: "2px", paddingTop: "2px" }}>
                      {Object.entries(quiz.options).map(([key, val]) => {
                        const isCorrect = key === quiz.correctAnswer;
                        return (
                          <div 
                            key={key} 
                            style={{
                              display: "flex",
                              alignItems: "start",
                              gap: "10px",
                              padding: "10px 12px",
                              borderRadius: "10px",
                              border: isCorrect ? "1.5px solid #22c55e" : "1px solid #e2e8f0",
                              backgroundColor: isCorrect ? "#f0fdf4" : "#ffffff",
                              color: isCorrect ? "#15803d" : "#334155",
                              fontSize: "12.5px",
                              lineHeight: "1.6"
                            }}
                          >
                            <span style={{
                              width: "22px",
                              height: "22px",
                              borderRadius: "6px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: "bold",
                              fontSize: "11px",
                              flexShrink: 0,
                              border: isCorrect ? "1px solid #22c55e" : "1px solid #cbd5e1",
                              backgroundColor: isCorrect ? "#22c55e" : "#f1f5f9",
                              color: isCorrect ? "#ffffff" : "#64748b"
                            }}>
                              {key.toUpperCase()}
                            </span>
                            <span style={{ fontFamily: "'Kantumruy Pro', 'Battambang', sans-serif", fontWeight: isCorrect ? "600" : "normal" }}>{val}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Answer & Explanation */}
                  <div style={{ paddingTop: "12px", marginTop: "14px", borderTop: "1px dashed #cbd5e1" }}>
                    {quiz.answer && (
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#166534", display: "flex", alignItems: "flex-start", gap: "6px", fontFamily: "'Kantumruy Pro', 'Battambang', sans-serif", marginBottom: "8px" }}>
                        <span style={{ color: "#16a34a", fontWeight: "bold" }}>✓ ចម្លើយដោះស្រាយ៖</span>
                        <span style={{ color: "#0f172a", fontWeight: "bold", marginLeft: "4px" }}>{quiz.answer}</span>
                      </div>
                    )}
                    {quiz.explanation && (
                      <div style={{ padding: "14px 16px", borderRadius: "12px", backgroundColor: "#fffbeb", border: "1px solid #fef3c7", fontSize: "12px", color: "#78350f", lineHeight: "1.6", marginTop: "10px" }}>
                        <div style={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px", color: "#92400e", marginBottom: "4px", fontFamily: "'Kantumruy Pro', sans-serif" }}>
                          <span>💡 ការពន្យល់ / គន្លឹះដោះស្រាយ ៖</span>
                        </div>
                        <p style={{ margin: 0, paddingLeft: "4px", fontFamily: "'Kantumruy Pro', 'Battambang', sans-serif" }}>{quiz.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* PDF print Footer */}
            <div style={{ marginTop: "40px", paddingTop: "20px", borderTop: "1px solid #cbd5e1", textAlign: "center", fontSize: "11px", color: "#64748b", fontFamily: "'Kantumruy Pro', sans-serif" }}>
              <p style={{ margin: "0 0 4px 0" }}>© រក្សាសិទ្ធិគ្រប់យ៉ាងដោយ Cambodia Ministry Hub</p>
              <p style={{ margin: "0" }}>សិទ្ធិត្រូវបានបើកជូន៖ MEMBER ({user?.email || "សិស្ស/និស្សិត"}) • ឯកសារសិក្សាទាញយកដោយឥតគិតថ្លៃ ១០០%</p>
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

