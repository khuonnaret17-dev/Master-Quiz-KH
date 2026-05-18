'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  LayoutDashboard, 
  BookOpen, 
  Save, 
  X,
  PlusCircle,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import SafeImage from '@/components/SafeImage';
import { Ministry, Quiz, QuizType } from '@/lib/types';
import { cn, isValidUrl } from '@/lib/utils';
import { firestoreService } from '@/lib/firestore-service';
import { ministries as MINISTRIES } from '@/lib/data';

interface AdminDashboardProps {
  ministries: Ministry[];
  onLogout: () => void;
}

export default function AdminDashboard({ ministries, onLogout }: AdminDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMinistryId, setSelectedMinistryId] = useState<string | null>(null);
  const [isMinistryDialogOpen, setIsMinistryDialogOpen] = useState(false);
  const [isQuizDialogOpen, setIsQuizDialogOpen] = useState(false);
  const [isBulkQuizDialogOpen, setIsBulkQuizDialogOpen] = useState(false);
  const [bulkQuizData, setBulkQuizData] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const selectedMinistry = ministries.find(m => m.id === selectedMinistryId) || null;

  const [bulkMode, setBulkMode] = useState<'JSON' | 'TEXT'>('TEXT');
  const [bulkCategory, setBulkCategory] = useState('ចំណេះដឹងទូទៅ');

  const handleSaveBulkQuizzes = async () => {
    if (!selectedMinistry || !bulkQuizData) return;
    setIsSaving(true);
    setBulkError('');

    try {
      let validatedQuizzes: Quiz[] = [];

      if (bulkMode === 'JSON') {
        const parsedQuizzes = JSON.parse(bulkQuizData);
        if (!Array.isArray(parsedQuizzes)) {
          throw new Error('ទិន្នន័យត្រូវតែជា Array នៃសំណួរ');
        }
        validatedQuizzes = parsedQuizzes.map((q: any) => ({
          id: q.id || Math.random().toString(36).substr(2, 9),
          type: q.type || 'MULTIPLE_CHOICE',
          category: q.category || bulkCategory,
          question: q.question || '',
          options: q.options || { "A": "", "B": "", "C": "", "D": "" },
          correctAnswer: q.correctAnswer || 'A',
          explanation: q.explanation || ''
        }));
      } else {
        const { parseBulkQuizzes } = await import('@/lib/quiz-parser');
        validatedQuizzes = parseBulkQuizzes(bulkQuizData, bulkCategory);
        if (validatedQuizzes.length === 0) {
          throw new Error('មិនអាចស្វែងរកសំណួរក្នុងអត្ថបទបស់អ្នកទេ។ សូមពិនិត្យមើលទម្រង់សំណួរឡើងវិញ។');
        }
      }

      const updatedMinistry = { 
        ...selectedMinistry, 
        quizzes: [...(selectedMinistry.quizzes || []), ...validatedQuizzes] 
      };

      await firestoreService.saveMinistry(updatedMinistry);
      setIsBulkQuizDialogOpen(false);
      setBulkQuizData('');
    } catch (err: any) {
      setBulkError('កំហុសក្នុងការអានទិន្នន័យ៖ ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const [editingMinistry, setEditingMinistry] = useState<Partial<Ministry>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Quiz Form State
  const [editingQuiz, setEditingQuiz] = useState<Partial<Quiz>>({});
  const [isAddingQuiz, setIsAddingQuiz] = useState(false);

  const filteredMinistries = ministries.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Ministry Actions
  const handleOpenMinistryDialog = (ministry?: Ministry) => {
    if (ministry) {
      setEditingMinistry(ministry);
      setIsAddingNew(false);
    } else {
      setEditingMinistry({
        id: Math.random().toString(36).substr(2, 9),
        name: '',
        description: '',
        quizzes: []
      });
      setIsAddingNew(true);
    }
    setIsMinistryDialogOpen(true);
  };

  const handleSaveMinistry = async () => {
    if (!editingMinistry.name || !editingMinistry.description) return;
    
    // Add simple URL validation check
    if (editingMinistry.logo && !isValidUrl(editingMinistry.logo)) {
      if (!confirm('តំណភ្ជាប់ Logo ហាក់ដូចជាមិនត្រឹមត្រូវ។ តើអ្នកចង់បន្តរក្សាទុកវាដែរឬទេ?')) {
        return;
      }
    }

    setIsSaving(true);
    try {
      await firestoreService.saveMinistry(editingMinistry as Ministry);
      setIsMinistryDialogOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMinistry = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('តើអ្នកពិតជាចង់លុបក្រសួងនេះមែនទេ?')) {
      await firestoreService.deleteMinistry(id);
      if (selectedMinistryId === id) setSelectedMinistryId(null);
    }
  };

  const handleSyncDefaults = async () => {
    if (confirm('តើអ្នកចង់បច្ចុប្បន្នភាព Logo និងបន្ថែមក្រសួងដែលខ្វះខាតទៅកាន់កម្មវិធីមែនទេ? (ទិន្នន័យដែលមានស្រាប់នឹងមិនបាត់បង់ឡើយ)')) {
      setIsSaving(true);
      try {
        for (const defaultMinistry of MINISTRIES) {
          const existing = ministries.find(m => m.id === defaultMinistry.id);
          if (existing) {
            // Update logo if it's missing or different, but keep their quizzes
            await firestoreService.saveMinistry({
              ...existing,
              logo: defaultMinistry.logo,
              // Only update description if it was generic
              description: existing.description.includes('...') ? defaultMinistry.description : existing.description
            });
          } else {
            // Add missing ministry
            await firestoreService.saveMinistry(defaultMinistry);
          }
        }
        alert('ការធ្វើបច្ចុប្បន្នភាពបានជោគជ័យ!');
      } catch (err) {
        console.error(err);
        alert('មានកំហុសក្នុងការធ្វើបច្ចុប្បន្នភាព។');
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Quiz Actions
  const handleOpenQuizDialog = (quiz?: Quiz) => {
    if (quiz) {
      setEditingQuiz(quiz);
      setIsAddingQuiz(false);
    } else {
      setEditingQuiz({
        id: Math.random().toString(36).substr(2, 9),
        type: 'MULTIPLE_CHOICE',
        category: 'ចំណេះដឹងទូទៅ',
        question: '',
        options: { "A": "", "B": "", "C": "", "D": "" },
        correctAnswer: 'A',
        explanation: ''
      });
      setIsAddingQuiz(true);
    }
    setIsQuizDialogOpen(true);
  };

  const handleSaveQuiz = async () => {
    if (!selectedMinistry || !editingQuiz.question) return;
    setIsSaving(true);

    try {
      const currentQuizzes = selectedMinistry.quizzes || [];
      let newQuizzes: Quiz[];
      
      if (isAddingQuiz) {
        newQuizzes = [...currentQuizzes, editingQuiz as Quiz];
      } else {
        newQuizzes = currentQuizzes.map(q => q.id === editingQuiz.id ? editingQuiz as Quiz : q);
      }

      const updatedMinistry = { ...selectedMinistry, quizzes: newQuizzes };
      await firestoreService.saveMinistry(updatedMinistry);
      setIsQuizDialogOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!selectedMinistry) return;
    if (confirm('តើអ្នកពិតជាចង់លុបសំណួរនេះមែនទេ?')) {
      setIsSaving(true);
      try {
        const newQuizzes = (selectedMinistry.quizzes || []).filter(q => q.id !== quizId);
        const updatedMinistry = { ...selectedMinistry, quizzes: newQuizzes };
        await firestoreService.saveMinistry(updatedMinistry);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      {/* Header */}
      <header className="bg-[#1B365D] text-white py-8 px-6 shadow-lg mb-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight uppercase flex items-center gap-3">
              <LayoutDashboard className="h-6 w-6" />
              ប្រព័ន្ធគ្រប់គ្រងទិន្នន័យ (Admin)
            </h1>
            <p className="text-white/60 text-xs mt-1 uppercase tracking-widest font-bold">គ្រប់គ្រងក្រសួង និងវិញ្ញាសា</p>
          </div>
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={handleSyncDefaults}
                disabled={isSaving}
                className="rounded-none border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white text-[10px] uppercase font-bold tracking-widest"
              >
                {isSaving ? 'កំពុងដំណើរការ...' : 'ធ្វើបច្ចុប្បន្នភាព Logo'}
              </Button>
              <Button 
                variant="outline" 
                onClick={onLogout}
                className="rounded-none border-white/20 text-white hover:bg-white/10 text-[10px] uppercase font-bold tracking-widest"
              >
                ចាកចេញ
              </Button>
            </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar: Ministry List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#1B365D]">បញ្ជីក្រសួង-ស្ថាប័ន</h2>
            <Button 
              size="sm" 
              onClick={() => handleOpenMinistryDialog()}
              className="rounded-none bg-[#D4AF37] hover:bg-black text-[10px] font-bold uppercase tracking-widest gap-2"
            >
              <Plus className="h-3 w-3" /> បន្ថែម
            </Button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-black/30" />
            <Input 
              placeholder="ស្វែងរក..." 
              className="pl-9 h-11 text-xs rounded-none border-black/10 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[600px] pr-2 scrollbar-thin">
            {filteredMinistries.map(m => (
              <div 
                key={m.id}
                onClick={() => setSelectedMinistryId(m.id)}
                className={cn(
                  "p-4 border transition-all cursor-pointer group flex justify-between items-center gap-3",
                  selectedMinistryId === m.id 
                    ? "bg-[#1B365D] text-white border-[#1B365D]" 
                    : "bg-white border-black/5 hover:border-[#1B365D] text-black/80"
                )}
              >
                <div className="w-10 h-10 shrink-0 bg-white border border-black/5 flex items-center justify-center p-1 relative overflow-hidden">
                  {m.logo ? (
                    <SafeImage 
                      src={m.logo} 
                      alt={m.name} 
                      fill
                      className="object-contain p-1"
                    />
                  ) : (
                    <BookOpen className={cn("h-4 w-4", selectedMinistryId === m.id ? "text-white/20" : "text-black/20")} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold truncate">{m.name}</h3>
                  <p className={cn(
                    "text-[10px] uppercase tracking-wider font-medium opacity-60",
                    selectedMinistryId === m.id ? "text-white" : "text-black"
                  )}>
                    {m.quizzes?.length || 0} សំណួរ
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={(e: any) => { e.stopPropagation(); handleOpenMinistryDialog(m); }}
                    className="h-8 w-8 hover:bg-white/20"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={(e: any) => handleDeleteMinistry(m.id, e)}
                    className="h-8 w-8 hover:bg-red-500 hover:text-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content: Quiz Management */}
        <div className="lg:col-span-8">
          {selectedMinistry ? (
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b border-black/10 pb-6">
                <div className="flex gap-4">
                  {selectedMinistry.logo && (
                    <div className="w-20 h-20 bg-white border border-black/5 flex items-center justify-center p-2 relative overflow-hidden shadow-sm">
                      <SafeImage 
                        src={selectedMinistry.logo} 
                        alt={selectedMinistry.name} 
                        fill
                        className="object-contain p-2"
                      />
                    </div>
                  )}
                  <div>
                    <Badge className="mb-2 rounded-none bg-[#D4AF37] text-[10px] uppercase tracking-widest">{selectedMinistry.id}</Badge>
                    <h2 className="text-2xl font-bold text-[#1B365D]">{selectedMinistry.name}</h2>
                    <p className="text-sm text-black/50 italic mt-1">{selectedMinistry.description}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setBulkQuizData(JSON.stringify([{
                        "category": "ចំណេះដឹងទូទៅ",
                        "question": "តើ...",
                        "options": { "A": "ចម្លើយ ១", "B": "ចម្លើយ ២", "C": "ចម្លើយ ៣", "D": "ចម្លើយ ៤" },
                        "correctAnswer": "A",
                        "explanation": "ការពន្យល់..."
                      }], null, 2));
                      setIsBulkQuizDialogOpen(true);
                    }}
                    className="rounded-none border-black/10 text-[10px] font-bold uppercase tracking-widest gap-2"
                  >
                    <PlusCircle className="h-4 w-4" /> បញ្ចូលម្ដងទាំងអស់
                  </Button>
                  <Button 
                    onClick={() => handleOpenQuizDialog()}
                    className="rounded-none bg-[#1B365D] hover:bg-black text-[10px] font-bold uppercase tracking-widest gap-2"
                  >
                    <PlusCircle className="h-4 w-4" /> បន្ថែមសំណួរ
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-black/40">បញ្ជីសំណួរ ({selectedMinistry.quizzes?.length || 0})</h3>
                
                {(!selectedMinistry.quizzes || selectedMinistry.quizzes.length === 0) ? (
                  <div className="py-20 text-center border-2 border-dashed border-black/5 rounded-none text-black/30 font-bold uppercase tracking-widest text-[10px]">
                    មិនទាន់មានសំណួរនៅឡើយ
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {selectedMinistry.quizzes?.map((q, idx) => (
                      <Card key={q.id} className="rounded-none border-black/10 shadow-sm overflow-hidden group">
                        <CardHeader className="p-4 bg-black/[0.02] flex flex-row justify-between items-center space-y-0">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 flex items-center justify-center bg-[#1B365D] text-white font-bold text-xs">
                              {idx + 1}
                            </span>
                            <Badge variant="outline" className="rounded-none text-[10px] uppercase font-bold border-black/10">
                              {q.category}
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => handleOpenQuizDialog(q)}
                              className="h-8 w-8 hover:bg-[#1B365D] hover:text-white"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => handleDeleteQuiz(q.id)}
                              className="h-8 w-8 hover:bg-red-500 hover:text-white"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="p-5">
                          <p className="font-bold text-[#1B365D] mb-4">{q.question}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                            {q.options && Object.entries(q.options).map(([key, val]) => (
                              <div key={key} className={cn(
                                "p-3 text-xs border border-black/5",
                                key === q.correctAnswer ? "bg-green-50 border-green-200 font-bold text-green-700" : "bg-white text-black/60"
                              )}>
                                <span className="mr-2">{key}.</span> {val}
                              </div>
                            ))}
                          </div>
                          <div className="bg-[#D4AF37]/5 p-4 border-l-4 border-[#D4AF37]">
                            <p className="text-[10px] uppercase font-bold text-[#D4AF37] mb-1">ការពន្យល់</p>
                            <p className="text-[11px] text-black/70 italic leading-relaxed">{q.explanation}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-[500px] flex flex-col items-center justify-center text-center bg-white border border-black/5 border-dashed rounded-none">
              <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mb-4">
                <BookOpen className="h-8 w-8 text-black/20" />
              </div>
              <p className="text-black/30 font-bold uppercase tracking-widest text-sm">សូមជ្រើសរើសក្រសួងដើម្បីគ្រប់គ្រង</p>
            </div>
          )}
        </div>
      </main>

      {/* Ministry Dialog */}
      <Dialog open={isMinistryDialogOpen} onOpenChange={setIsMinistryDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-none border-none p-0 overflow-hidden">
          <div className="bg-[#1B365D] text-white p-6">
            <DialogTitle className="text-xl font-bold uppercase tracking-tight">
              {isAddingNew ? 'បន្ថែមក្រសួងថ្មី' : 'កែប្រែព័ត៌មានក្រសួង'}
            </DialogTitle>
            <DialogDescription className="text-white/50 text-[10px] mt-1 uppercase tracking-widest font-bold">រក្សាសុវត្ថិភាពទិន្នន័យ</DialogDescription>
          </div>
          <div className="p-6 space-y-6 bg-white">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-widest text-black/40">ឈ្មោះក្រសួង-ស្ថាប័ន</label>
                <Input 
                  value={editingMinistry.name || ''} 
                  onChange={(e) => setEditingMinistry({...editingMinistry, name: e.target.value})}
                  className="rounded-none border-black/10 h-12 focus:border-[#1B365D]" 
                  placeholder="ឧទាហរណ៍៖ ក្រសួងសេដ្ឋកិច្ច និងហិរញ្ញវត្ថុ"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-widest text-black/40">ការពិពណ៌នា</label>
                <Textarea 
                  value={editingMinistry.description || ''} 
                  onChange={(e) => setEditingMinistry({...editingMinistry, description: e.target.value})}
                  className="rounded-none border-black/10 min-h-[100px] focus:border-[#1B365D]"
                  placeholder="រៀបរាប់អំពីតួនាទី និងភារកិច្ច..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-widest text-black/40">តំណភ្ជាប់ Logo (URL)</label>
                <Input 
                  value={editingMinistry.logo || ''} 
                  onChange={(e) => setEditingMinistry({...editingMinistry, logo: e.target.value})}
                  className="rounded-none border-black/10 h-12 focus:border-[#1B365D]" 
                  placeholder="ឧទាហរណ៍៖ https://.../logo.png"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 pt-0 bg-white">
            <Button variant="outline" onClick={() => setIsMinistryDialogOpen(false)} className="rounded-none border-black/10 text-xs font-bold uppercase tracking-widest">បោះបង់</Button>
            <Button onClick={handleSaveMinistry} className="rounded-none bg-[#1B365D] hover:bg-black text-xs font-bold uppercase tracking-widest gap-2">
              <Save className="h-4 w-4" /> រក្សាទុក
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quiz Dialog */}
      <Dialog open={isQuizDialogOpen} onOpenChange={setIsQuizDialogOpen}>
        <DialogContent className="sm:max-w-[700px] rounded-none border-none p-0 overflow-hidden max-h-[90vh] flex flex-col">
          <div className="bg-[#1B365D] text-white p-6">
            <DialogTitle className="text-xl font-bold uppercase tracking-tight">
              {isAddingQuiz ? 'បន្ថែមសំណួរថ្មី' : 'កែប្រែសំណួរ'}
            </DialogTitle>
            <DialogDescription className="text-white/50 text-[10px] mt-1 uppercase tracking-widest font-bold">
              សម្រាប់៖ {selectedMinistry?.name}
            </DialogDescription>
          </div>
          <div className="p-6 space-y-6 bg-white overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-widest text-black/40">ប្រភេទវិញ្ញាសា (Category)</label>
                <div className="space-y-2">
                  <Input 
                    value={editingQuiz.category || ''}
                    onChange={(e) => setEditingQuiz({...editingQuiz, category: e.target.value})}
                    className="rounded-none border-black/10 h-12 focus:border-[#1B365D]"
                    placeholder="ឧទាហរណ៍៖ ចំណេះដឹងទូទៅ"
                  />
                  <div className="flex flex-wrap gap-1">
                    {Array.from(new Set([
                      'ចំណេះដឹងទូទៅ', 
                      'ច្បាប់ និងបទប្បញ្ញត្តិ', 
                      'ចំណេះដឹងបច្ចេកទេស',
                      ...(selectedMinistry?.quizzes?.map(q => q.category) || [])
                    ])).filter(Boolean).map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setEditingQuiz({...editingQuiz, category: cat})}
                        className={cn(
                          "text-[9px] px-2 py-1 border border-black/10 hover:border-[#1B365D] hover:text-[#1B365D] transition-colors",
                          editingQuiz.category === cat ? "bg-[#1B365D] text-white border-[#1B365D]" : "bg-white text-black/50"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-widest text-black/40">ប្រភេទសំណួរ (Type)</label>
                <select 
                  value={editingQuiz.type || 'MULTIPLE_CHOICE'} 
                  onChange={(e) => setEditingQuiz({...editingQuiz, type: e.target.value as QuizType})}
                  className="w-full h-12 border border-black/10 px-4 text-xs rounded-none focus:outline-none focus:border-[#1B365D]"
                >
                  <option value="MULTIPLE_CHOICE">ពហុចម្លើយ (Multiple Choice)</option>
                  <option value="Q_AND_A">សំណួរ-ចម្លើយ (Q&A)</option>
                  <option value="VOCABULARY">ពន្យល់ពាក្យ (Vocabulary)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-widest text-black/40">ចម្លើយត្រឹមត្រូវ</label>
              {(editingQuiz.type === 'MULTIPLE_CHOICE' || !editingQuiz.type) ? (
                <select 
                  value={editingQuiz.correctAnswer}
                  onChange={(e) => setEditingQuiz({...editingQuiz, correctAnswer: e.target.value})}
                  className="w-full h-12 border border-black/10 px-4 text-sm rounded-none focus:outline-none focus:border-[#1B365D]"
                >
                  <option value="A">ក (A)</option>
                  <option value="B">ខ (B)</option>
                  <option value="C">គ (C)</option>
                  <option value="D">ឃ (D)</option>
                </select>
              ) : (
                <Textarea 
                  value={editingQuiz.correctAnswer || ''} 
                  onChange={(e) => setEditingQuiz({...editingQuiz, correctAnswer: e.target.value})}
                  className="rounded-none border-black/10 min-h-[60px] focus:border-[#1B365D] text-sm"
                  placeholder="បំពេញចម្លើយត្រឹមត្រូវនៅទីនេះ..."
                />
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-widest text-black/40">ខ្លឹមសារសំណួរ</label>
              <Textarea 
                value={editingQuiz.question || ''} 
                onChange={(e) => setEditingQuiz({...editingQuiz, question: e.target.value})}
                className="rounded-none border-black/10 min-h-[80px] focus:border-[#1B365D]"
                placeholder="តើ..."
              />
            </div>

            {(editingQuiz.type === 'MULTIPLE_CHOICE' || !editingQuiz.type) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['A', 'B', 'C', 'D'] as const).map(key => (
                <div key={key} className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-black/40">ជម្រើស {key === 'A' ? 'ក' : key === 'B' ? 'ខ' : key === 'C' ? 'គ' : 'ឃ'}</label>
                  <Input 
                    value={editingQuiz.options?.[key] || ''} 
                    onChange={(e) => setEditingQuiz({
                      ...editingQuiz, 
                      options: { ...editingQuiz.options!, [key]: e.target.value } 
                    })}
                    className="rounded-none border-black/10 h-11 focus:border-[#1B365D]"
                  />
                </div>
              ))}
            </div>
          )}

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-widest text-black/40">ការពន្យល់ (Explanation)</label>
              <Textarea 
                value={editingQuiz.explanation || ''} 
                onChange={(e) => setEditingQuiz({...editingQuiz, explanation: e.target.value})}
                className="rounded-none border-black/10 min-h-[80px] focus:border-[#1B365D]"
              />
            </div>
          </div>
          <DialogFooter className="p-6 pt-0 bg-white border-t border-black/5 mt-auto">
            <Button variant="outline" onClick={() => setIsQuizDialogOpen(false)} className="rounded-none border-black/10 text-xs font-bold uppercase tracking-widest">បោះបង់</Button>
            <Button onClick={handleSaveQuiz} className="rounded-none bg-[#1B365D] hover:bg-black text-xs font-bold uppercase tracking-widest gap-2">
              <Save className="h-4 w-4" /> រក្សាទុកសំណួរ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isBulkQuizDialogOpen} onOpenChange={setIsBulkQuizDialogOpen}>
        <DialogContent className="sm:max-w-[800px] rounded-none border-none p-0 overflow-hidden max-h-[95vh] flex flex-col">
          <div className="bg-[#1B365D] text-white p-6">
            <DialogTitle className="text-xl font-bold uppercase tracking-tight">
              បញ្ចូលសំណួរម្ដងទាំងអស់ (Bulk Import)
            </DialogTitle>
            <DialogDescription className="text-white/50 text-[10px] mt-1 uppercase tracking-widest font-bold">
              អ្នកអាចបញ្ចូលជាអត្ថបទផ្ទាល់ ឬទម្រង់ JSON
            </DialogDescription>
          </div>
          <div className="p-6 space-y-6 bg-white overflow-y-auto">
            <div className="flex gap-4 border-b border-black/5 pb-4">
              <button 
                onClick={() => setBulkMode('TEXT')}
                className={cn(
                  "px-4 py-2 text-[10px] uppercase font-bold tracking-widest transition-all",
                  bulkMode === 'TEXT' ? "text-[#D4AF37] border-b-2 border-[#D4AF37]" : "text-black/40"
                )}
              >
                អត្ថបទធម្មតា (TEXT)
              </button>
              <button 
                onClick={() => setBulkMode('JSON')}
                className={cn(
                  "px-4 py-2 text-[10px] uppercase font-bold tracking-widest transition-all",
                  bulkMode === 'JSON' ? "text-[#D4AF37] border-b-2 border-[#D4AF37]" : "text-black/40"
                )}
              >
                ទម្រង់ JSON
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-black/40">ប្រភេទវិញ្ញាសា (Category)</label>
                  <Input 
                    value={bulkCategory}
                    onChange={(e) => setBulkCategory(e.target.value)}
                    className="rounded-none border-black/10 h-10 text-xs focus:border-[#1B365D]"
                    placeholder="ឧទាហរណ៍៖ ចំណេះដឹងទូទៅ"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-black/40">
                    {bulkMode === 'TEXT' ? 'អត្ថបទសំណួរ' : 'ទិន្នន័យ JSON'}
                  </label>
                  {bulkMode === 'TEXT' && (
                    <span className="text-[9px] text-[#1B365D] bg-[#1B365D]/5 px-2 py-1 italic font-medium">
                      សម្គាល់៖ បញ្ចូល (ចម្លើយត្រឹមត្រូវ) ឬ (T) បន្ទាប់ពីចម្លើយដែលត្រូវ
                    </span>
                  )}
                </div>
                <Textarea 
                  value={bulkQuizData} 
                  onChange={(e) => setBulkQuizData(e.target.value)}
                  className="rounded-none border-black/10 min-h-[300px] font-mono text-xs focus:border-[#1B365D]"
                  placeholder={bulkMode === 'TEXT' ? 
                    `១. អ្នកកាត់សេចក្ដីត្រូវវាសចាកនៅអគតិធម៌ប៉ុន្មានយ៉ាង?\n   ក. ២យ៉ាង\n   ខ. ៣យ៉ាង\n   គ. ៤យ៉ាង (ចម្លើយត្រឹមត្រូវ)\n   ឃ. ៥យ៉ាង` : 
                    `[ { "question": "...", "options": { "A": "...", ... }, "correctAnswer": "A" } ]`
                  }
                />
                {bulkError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border-l-4 border-red-500">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <p className="text-red-600 text-[10px] font-bold">{bulkError}</p>
                  </div>
                )}
              </div>

              {bulkMode === 'TEXT' && (
                <div className="p-4 bg-gray-50 border border-black/5">
                  <p className="text-[10px] uppercase font-bold text-black/40 mb-3 tracking-widest">គំរូទម្រង់បញ្ចូល (Example)</p>
                  <div className="text-[11px] font-mono text-black/60 space-y-2">
                    <p>១. សំនួរទីមួយ?<br/>   ក. ចម្លើយ ១<br/>   ខ. ចម្លើយ ២ (ចម្លើយត្រឹមត្រូវ)<br/>   គ. ចម្លើយ ៣</p>
                    <div className="h-[1px] bg-black/5 my-2"></div>
                    <p>1. First question?<br/>   a. Option 1<br/>   b. Option 2 (T)<br/>   c. Option 3</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="p-6 pt-3 pb-6 bg-white border-t border-black/5">
            <Button variant="outline" onClick={() => setIsBulkQuizDialogOpen(false)} className="rounded-none border-black/10 text-xs font-bold uppercase tracking-widest h-11 px-6">បោះបង់</Button>
            <Button 
              onClick={handleSaveBulkQuizzes} 
              disabled={isSaving}
              className="rounded-none bg-[#1B365D] hover:bg-black text-xs font-bold uppercase tracking-widest gap-2 h-11 px-8"
            >
              {isSaving ? 'កំពុងរក្សាទុក...' : 'បញ្ចូលសំណួរទាំងអស់'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
