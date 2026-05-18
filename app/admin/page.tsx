'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useFirebase } from '@/lib/FirebaseProvider';
import { db } from '@/lib/firebase';
import { setDoc, doc, deleteDoc } from 'firebase/firestore';
import { ministries as initialMinistries } from '@/lib/data';
import { Ministry } from '@/lib/types';
import { motion, AnimatePresence } from 'motion/react';
import { Save, X, Pencil, ArrowLeft, Globe, AlertCircle, CheckCircle2, Plus, Trash2, ChevronDown, ChevronUp, GripVertical, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import SafeImage from '@/components/SafeImage';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { firestoreService } from '@/lib/firestore-service';

function CategoryEditor({
  categories,
  updateParent,
  type,
  depth = 0
}: {
  categories: any[];
  updateParent: (newCategories: any[]) => void;
  type: 'mcq' | 'qa';
  depth?: number;
}) {
  const handleUpdateCategory = (cIdx: number, updatedCat: any) => {
    const newCats = [...categories];
    newCats[cIdx] = updatedCat;
    updateParent(newCats);
  };

  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const parseBulkData = (text: string) => {
      const items: any[] = [];
      const lines = text.split('\n');
      let currentItem: any = null;
      
      lines.forEach(line => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return;

          // Question: Find "1. ..."
          const qMatch = trimmedLine.match(/^([០-៩១-៩]+)\.\s*(.*)/);
          if (qMatch) {
              if (currentItem) items.push(currentItem);
              currentItem = type === 'mcq' 
                ? { question: qMatch[2], options: [], correctIndex: 0, explanation: '' }
                : { question: qMatch[2], answer: '' };
              return;
          }

          // Option/Answer
          // Options look like "ក. ..." "ខ. ..."
          if (type === 'mcq' && currentItem) {
            const oMatch = trimmedLine.match(/^(ក|ខ|គ|ឃ)\.\s*(.*)/);
            if (oMatch) {
              const optText = oMatch[2];
              const isCorrect = optText.includes('(ចម្លើយត្រឹមត្រូវ)');
              const cleanOptText = optText.replace('(ចម្លើយត្រឹមត្រូវ)', '').replace(/\s*\(\s*ចម្លើយត្រឹមត្រូវ\s*\)/, '').trim();
              
              currentItem.options.push(cleanOptText);
              if (isCorrect) currentItem.correctIndex = currentItem.options.length - 1;
            }
          } else if (type === 'qa' && currentItem) {
            // Answer looks like "ចម្លើយ: ..." or just text
            if (trimmedLine.startsWith('ចម្លើយ')) {
                currentItem.answer = trimmedLine.replace(/^ចម្លើយ\s*[:៖]?\s*/, '').trim();
            } else if (!currentItem.answer) {
                currentItem.answer = trimmedLine;
            }
          }
      });
      if (currentItem) items.push(currentItem);
      return items;
  };

  const handleBulkAdd = (cIdx: number) => {
    const newItems = parseBulkData(bulkText);
    handleUpdateCategory(cIdx, { ...categories[cIdx], items: [...(categories[cIdx].items || []), ...newItems] });
    setBulkText('');
    setIsBulkImporting(false);
  };

  const addSubCategory = (cIdx: number) => {
    const newCats = [...categories];
    if (!newCats[cIdx].subCategories) newCats[cIdx].subCategories = [];
    newCats[cIdx].subCategories.push({ category: "New SubCategory", items: [] });
    updateParent(newCats);
  };

  return (
    <div className={`space-y-4 ${depth > 0 ? 'ml-6 mt-2 border-l border-slate-200 pl-4' : ''}`}>
      {categories.map((cat, cIdx) => (
        <div key={cIdx} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              value={cat.category}
              onChange={(e) => handleUpdateCategory(cIdx, { ...cat, category: e.target.value })}
              className="flex-1 font-bold text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none"
            />
            <button 
              onClick={() => addSubCategory(cIdx)} 
              className="px-2 py-1 text-xs font-bold text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-all"
            >
              + Sub
            </button>
            <button 
              onClick={() => {
                const newCats = categories.filter((_, i) => i !== cIdx);
                updateParent(newCats);
              }} 
              className="p-1 text-slate-300 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            {/* Render Items */}
            <div className="space-y-2">
              {cat.items && cat.items.map((item: any, iIdx: number) => (
                  <div key={iIdx} className="p-3 border border-slate-100 rounded text-xs bg-slate-50 space-y-2">
                    <input
                      type="text"
                      className="w-full font-bold bg-transparent outline-none border-b border-slate-200"
                      value={item.question}
                      onChange={(e) => {
                        const newItems = [...cat.items];
                        newItems[iIdx].question = e.target.value;
                        handleUpdateCategory(cIdx, { ...cat, items: newItems });
                      }}
                      placeholder="Question"
                    />
                    
                    {type === 'mcq' ? (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {item.options.map((opt: string, oIdx: number) => (
                          <div key={oIdx} className="flex items-center gap-1">
                            <input 
                              type="radio"
                              checked={item.correctIndex === oIdx}
                              onChange={() => {
                                const newItems = [...cat.items];
                                newItems[iIdx].correctIndex = oIdx;
                                handleUpdateCategory(cIdx, { ...cat, items: newItems });
                              }}
                            />
                            <input 
                              value={opt}
                              placeholder={`Option ${oIdx + 1}`}
                              onChange={(e) => {
                                const newItems = [...cat.items];
                                newItems[iIdx].options[oIdx] = e.target.value;
                                handleUpdateCategory(cIdx, { ...cat, items: newItems });
                              }}
                              className="text-xs w-full bg-white rounded px-1 py-0.5 outline-none border focus:border-blue-200"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <input
                        value={item.answer}
                        placeholder="Answer"
                        onChange={(e) => {
                          const newItems = [...cat.items];
                          newItems[iIdx].answer = e.target.value;
                          handleUpdateCategory(cIdx, { ...cat, items: newItems });
                        }}
                        className="text-xs w-full bg-white rounded px-1 py-0.5 outline-none border focus:border-blue-200 mt-1"
                      />
                    )}
                    
                    <button 
                      onClick={() => {
                        const newItems = cat.items.filter((_: any, i: number) => i !== iIdx);
                        handleUpdateCategory(cIdx, { ...cat, items: newItems });
                      }}
                      className="text-slate-400 hover:text-red-500 mt-2 block ml-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
              ))}
              <button 
                onClick={() => {
                  const newItem = type === 'mcq' 
                    ? { question: "New Question", options: ["", "", "", ""], correctIndex: 0 } 
                    : { question: "New Question", answer: "New Answer" };
                  handleUpdateCategory(cIdx, { ...cat, items: [ ...(cat.items || []), newItem] });
                }}
                className="text-[10px] font-bold text-slate-500 w-full py-1 border border-dashed border-slate-200 rounded hover:border-slate-400"
              >
                + Add Item
              </button>
              <button
                onClick={() => setIsBulkImporting(!isBulkImporting)}
                className="text-[10px] font-bold text-blue-500 w-full py-1 mt-1 border border-dashed border-blue-200 rounded hover:border-blue-400"
              >
                {isBulkImporting ? 'Cancel Bulk' : '+ Bulk Import'}
              </button>
              {isBulkImporting && (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    className="w-full p-2 text-xs border rounded h-32"
                    placeholder="១. សំណួរ?&#10;ក. ចម្លើយ១&#10;ខ. ចម្លើយ២ (ចម្លើយត្រឹមត្រូវ)"
                  />
                  <button
                    onClick={() => handleBulkAdd(cIdx)}
                    className="text-xs font-bold text-white bg-blue-600 w-full py-1.5 rounded hover:bg-blue-700"
                  >
                    Import Questions
                  </button>
                </div>
              )}
            </div>

            {/* Recursive Sub-categories */}
            {cat.subCategories && cat.subCategories.length > 0 && (
              <CategoryEditor 
                categories={cat.subCategories}
                updateParent={(newSubs) => handleUpdateCategory(cIdx, { ...cat, subCategories: newSubs })}
                type={type}
                depth={depth + 1}
              />
            )}
          </div>
        </div>
        ))}
        {/* Add Main Category at this depth if needed */}
         <button 
            onClick={() => updateParent([...categories, { category: "New Category", items: [] }])}
            className="text-xs font-bold text-slate-500 w-full py-2 border border-dashed border-slate-200 rounded hover:border-slate-400 mt-2"
          >
            + Add Category
          </button>
      </div>
    );

}
  
export default function AdminPage() {
  const { ministries, loading, user, authLoading, login, userRole } = useFirebase();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Ministry | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, name: string} | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [collapsedMcqs, setCollapsedMcqs] = useState<Record<number, boolean>>({});
  const [collapsedQas, setCollapsedQas] = useState<Record<number, boolean>>({});
  const [bulkImportingQa, setBulkImportingQa] = useState<Record<number, boolean>>({});
  const [bulkTextQa, setBulkTextQa] = useState<Record<number, string>>({});
  const [bulkImportingMcq, setBulkImportingMcq] = useState<Record<number, boolean>>({});
  const [bulkTextMcq, setBulkTextMcq] = useState<Record<number, string>>({});
  const [autoSaving, setAutoSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef(true);

  const validateUrl = (url: string) => {
    if (!url) return "URL is required";
    try {
      new URL(url);
      return null;
    } catch (e) {
      return "Please enter a valid URL (e.g., https://example.com/logo.png)";
    }
  };

  const prepareFormForSave = (form: Ministry) => {
    const dataToSave = { ...form };
    const quizzes: import('@/lib/types').Quiz[] = [];
    
    const flattenMcqs = (cats: import('@/lib/types').QuizCategory[], path: string = "") => {
      cats.forEach((cat) => {
        const fullPath = path ? `${path} > ${cat.category}` : cat.category;
        cat.items.forEach((item, iIdx) => {
          quizzes.push({
            id: `mcq_${fullPath}_${iIdx}_${Date.now()}`,
            type: 'MULTIPLE_CHOICE',
            category: fullPath,
            question: item.question,
            options: item.options.reduce((acc, opt, i) => ({...acc, [String.fromCharCode(65 + i)]: opt}), {}),
            correctAnswer: String.fromCharCode(65 + item.correctIndex),
            explanation: item.explanation || ""
          });
        });
        if (cat.subCategories) flattenMcqs(cat.subCategories, fullPath);
      });
    };

    if (dataToSave.mcqs) flattenMcqs(dataToSave.mcqs);

    const flattenQa = (cats: import('@/lib/types').ShortAnswerCategory[], path: string = "") => {
      cats.forEach((cat) => {
        const fullPath = path ? `${path} > ${cat.category}` : cat.category;
        cat.items.forEach((item, iIdx) => {
          quizzes.push({
            id: `qa_${fullPath}_${iIdx}_${Date.now()}`,
            type: 'Q_AND_A',
            category: fullPath,
            question: item.question,
            answer: item.answer
          });
        });
        if (cat.subCategories) flattenQa(cat.subCategories, fullPath);
      });
    };

    if (dataToSave.shortAnswers) flattenQa(dataToSave.shortAnswers);

    if (dataToSave.terms) {
      dataToSave.terms.forEach((item, iIdx) => {
        quizzes.push({
          id: `vocab_${iIdx}_${Date.now()}`,
          type: 'VOCABULARY',
          category: 'Vocabulary',
          question: item.term,
          answer: item.definition
        });
      });
    }

    dataToSave.quizzes = quizzes;
    return dataToSave;
  };

  useEffect(() => {
    if (editingId && editForm) {
      if (initialLoadRef.current) {
         initialLoadRef.current = false;
         return; // Skip first save to avoid unnecessary writes, though we reset it on edit
      }
      
      const error = validateUrl(editForm.logo);
      if (error) return; // Don't auto-save if URL is bad

      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = setTimeout(async () => {
        setAutoSaving(true);
        try {
          const finalData = prepareFormForSave(editForm);
          await setDoc(doc(db, 'ministries', editingId), finalData);
        } catch (e) {
          console.error("Auto-save error:", e);
        } finally {
          setAutoSaving(false);
        }
      }, 1000);
    }
  }, [editForm, editingId]);

  // When edit dialog opens, we want to reset initial load flag so we don't save the untouched record
  useEffect(() => {
     if (editingId) {
        initialLoadRef.current = true;
     }
  }, [editingId]);

  const toggleMcq = (idx: number) => setCollapsedMcqs(prev => ({ ...prev, [idx]: !prev[idx] }));
  const toggleQa = (idx: number) => setCollapsedQas(prev => ({ ...prev, [idx]: !prev[idx] }));

  const handleImportBulkMcq = (cIdx: number) => {
    if (!editForm || !editForm.mcqs) return;
    const text = bulkTextMcq[cIdx] || '';
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const newItems: any[] = [];
    let currentItem: any = null;

    for (let i = 0; i < lines.length; i++) {
       const line = lines[i];
       const isOptionRegex = /^([កខគឃងចឆជឈញ]|[a-zA-Z])\s*\.\s+/i;
       
       if (!isOptionRegex.test(line) && (!currentItem || currentItem.options.length >= 4)) {
          if (currentItem) {
              while (currentItem.options.length < 4) currentItem.options.push(`Option ${currentItem.options.length + 1}`);
              newItems.push(currentItem);
          }
          currentItem = {
             question: line.replace(/^([០-៩0-9]+)\s*[.\-)]\s*/, ''),
             options: [],
             correctIndex: 0
          };
       } else if (currentItem && currentItem.options.length < 4) {
          let optText = line.replace(isOptionRegex, '');
          if (optText.includes('(ចម្លើយត្រឹមត្រូវ)')) {
             currentItem.correctIndex = currentItem.options.length;
             optText = optText.replace(/\s*\(ចម្លើយត្រឹមត្រូវ\)/, '');
          }
          currentItem.options.push(optText.trim());
       }
    }
    if (currentItem) {
       while (currentItem.options.length < 4) currentItem.options.push(`Option ${currentItem.options.length + 1}`);
       newItems.push(currentItem);
    }

    const mcqs = [...editForm.mcqs];
    mcqs[cIdx].items = [...mcqs[cIdx].items, ...newItems];
    setEditForm({ ...editForm, mcqs });
    
    setBulkImportingMcq(prev => ({ ...prev, [cIdx]: false }));
    setBulkTextMcq(prev => ({ ...prev, [cIdx]: '' }));
  };

  const handleImportBulkQa = (cIdx: number) => {
    if (!editForm || !editForm.shortAnswers) return;
    const text = bulkTextQa[cIdx] || '';
    const lines = text.split('\n').map(l => l.trimEnd());
    const newItems: any[] = [];
    let currentItem: { question: string, answer: string } | null = null;
    let isAnswering = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Check if line looks like a question start: "[Number]. " or "[Number]) "
      const isQuestionStart = /^([០-៩0-9]+)\s*[.\-)]\s*/.test(line);
      const isLikelyQuestion = isQuestionStart && (line.includes('?') || line.includes('តើ') || line.includes('ណា') || line.includes('ប៉ុន្មាន'));
      
      // Check if line looks like an answer start: "ចម្លើយ ៖" or "ចម្លើយ :" or "ចម្លើយ:"
      const isAnswerStart = /^(ចម្លើយ|ចម្លើយ\s*[៖:]+)\s*/.test(line);

      if ((isLikelyQuestion || (isQuestionStart && !isAnswering)) && (!currentItem || isAnswering || isLikelyQuestion)) {
        // If we were already building an item, push it
        if (currentItem && (currentItem.question || currentItem.answer)) {
          newItems.push(currentItem);
        }
        currentItem = {
          question: line.replace(/^([០-៩0-9]+)\s*[.\-)]\s*/, '').trim(),
          answer: ''
        };
        isAnswering = false;
      } else if (isAnswerStart && currentItem) {
        isAnswering = true;
        // Strip the "ចម្លើយ ៖" prefix
        const answerText = line.replace(/^(ចម្លើយ|ចម្លើយ\s*[៖:]+)\s*/, '').trim();
        currentItem.answer = answerText;
      } else if (currentItem) {
        if (isAnswering) {
          // Append to answer with newline preserved
          currentItem.answer += (currentItem.answer ? '\n' : '') + line;
        } else {
          // Append to question
          currentItem.question += (currentItem.question ? ' ' : '') + line;
        }
      } else {
        // First line case if it doesn't match markers
        currentItem = { question: line, answer: '' };
        isAnswering = false;
      }
    }

    if (currentItem) {
      newItems.push(currentItem);
    }

    const qa = [...editForm.shortAnswers];
    qa[cIdx].items = [...qa[cIdx].items, ...newItems];
    setEditForm({ ...editForm, shortAnswers: qa });
    
    setBulkImportingQa(prev => ({ ...prev, [cIdx]: false }));
    setBulkTextQa(prev => ({ ...prev, [cIdx]: '' }));
  };

  const handleEdit = (ministry: Ministry) => {
    setEditingId(ministry.id);
    setEditForm({ ...ministry });
    setUrlError(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm(null);
    setUrlError(null);
  };

  const handleSave = async () => {
    if (!editForm) return;

    const error = validateUrl(editForm.logo);
    if (error) {
      setUrlError(error);
      return;
    }

    setSaving(true);
    try {
      const finalData = prepareFormForSave(editForm);
      await setDoc(doc(db, 'ministries', editForm.id), finalData);
      setEditingId(null);
      setEditForm(null);
      setUrlError(null);
    } catch (e) {
      console.error("Save error:", e);
      setUrlError("Failed to save to database. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddMinistry = async () => {
    const newId = 'ministry_' + Date.now();
    const newMinistry: Ministry = {
      id: newId,
      name: "New Ministry",
      khmerName: "ក្រសួងថ្មី",
      description: "Description",
      logo: "https://picsum.photos/seed/ministry/200/200",
      color: "#0f172a",
      mcqs: [],
      shortAnswers: [],
      terms: []
    };
    
    setEditingId(newId);
    setEditForm(newMinistry);
  };

  const handleDeleteMinistry = async (id: string, name: string) => {
    setDeleteConfirm({ id, name });
  };

  const confirmDeleteMinistry = async () => {
    if (!deleteConfirm) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'ministries', deleteConfirm.id));
      if (editingId === deleteConfirm.id) {
        setEditingId(null);
        setEditForm(null);
      }
      setDeleteConfirm(null);
    } catch (e) {
      console.error("Delete error:", e);
      setUrlError("Failed to delete ministry.");
      setDeleteConfirm(null);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof Ministry, value: any) => {
    if (editForm) setEditForm({ ...editForm, [field]: value });
  };

  // Terminology Helpers
  const addTerm = () => {
    const terms = [...(editForm?.terms || []), { term: "", definition: "" }];
    updateField('terms', terms);
  };
  const removeTerm = (index: number) => {
    const terms = (editForm?.terms || []).filter((_, i) => i !== index);
    updateField('terms', terms);
  };

  // MCQ Helpers
  const addMcqCategory = () => {
    const mcqs = [...(editForm?.mcqs || []), { category: "New Category", items: [] }];
    updateField('mcqs', mcqs);
  };
  const removeMcqCategory = (catIdx: number) => {
    const mcqs = (editForm?.mcqs || []).filter((_, i) => i !== catIdx);
    updateField('mcqs', mcqs);
  };
  const addMcqItem = (catIdx: number) => {
    const mcqs = [...(editForm?.mcqs || [])];
    mcqs[catIdx].items.push({
      question: "",
      options: ["", "", "", ""],
      correctIndex: 0,
      explanation: ""
    });
    updateField('mcqs', mcqs);
  };
  const removeMcqItem = (catIdx: number, itemIdx: number) => {
    const mcqs = [...(editForm?.mcqs || [])];
    mcqs[catIdx].items = mcqs[catIdx].items.filter((_, i) => i !== itemIdx);
    updateField('mcqs', mcqs);
  };

  // QA Helpers
  const addQaCategory = () => {
    const qa = [...(editForm?.shortAnswers || []), { category: "New Category", items: [] }];
    updateField('shortAnswers', qa);
  };
  const removeQaCategory = (catIdx: number) => {
    const qa = (editForm?.shortAnswers || []).filter((_, i) => i !== catIdx);
    updateField('shortAnswers', qa);
  };
  const addQaItem = (catIdx: number) => {
    const qa = [...(editForm?.shortAnswers || [])];
    qa[catIdx].items.push({ question: "", answer: "" });
    updateField('shortAnswers', qa);
  };
  const removeQaItem = (catIdx: number, itemIdx: number) => {
    const qa = [...(editForm?.shortAnswers || [])];
    qa[catIdx].items = qa[catIdx].items.filter((_, i) => i !== itemIdx);
    updateField('shortAnswers', qa);
  };

  const resetToInitial = async () => {
    setResetConfirm(true);
  };

  const confirmResetToInitial = async () => {
    setSaving(true);
    try {
      for (const m of initialMinistries) {
        await setDoc(doc(db, 'ministries', m.id), m);
      }
      setUrlError("Data reset successfully!"); // Using urlError for generic success messages temporarily
      setTimeout(() => setUrlError(null), 3000);
      setResetConfirm(false);
    } catch (e) {
      console.error("Reset error:", e);
      setUrlError("Failed to reset data.");
      setResetConfirm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || result.source.index === result.destination.index) return;

    const items = Array.from(ministries);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updates = items.map((item, index) => ({ id: item.id, order: index }));

    try {
      await firestoreService.updateMinistryOrders(updates);
    } catch (e) {
      console.error("Failed to update orders", e);
      setUrlError("Failed to reorder ministries.");
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || userRole !== 'ADMIN') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-slate-300" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">សិទ្ធិចូលប្រើប្រាស់ត្រូវបានកំណត់</h1>
        <p className="text-slate-500 mb-8">មានតែអ្នកគ្រប់គ្រងប៉ុណ្ណោះដែលអាចចូលប្រើទំព័រនេះបាន។<br/>(Only admins can access this page.)</p>
        {!user ? (
          <button 
            onClick={() => login('ADMIN')}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
          >
            ចូលជាអ្នកគ្រប់គ្រង (Admin Sign In)
          </button>
        ) : (
          <Link href="/" className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg">
            ត្រឡប់ទៅទំព័រដើម
          </Link>
        )}
        <Link href="/" className="mt-6 text-slate-400 hover:text-slate-600 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> ត្រឡប់ទៅវិញ
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/" className="inline-flex items-center text-slate-500 hover:text-slate-800 mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
            <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-slate-500">Manage ministry information, quizzes, and terms</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleAddMinistry}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" /> Add Ministry
            </button>
            <button 
              onClick={resetToInitial}
              className="text-xs font-bold text-red-500 hover:bg-red-50 px-4 py-2.5 rounded-xl border border-red-100 transition-all"
            >
              Reset to Initial Data
            </button>
          </div>
        </header>

        {urlError && (
          <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${urlError.includes('success') ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'} border`}>
            {urlError.includes('success') ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
            <div className="flex-1 text-sm font-medium">{urlError}</div>
            <button onClick={() => setUrlError(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {resetConfirm && (
           <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl flex flex-col sm:flex-row items-center gap-4 justify-between">
              <div className="flex items-center gap-3 text-orange-800 font-medium text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                This will overwrite all changes with initial data. Continue?
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setResetConfirm(false)} className="px-4 py-2 bg-white text-slate-600 text-sm font-bold border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">Cancel</button>
                <button onClick={confirmResetToInitial} disabled={saving} className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-all disabled:opacity-50">Confirm Reset</button>
              </div>
           </div>
        )}

        {deleteConfirm && (
           <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex flex-col sm:flex-row items-center gap-4 justify-between">
              <div className="flex items-center gap-3 text-red-800 font-medium text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                Are you sure you want to delete &quot;{deleteConfirm.name}&quot;? This action cannot be undone.
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 bg-white text-slate-600 text-sm font-bold border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">Cancel</button>
                <button onClick={confirmDeleteMinistry} disabled={saving} className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-all disabled:opacity-50">Delete</button>
              </div>
           </div>
        )}

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="ministriesList">
            {(provided) => (
              <div 
                className="grid gap-6 pb-20"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {(editingId && editForm && !ministries.find(m => m.id === editingId) 
                   ? [editForm, ...ministries] 
                   : ministries).map((ministry, index) => (
                  <Draggable key={ministry.id} draggableId={ministry.id} index={index} isDragDisabled={!!editingId}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        style={{ ...provided.draggableProps.style }}
                      >
                        <motion.div
                          layout
                          className={`bg-white rounded-3xl border border-slate-200 overflow-hidden ${snapshot.isDragging ? 'shadow-xl ring-2 ring-blue-500/50' : 'shadow-sm'}`}
                        >
                          {editingId === ministry.id && editForm ? (
                            <div className="p-8 space-y-8">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                                <div>
                                  <h2 className="text-2xl font-bold text-slate-900">Editing {ministry.khmerName}</h2>
                                  <p className="text-sm text-slate-500">{ministry.id.toUpperCase()}</p>
                                </div>
                                  <div className="flex items-center gap-3">
                                    <Link 
                                      href={`/ministry/${ministry.id}`} 
                                      target="_blank"
                                      className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-emerald-600 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-all border border-emerald-100"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                      តេស្តមើលមុខងារ (Test)
                                    </Link>
                                    {autoSaving && <span className="text-sm font-medium text-slate-400 flex items-center gap-1"><div className="w-3 h-3 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" /> Auto-saving...</span>}
                                    <button
                                      onClick={handleSave}
                                      disabled={!!urlError || saving}
                                      className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-600/20"
                                    >
                                      {saving ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                                      {saving ? 'Closing...' : (autoSaving ? 'Saving...' : 'Done')}
                                    </button>
                                  </div>
                              </div>
                              <div className="space-y-10">
                                {/* Basic Info */}
                                <section>
                                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <div className="w-1 h-6 bg-blue-600 rounded-full" />
                                    Basic Information
                                  </h3>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                      <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ministry Name (Khmer)</label>
                                        <input 
                                          type="text" 
                                          value={editForm.khmerName}
                                          onChange={(e) => updateField('khmerName', e.target.value)}
                                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-bold text-lg"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ministry Name (English)</label>
                                        <input 
                                          type="text" 
                                          value={editForm.name}
                                          onChange={(e) => updateField('name', e.target.value)}
                                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Logo URL</label>
                                        <input 
                                          type="text" 
                                          value={editForm.logo}
                                          onChange={(e) => updateField('logo', e.target.value)}
                                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Color Theme</label>
                                        <input 
                                          type="text" 
                                          value={editForm.color}
                                          onChange={(e) => updateField('color', e.target.value)}
                                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                        />
                                      </div>
                                    </div>
                                    <div>
                                       <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Preview</label>
                                       <div className="aspect-video bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative">
                                          <SafeImage src={editForm.logo} alt="Preview" fill className="object-contain p-4" />
                                       </div>
                                    </div>
                                  </div>
                                </section>
                                {/* Detailed Info */}
                                <section>
                                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description / Details</label>
                                  <textarea 
                                    rows={6}
                                    value={editForm.details || editForm.description}
                                    onChange={(e) => updateField('details', e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
                                  />
                                </section>
                                {/* Terminology Section */}
                                <section>
                                  <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                      <div className="w-1 h-6 bg-emerald-500 rounded-full" />
                                      Terminology (ពន្យល់ពាក្យ)
                                    </h3>
                                    <button onClick={addTerm} className="flex items-center gap-1 text-sm font-bold text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-all">
                                      <Plus className="w-4 h-4" /> Add Term
                                    </button>
                                  </div>
                                  <div className="space-y-3">
                                    {editForm.terms?.map((term, idx) => (
                                      <div key={idx} className="flex gap-3 group">
                                        <input 
                                          type="text" 
                                          placeholder="Term"
                                          value={term.term}
                                          onChange={(e) => {
                                            const terms = [...(editForm.terms || [])];
                                            terms[idx].term = e.target.value;
                                            updateField('terms', terms);
                                          }}
                                          className="w-1/3 px-4 py-2 bg-white border border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                                        />
                                        <input 
                                          type="text" 
                                          placeholder="Definition"
                                          value={term.definition}
                                          onChange={(e) => {
                                            const terms = [...(editForm.terms || [])];
                                            terms[idx].definition = e.target.value;
                                            updateField('terms', terms);
                                          }}
                                          className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                                        />
                                        <button onClick={() => removeTerm(idx)} className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </section>

                                {/* MCQs Section */}
                                <section>
                                   <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                      <div className="w-1 h-6 bg-purple-500 rounded-full" />
                                      Multiple Choice Questions (សំណួរពហុចម្លើយ)
                                    </h3>
                                    <button onClick={addMcqCategory} className="text-sm font-bold text-purple-600 px-3 py-1.5 rounded-lg transition-all">
                                      <Plus className="w-4 h-4 inline mr-1" /> Add Category
                                    </button>
                                  </div>
                                  <div className="space-y-6">
                                    <CategoryEditor
                                    categories={editForm.mcqs || []}
                                    updateParent={(newMcqs) => updateField('mcqs', newMcqs)}
                                    type="mcq"
                                  />
                                  </div>
                                </section>

                                {/* QA Section */}
                                <section>
                                   <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                      <div className="w-1 h-6 bg-pink-500 rounded-full" />
                                      Short Answer Questions (សំណួរចម្លើយ)
                                    </h3>
                                    <button onClick={addQaCategory} className="text-sm font-bold text-pink-600 px-3 py-1.5 rounded-lg transition-all">
                                      <Plus className="w-4 h-4 inline mr-1" /> Add Category
                                    </button>
                                  </div>
                                  <div className="space-y-6">
                                    <CategoryEditor
                                    categories={editForm.shortAnswers || []}
                                    updateParent={(newQa) => updateField('shortAnswers', newQa)}
                                    type="qa"
                                  />
                                  </div>
                                </section>
                              </div>
                            </div>
                          ) : (
                            <div className="p-6 flex items-center gap-6">
                              <div {...provided.dragHandleProps} className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing p-1 transition-colors">
                                <GripVertical className="w-5 h-5" />
                              </div>
                              <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex-shrink-0 flex items-center justify-center p-2 relative overflow-hidden">
                                <SafeImage src={ministry.logo} alt="" fill className="object-contain p-2" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-800 text-lg truncate">{ministry.khmerName}</h3>
                                <p className="text-sm text-slate-500 truncate">{ministry.name}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEdit(ministry)}
                                  className="flex-shrink-0 flex items-center gap-2 bg-slate-50 text-slate-600 hover:text-blue-600 px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-all font-bold text-sm"
                                >
                                  <Pencil className="w-4 h-4" />
                                  Edit Content
                                </button>
                                <button
                                  onClick={() => handleDeleteMinistry(ministry.id, ministry.khmerName)}
                                  className="flex-shrink-0 flex items-center justify-center p-2.5 bg-slate-50 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
}

