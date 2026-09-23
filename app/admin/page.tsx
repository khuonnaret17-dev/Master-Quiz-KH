'use client';



import React, { useState, useEffect, useRef } from 'react';
import { useFirebase } from '@/lib/FirebaseProvider';
import { db } from '@/lib/firebase';
import { setDoc, doc, deleteDoc, collection, onSnapshot, updateDoc } from 'firebase/firestore';
import { Ministry, QuizCategory, ShortAnswerCategory } from '@/lib/types';
import { motion, AnimatePresence } from 'motion/react';
import { Save, X, Pencil, ArrowLeft, ArrowUp, ArrowDown, AlertCircle, CheckCircle2, Plus, Trash2, ChevronDown, ChevronUp, GripVertical, ExternalLink, Send, Users, Shield, Crown, Key, BookOpen, Building2 } from 'lucide-react';
import Link from 'next/link';
import SafeImage from '@/components/SafeImage';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { firestoreService } from '@/lib/firestore-service';
import { generateQuizImageBlob } from '@/lib/quiz-image-generator';
import { auth } from '@/lib/firebase';

interface AdminQuizItem {
  question: string;
  options?: string[];
  correctIndex?: number;
  answer?: string;
  explanation?: string;
}

interface AdminCategory {
  category: string;
  items: AdminQuizItem[];
  subCategories?: AdminCategory[];
}

interface AdminUser {
  uid: string;
  username: string;
  source: 'custom' | 'standard';
  role?: 'ADMIN' | 'USER';
  isPremium?: boolean;
  premiumUntil?: { toDate?: () => Date } | string | null;
  createdAt?: { toDate?: () => Date } | string | null;
  email?: string;
  name?: string;
  bankInfo?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    active: boolean;
    linkedAt: string;
  };
}

function parseTimestamp(val: { toDate?: () => Date } | string | null | undefined): number {
  if (!val) return 0;
  if (typeof val === 'object' && typeof val.toDate === 'function') {
    return val.toDate().getTime();
  }
  if (typeof val === 'string') {
    const time = new Date(val).getTime();
    return isNaN(time) ? 0 : time;
  }
  return 0;
}

function formatDateString(val: { toDate?: () => Date } | string | null | undefined): string {
  if (!val) return '-';
  if (typeof val === 'object' && typeof val.toDate === 'function') {
    return val.toDate().toLocaleDateString();
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
  }
  return '-';
}

function CategoryEditor({
  categories,
  updateParent,
  type,
  depth = 0,
  parentPath = [],
  onSendTelegram
}: {
  categories: AdminCategory[];
  updateParent: (newCategories: AdminCategory[]) => void;
  type: 'mcq' | 'qa';
  depth?: number;
  parentPath?: string[];
  onSendTelegram?: (item: AdminQuizItem, type: 'mcq' | 'qa', elementId: string, categoryName: string) => void;
}) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const toggleExpand = (cIdx: number) => {
    setExpanded(prev => ({ ...prev, [cIdx]: prev[cIdx] === undefined ? false : !prev[cIdx] }));
  };

  const handleUpdateCategory = (cIdx: number, updatedCat: AdminCategory) => {
    const newCats = [...categories];
    newCats[cIdx] = updatedCat;
    updateParent(newCats);
  };

  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const parseBulkData = (text: string) => {
      const items: AdminQuizItem[] = [];
      const lines = text?.split('\n');
      let currentItem: AdminQuizItem | null = null;
      let inAnswer = false;
      let lastLineBlank = true;
      
      lines.forEach(line => {
          const trimmedLine = line.trim();
          if (!trimmedLine) {
              lastLineBlank = true;
              return;
          }

          // Question: Find "1. ..." or "១. ..." with optional spaces and delimiters
          const qMatch = trimmedLine.match(/^([០-❾a-zA-Z0-9]+)\s*[.\-)]\s*(.*)/);
          const isProbablyQuestion = qMatch && (lastLineBlank || !inAnswer || trimmedLine.includes('តើ') || trimmedLine.includes('?'));

          if (isProbablyQuestion) {
              if (currentItem) items.push(currentItem);
              currentItem = type === 'mcq' 
                ? { question: qMatch[2], options: [], correctIndex: 0, explanation: '' }
                : { question: qMatch[2], answer: '', explanation: '' };
              inAnswer = false;
              lastLineBlank = false;
              return;
          }

          // Option/Answer
          if (type === 'mcq' && currentItem) {
            const oMatch = trimmedLine.match(/^(ក|ខ|គ|ឃ|ង|ច|ឆ|ជ|ឈ|ញ|[a-dA-D])\s*[.\-)]\s*(.*)/i);
            if (oMatch) {
              const optText = oMatch[2];
              let isCorrect = false;
              let cleanOptText = optText;

              if (/ចម្លើយត្រឹមត្រូវ|ត្រឹមត្រូវ/.test(optText)) {
                isCorrect = true;
                cleanOptText = optText
                  .replace(/\s*\(\s*ចម្លើយត្រឹមត្រូវ\s*\)/g, '')
                  .replace(/\s*\[\s*ចម្លើយត្រឹមត្រូវ\s*\]/g, '')
                  .replace(/\s*ចម្លើយត្រឹមត្រូវ/g, '')
                  .replace(/\s*\(\s*ត្រឹមត្រូវ\s*\)/g, '')
                  .replace(/\s*ត្រឹមត្រូវ/g, '')
                  .trim();
              }
              
              if (!currentItem.options) currentItem.options = [];
              currentItem.options.push(cleanOptText);
              if (isCorrect) currentItem.correctIndex = currentItem.options.length - 1;
            } else {
               // If there is an explanation indicator (like 'យោង' or 'ពន្យល់'), or if options are already populated
               const isExplanationLine = trimmedLine.startsWith('យោង') || 
                                         trimmedLine.startsWith('ពន្យល់') || 
                                         trimmedLine.startsWith('ឯកសារយោង') || 
                                         trimmedLine.toLowerCase().startsWith('ref') || 
                                         trimmedLine.toLowerCase().startsWith('source') ||
                                         (currentItem.options && currentItem.options.length > 0);
               if (isExplanationLine) {
                 currentItem.explanation = currentItem.explanation 
                   ? currentItem.explanation + '\n' + trimmedLine 
                   : trimmedLine;
               } else {
                 currentItem.question = currentItem.question + '\n' + trimmedLine;
               }
            }
          } else if (type === 'qa' && currentItem) {
            // Check for explanation/reference
            if (trimmedLine.startsWith('យោង') || trimmedLine.startsWith('ពន្យល់') || trimmedLine.startsWith('ឯកសារយោង') || trimmedLine.toLowerCase().startsWith('ref') || trimmedLine.toLowerCase().startsWith('source')) {
                currentItem.explanation = currentItem.explanation ? currentItem.explanation + '\n' + trimmedLine : trimmedLine;
                inAnswer = false; // "យោង" usually marks the end of the answer
            } else if (trimmedLine.startsWith('ចម្លើយ') || trimmedLine.startsWith('ចំលើយ')) {
                // Answer looks like "ចម្លើយ: ..." or just text
                inAnswer = true;
                const ansText = trimmedLine.replace(/^(ចម្លើយ|ចំលើយ)\s*[:៖]?\s*/, '').trim();
                currentItem.answer = currentItem.answer ? currentItem.answer + '\n' + ansText : ansText;
            } else if (inAnswer) {
                currentItem.answer = currentItem.answer ? currentItem.answer + '\n' + trimmedLine : trimmedLine;
            } else {
                // If it's after a question but before answer or after explanation
                if (currentItem.explanation) {
                    currentItem.explanation += '\n' + trimmedLine;
                } else {
                    currentItem.question = currentItem.question + '\n' + trimmedLine;
                }
            }
          }
          lastLineBlank = false;
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
    setExpanded(prev => ({ ...prev, [cIdx]: true })); // Expand when adding sub
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;
      
      const newValue = value.substring(0, start) + "\t" + value.substring(end);
      
      // Update item state based on which textarea it is
      // This is a bit tricky because we're inside a loop, but we can use the ref or just set the value directly then trigger change
      target.value = newValue;
      target.selectionStart = target.selectionEnd = start + 1;
      
      // Trigger the appropriate onChange
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  return (
    <div className={`space-y-4 ${depth > 0 ? 'ml-6 mt-2 border-l border-slate-200 pl-4' : ''}`}>
      {categories.map((cat, cIdx) => {
        const isExpanded = expanded[cIdx] !== false; // Default to true
        return (
        <div key={cIdx} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5">
              <button 
                onClick={() => {
                  if (cIdx > 0) {
                    const newCats = [...categories];
                    [newCats[cIdx - 1], newCats[cIdx]] = [newCats[cIdx], newCats[cIdx - 1]];
                    updateParent(newCats);
                  }
                }}
                disabled={cIdx === 0}
                className="text-slate-300 hover:text-blue-500 disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => {
                  if (cIdx < categories.length - 1) {
                    const newCats = [...categories];
                    [newCats[cIdx + 1], newCats[cIdx]] = [newCats[cIdx], newCats[cIdx + 1]];
                    updateParent(newCats);
                  }
                }}
                disabled={cIdx === categories.length - 1}
                className="text-slate-300 hover:text-blue-500 disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              onClick={() => toggleExpand(cIdx)}
              className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
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
          </div>
          
          {isExpanded && (
            <div className="space-y-4 ml-8">
              {/* Render Items */}
              <div className="space-y-4">
                {cat.items && cat.items.map((item: AdminQuizItem, iIdx: number) => {
                  const uniqueId = `admin-item-${type}-${depth}-${cIdx}-${iIdx}`;
                  return (
                    <div key={iIdx} id={uniqueId} className="p-4 border border-slate-200 rounded-2xl text-xs bg-white shadow-sm space-y-2.5 relative overflow-hidden">
                      <textarea
                        className="w-full font-bold bg-transparent outline-none border-b border-slate-100 pb-1.5 resize-none overflow-hidden"
                        value={item.question}
                        rows={item.question ? item.question?.split('\n').length : 1}
                        onKeyDown={handleKeyDown}
                        onChange={(e) => {
                          const newItems = [...cat.items];
                          newItems[iIdx].question = e.target.value;
                          handleUpdateCategory(cIdx, { ...cat, items: newItems });
                        }}
                        placeholder="Question"
                      />
                      
                      {type === 'mcq' ? (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {(item.options || []).map((opt: string, oIdx: number) => (
                            <div key={oIdx} className="flex items-center gap-1.5 p-1 bg-slate-50/50 rounded-lg">
                              <input 
                                type="radio"
                                checked={item.correctIndex === oIdx}
                                onChange={() => {
                                  const newItems = [...cat.items];
                                  newItems[iIdx].correctIndex = oIdx;
                                  handleUpdateCategory(cIdx, { ...cat, items: newItems });
                                }}
                                className="cursor-pointer"
                              />
                              <input 
                                value={opt}
                                placeholder={`Option ${oIdx + 1}`}
                                onChange={(e) => {
                                  const newItems = [...cat.items];
                                  if (!newItems[iIdx].options) {
                                    newItems[iIdx].options = [];
                                  }
                                  newItems[iIdx].options![oIdx] = e.target.value;
                                  handleUpdateCategory(cIdx, { ...cat, items: newItems });
                                }}
                                className="text-xs w-full bg-white rounded px-1.5 py-1 outline-none border border-slate-100 focus:border-blue-200"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <textarea
                          value={item.answer}
                          placeholder="Answer"
                          rows={item.answer ? item.answer?.split('\n').length : 1}
                          onKeyDown={handleKeyDown}
                          onChange={(e) => {
                            const newItems = [...cat.items];
                            newItems[iIdx].answer = e.target.value;
                            handleUpdateCategory(cIdx, { ...cat, items: newItems });
                          }}
                          className="text-xs w-full bg-slate-50 border border-slate-100 rounded px-2 py-1.5 outline-none focus:border-blue-200 mt-1 resize-none overflow-hidden"
                        />
                      )}

                      {/* Explanation Field */}
                      <textarea
                        value={item.explanation || ''}
                        placeholder="Explanation (ការពន្យល់ - ស្រេចចិត្ត)"
                        rows={item.explanation ? item.explanation?.split('\n').length : 1}
                        onKeyDown={handleKeyDown}
                        onChange={(e) => {
                          const newItems = [...cat.items];
                          newItems[iIdx].explanation = e.target.value;
                          handleUpdateCategory(cIdx, { ...cat, items: newItems });
                        }}
                        className="text-[10px] w-full bg-slate-50/40 text-slate-500 border border-slate-100/60 rounded px-2 py-1 outline-none focus:border-purple-200 mt-1 resize-none overflow-hidden"
                      />
                      
                      <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100" data-html2canvas-ignore="true">
                        {onSendTelegram ? (
                          <button
                            type="button"
                            onClick={() => {
                              const fullCategoryName = [...parentPath, cat.category].join('_').replace(/[\s>]+/g, '_');
                              onSendTelegram(item, type, uniqueId, fullCategoryName)
                            }}
                            className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-extrabold text-blue-600 bg-blue-50/50 hover:bg-blue-100 hover:text-blue-700 px-3 py-1.5 rounded-lg transition-all border border-blue-100/50"
                          >
                            <Send className="w-3 h-3" />
                            <span>ផ្ញើទៅ Telegram</span>
                          </button>
                        ) : <div />}
                        
                        <div className="flex items-center gap-1">
                          <button 
                            type="button"
                            onClick={() => {
                              if (iIdx > 0) {
                                const newItems = [...cat.items];
                                [newItems[iIdx - 1], newItems[iIdx]] = [newItems[iIdx], newItems[iIdx - 1]];
                                handleUpdateCategory(cIdx, { ...cat, items: newItems });
                              }
                            }}
                            disabled={iIdx === 0}
                            className="text-slate-400 hover:text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg transition-all disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              if (iIdx < cat.items.length - 1) {
                                const newItems = [...cat.items];
                                [newItems[iIdx + 1], newItems[iIdx]] = [newItems[iIdx], newItems[iIdx + 1]];
                                handleUpdateCategory(cIdx, { ...cat, items: newItems });
                              }
                            }}
                            disabled={iIdx === cat.items.length - 1}
                            className="text-slate-400 hover:text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg transition-all disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              const newItems = cat.items.filter((_: AdminQuizItem, i: number) => i !== iIdx);
                              handleUpdateCategory(cIdx, { ...cat, items: newItems });
                            }}
                            className="text-slate-400 hover:text-red-550 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                      onKeyDown={handleKeyDown}
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
                  parentPath={[...parentPath, cat.category]}
                  onSendTelegram={onSendTelegram}
                />
              )}
            </div>
          )}
        </div>
        )})}
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
  const [isMounted, setIsMounted] = useState(false);
  const { ministries, loading, user, authLoading, login, userRole } = useFirebase();

  useEffect(() => {
    setIsMounted(true);
  }, []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Ministry | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'INSTITUTION' | 'SUBJECT' | 'USERS'>('INSTITUTION');
  const [usersInfo, setUsersInfo] = useState<AdminUser[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    if (activeTab === 'USERS') {
      if (!user || userRole !== 'ADMIN') return; // Do not fetch if not authenticated as admin
      const setupListener = async () => {
        try {
          
          let regularUsers: AdminUser[] = [];
          let customUsers: AdminUser[] = [];
          
          const updateCombined = () => {
             const combined = [...customUsers, ...regularUsers];
             combined.sort((a, b) => {
               const timeA = parseTimestamp(a.createdAt);
               const timeB = parseTimestamp(b.createdAt);
               return timeB - timeA;
             });
             setUsersInfo(combined);
          };

          const unsubCustom = onSnapshot(collection(db, 'custom_users'), (querySnapshot) => {
            customUsers = [];
            querySnapshot.forEach((doc) => {
              customUsers.push({ uid: doc.id, username: doc.data().username || doc.id, source: 'custom', ...doc.data() });
            });
            updateCombined();
          }, (error) => {
            console.error("Error fetching custom users:", error);
          });
          
          let unsubStandard: (() => void) | null = null;
          if (auth.currentUser) {
            unsubStandard = onSnapshot(collection(db, 'users'), (querySnapshot) => {
              regularUsers = [];
              querySnapshot.forEach((doc) => {
                const data = doc.data();
                regularUsers.push({ uid: doc.id, username: data.email || data.name || doc.id, source: 'standard', ...data });
              });
              updateCombined();
            }, (error) => {
              console.error("Error fetching standard users:", error);
            });
          }
          
          unsubscribe = () => {
             unsubCustom();
             if (unsubStandard) unsubStandard();
          };
          
        } catch (error) {
          console.error("Error setting up users listener:", error);
        }
      };
      setupListener();
    }
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [activeTab, user, userRole]);

  const handleGrantPremium = (user: AdminUser) => {
    setUserActionDialog({ type: 'GRANT_PREMIUM', username: user.username, uid: user.uid, source: user.source });
  };

  const handleRevokePremium = (user: AdminUser) => {
    setUserActionDialog({ type: 'REVOKE_PREMIUM', username: user.username, uid: user.uid, source: user.source });
  };

  const handleDeleteUser = (user: AdminUser) => {
    setUserActionDialog({ type: 'DELETE_USER', username: user.username, uid: user.uid, source: user.source });
  };

  const handleResetPassword = (user: AdminUser) => {
    setNewPasswordValue("");
    setUserActionDialog({ type: 'RESET_PASSWORD', username: user.username, uid: user.uid, source: user.source });
  };

  const confirmUserAction = async () => {
    if (!userActionDialog) return;
    const { type, username, uid, source } = userActionDialog;
    
    try {
      
      const collectionName = source === 'custom' ? 'custom_users' : 'users';
      const docId = source === 'custom' ? username.toLowerCase() : uid;
      const userRef = doc(db, collectionName, docId);

      if (type === 'DELETE_USER') {
        await deleteDoc(userRef);
        setUsersInfo(usersInfo.filter((u: AdminUser) => u.uid !== uid));
        setUserActionDialog(null);
      } else {
        const updateData: Partial<AdminUser> & { password?: string } = {};
        if (type === 'GRANT_PREMIUM') {
          updateData.isPremium = true;
          updateData.premiumUntil = "2099-12-31T23:59:59.000Z"; 
        } else if (type === 'REVOKE_PREMIUM') {
          updateData.isPremium = false;
          updateData.premiumUntil = null;
        } else if (type === 'RESET_PASSWORD') {
          if (source === 'standard') {
             setUserActionDialog(null);
             return;
          }
          if (!newPasswordValue || newPasswordValue.trim().length === 0) return;
          updateData.password = newPasswordValue.trim();
        }
        
        await updateDoc(userRef, updateData as Record<string, unknown>);
        
        setUsersInfo(usersInfo.map((u: AdminUser) => {
          if (u.uid === uid) {
            return { ...u, ...updateData };
          }
          return u;
        }));
        setUserActionDialog(null);
      }
    } catch (e) {
      console.error("Action error", e);
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, name: string} | null>(null);
  const [userActionDialog, setUserActionDialog] = useState<{type: 'GRANT_PREMIUM' | 'REVOKE_PREMIUM' | 'DELETE_USER' | 'RESET_PASSWORD', username: string, uid: string, source: 'custom' | 'standard'} | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState("");
  const [autoSaving, setAutoSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef(true);

  // Telegram Sending State
  const [sendingQuiz, setSendingQuiz] = useState<AdminQuizItem | null>(null);
  const [sendingQuizType, setSendingQuizType] = useState<'mcq' | 'qa' | null>(null);
  const [sendingCategoryName, setSendingCategoryName] = useState<string>('');
  const [telegramChatId, setTelegramChatId] = useState("");
  const [telegramFormat, setTelegramFormat] = useState<'POLL' | 'TEXT' | 'IMAGE'>('TEXT');
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [telegramProgress, setTelegramProgress] = useState("");
  const [telegramError, setTelegramError] = useState("");

  // Load chat ID on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vignasa_telegram_chat_id') || localStorage.getItem('telegramChatId') || "";
      setTelegramChatId(saved);
    }
  }, []);

  const handleSendTelegramQuiz = async () => {
    if (!sendingQuiz || !telegramChatId) {
      setTelegramError("សូមបញ្ចូល Chat ID!");
      return;
    }
    setTelegramError("");
    setIsSendingTelegram(true);
    setTelegramProgress("កំពុងដំណើរការ...");

    try {
      localStorage.setItem('vignasa_telegram_chat_id', telegramChatId);
      localStorage.setItem('telegramChatId', telegramChatId);

      const botToken = "8301052612:AAE4QDXA2GMi2nMBxfLe2_v-wQSpd-JrML0";

      const escapeHTML = (str: string) => {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      };

        const categoryFooter = `${editForm?.khmerName || editForm?.name || 'ទូទៅ'}${sendingCategoryName ? `_${sendingCategoryName.replace(/[\s>]+/g, '_')}` : ''}`;
        
        if (telegramFormat === 'TEXT') {
          let text = `<b>សំណួរ៖</b> ${escapeHTML(sendingQuiz.question || '')}\n\n`;
          if (sendingQuizType === 'mcq' && sendingQuiz.options && Array.isArray(sendingQuiz.options)) {
            sendingQuiz.options.forEach((opt: string, idx: number) => {
              if (opt) {
                const label = ["A", "B", "C", "D"][idx] || String.fromCharCode(65 + idx);
                text += `<b>${label}.</b> ${escapeHTML(opt)}\n`;
              }
            });
            const correctLabel = ["A", "B", "C", "D"][sendingQuiz.correctIndex ?? 0] || "A";
            text += `\n<b>ចម្លើយត្រឹមត្រូវ៖</b> ${correctLabel}`;
          } else {
            text += `<b>ចម្លើយ៖</b> ${escapeHTML(sendingQuiz.answer || '')}`;
          }
          
          let formattedExplanation = "";
          if (sendingQuiz.explanation) {
             const trimmedExp = sendingQuiz.explanation.trim();
             if (/^(ពន្យល់|យោង|ឯកសារយោង)/.test(trimmedExp)) {
                formattedExplanation = trimmedExp;
             } else {
                formattedExplanation = `ពន្យល់ ៖ ${trimmedExp}`;
             }
          }

          text += `\n\n<a href="https://t.me/qiuzs_bot">Master Quiz KH</a> | វិញ្ញាសា | ${categoryFooter}`;
          if (formattedExplanation) {
            text += `\n\n<b>${escapeHTML(formattedExplanation)}</b>`;
          }

        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramChatId.trim(),
            text,
            parse_mode: 'HTML'
          })
        });
        if (!res.ok) throw new Error((await res.json()).description);

      } else if (telegramFormat === 'POLL') {
        if (sendingQuizType !== 'mcq') {
          throw new Error("ទម្រង់ Poll អាចប្រើប្រាស់បានតែជាមួយសំណួរពហុជ្រើសរើស (MCQ) តែប៉ុណ្ណោះ!");
        }
        if (!sendingQuiz.options || !Array.isArray(sendingQuiz.options) || sendingQuiz.options.length < 2) {
          throw new Error("សំណួរនេះមិនមានជម្រើសគ្រប់គ្រាន់សម្រាប់បង្កើត Poll ទេ។");
        }

        // Prepare choices
        const rawOptions = sendingQuiz.options.filter(Boolean);
        const optionsList = rawOptions.map((opt: string, idx: number) => {
          const label = ["A", "B", "C", "D"][idx] || String.fromCharCode(65 + idx);
          return `${label}. ${opt}`.substring(0, 100);
        });

        if (optionsList.length < 2) throw new Error("ត្រូវការជម្រើសចម្លើយយ៉ាងហោចណាស់ ២។");

        const correctIndex = Math.min(sendingQuiz.correctIndex || 0, optionsList.length - 1);

        const payload: Record<string, unknown> = {
          chat_id: telegramChatId.trim(),
          question: (sendingQuiz.question || '').substring(0, 300),
          options: optionsList,
          type: 'quiz',
          correct_option_id: correctIndex,
          is_anonymous: true
        };

        let formattedExplanation = "";
        if (sendingQuiz.explanation) {
           const trimmedExp = sendingQuiz.explanation.trim();
           if (/^(ពន្យល់|យោង|ឯកសារយោង)/.test(trimmedExp)) {
              formattedExplanation = trimmedExp;
           } else {
              formattedExplanation = `ពន្យល់ ៖ ${trimmedExp}`;
           }
        }

        const prefix = `<a href="https://t.me/qiuzs_bot">Master Quiz KH</a> | វិញ្ញាសា | ${categoryFooter}\n\n`;
        const prefixTextLength = `Master Quiz KH | វិញ្ញាសា | ${categoryFooter}\n\n`.length;
        const suffix = "";
        let expText = formattedExplanation;
        if (expText) {
          const allowedLen = 200 - suffix.length - prefixTextLength;
          if (expText.length > allowedLen) {
            expText = expText.substring(0, allowedLen - 3) + "...";
          }
          payload.explanation = prefix + escapeHTML(expText) + suffix;
        } else {
          payload.explanation = prefix.trim();
        }
        payload.explanation_parse_mode = 'HTML';

        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPoll`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error((await res.json()).description);

      } else if (telegramFormat === 'IMAGE') {
        setTelegramProgress("កំពុងបង្កើតរូបភាព...");
        
        const blob = await generateQuizImageBlob(
          {
            question: sendingQuiz.question,
            type: sendingQuizType || 'mcq',
            options: sendingQuiz.options,
            correctIndex: sendingQuiz.correctIndex,
            answer: sendingQuiz.answer,
            explanation: sendingQuiz.explanation
          },
          {
            khmerName: editForm?.khmerName,
            name: editForm?.name,
            logo: editForm?.logo
          }
        );

        if (!blob || blob.size === 0) throw new Error("បរាជ័យក្នុងការបង្កើតឯកសាររូបភាព!");

        setTelegramProgress("កំពុងផ្ញើរូបភាពទៅ Telegram...");
        const formData = new FormData();
        formData.append("chat_id", telegramChatId.trim());
        formData.append("photo", blob, "quiz.png");

        let caption = `<b>សំណួរ៖</b> ${escapeHTML((sendingQuiz.question || '').substring(0, 300))}`;
        if (sendingQuizType === 'mcq') {
          caption += `\n<i>(សូមពិនិត្យចម្លើយត្រឹមត្រូវ និងការពន្យល់ក្នុងរូបភាព)</i>`;
        } else {
          caption += `\n<b>ចម្លើយ៖</b> ${escapeHTML((sendingQuiz.answer || '').substring(0, 150))}`;
        }

        let formattedExplanation = "";
        if (sendingQuiz.explanation) {
           const trimmedExp = sendingQuiz.explanation.trim();
           if (/^(ពន្យល់|យោង|ឯកសារយោង)/.test(trimmedExp)) {
              formattedExplanation = trimmedExp;
           } else {
              formattedExplanation = `ពន្យល់ ៖ ${trimmedExp}`;
           }
        }

        caption += `\n\n<a href="https://t.me/qiuzs_bot">Master Quiz KH</a> | វិញ្ញាសា | ${categoryFooter}`;
        if (formattedExplanation) {
          caption += `\n\n<b>${escapeHTML(formattedExplanation)}</b>`;
        }
        formData.append("caption", caption);
        formData.append("parse_mode", "HTML");

        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
          method: 'POST',
          body: formData
        });
        if (!res.ok) throw new Error((await res.json()).description);
      }

      setTelegramProgress("ផ្ញើទៅ Telegram បានជោគជ័យ! 🎉");
      setTimeout(() => {
        setSendingQuiz(null);
      }, 1500);
    } catch (err: unknown) {
      console.error(err);
      let errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg?.includes("chat not found")) {
        errorMsg = "រកមិនឃើញ Chat ទេ! សូមប្រាកដថាអ្នកបានបញ្ជាក់ ID ត្រឹមត្រូវ និងបានបញ្ចូល Bot (@VignasaCambodia_Bot) ទៅក្នុង Group/Channel ជា Admin ឬអ្នកបានចុច Start Bot នេះរួចហើយ។";
      }
      setTelegramError(`មិនអាចផ្ញើបានទេ៖ ${errorMsg}`);
    } finally {
      setIsSendingTelegram(false);
      setTelegramProgress("");
    }
  };

  const validateUrl = (url: string) => {
    if (!url) return "URL is required";
    try {
      new URL(url);
      return null;
    } catch {
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
            answer: item.answer,
            explanation: item.explanation || ""
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
          await setDoc(doc(db, 'ministries', editingId), finalData, { merge: true });
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

  const handleEdit = (ministry: Ministry) => {
    setEditingId(ministry.id);
    setEditForm({ ...ministry });
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
      name: activeTab === 'SUBJECT' ? "New Subject" : "New Ministry",
      khmerName: activeTab === 'SUBJECT' ? "វិញ្ញាសាថ្មី" : "ក្រសួងថ្មី",
      description: "Description",
      logo: "https://picsum.photos/seed/ministry/200/200",
      color: "#0f172a",
      groupType: activeTab === 'SUBJECT' ? 'SUBJECT' : 'INSTITUTION',
      subjectType: 'MCQ',
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

  const updateField = (field: keyof Ministry, value: Ministry[keyof Ministry]) => {
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

  // QA Helpers
  const addQaCategory = () => {
    const qa = [...(editForm?.shortAnswers || []), { category: "New Category", items: [] }];
    updateField('shortAnswers', qa);
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || result.source.index === result.destination.index) return;

    const filteredList = ministries.filter(m => (m.groupType || 'INSTITUTION') === activeTab);
    const items = Array.from(filteredList);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updates = items.map((item, index) => ({ id: item.id, order: index }));

    try {
      await firestoreService.updateMinistryOrders(updates);
    } catch (e) {
      console.error("Failed to update orders", e);
      setUrlError("Failed to reorder items.");
    }
  };

  if (!isMounted || loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || userRole !== 'ADMIN') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-transparent px-6 text-center">
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
    <div className="min-h-screen bg-transparent p-6 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <Link href="/" className="inline-flex items-center text-slate-500 hover:text-slate-800 mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
            <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-slate-500">Manage ministry information, quizzes, and terms</p>
          </div>
          {(activeTab === 'INSTITUTION' || activeTab === 'SUBJECT') && (
            <div className="flex items-center gap-3">
              <button 
                onClick={handleAddMinistry}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
              >
                <Plus className="w-4 h-4" /> {activeTab === 'INSTITUTION' ? 'Add Ministry' : 'Add Subject'}
              </button>
            </div>
          )}
        </header>

        <div className="flex gap-8 mb-8 border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('INSTITUTION')}
            className={`pb-4 text-sm font-bold transition-colors flex items-center gap-2 ${
              activeTab === 'INSTITUTION' ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Building2 className="w-4 h-4" /> គ្រប់គ្រងក្រសួង
          </button>
          <button 
            onClick={() => setActiveTab('SUBJECT')}
            className={`pb-4 text-sm font-bold transition-colors flex items-center gap-2 ${
              activeTab === 'SUBJECT' ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <BookOpen className="w-4 h-4" /> គ្រប់គ្រងវិញ្ញាសា
          </button>
          <button 
            onClick={() => setActiveTab('USERS')}
            className={`pb-4 text-sm font-bold transition-colors flex items-center gap-2 ${
              activeTab === 'USERS' ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Users className="w-4 h-4" /> គ្រប់គ្រងសមាជិក
          </button>
        </div>

        {urlError && (
          <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${urlError.includes('success') ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'} border`}>
            {urlError.includes('success') ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
            <div className="flex-1 text-sm font-medium">{urlError}</div>
            <button onClick={() => setUrlError(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
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

        {(activeTab === 'INSTITUTION' || activeTab === 'SUBJECT') ? (
          <div>
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
                     : ministries).filter(m => (m.groupType || 'INSTITUTION') === activeTab).map((ministry, index) => (
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
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">ចំណាត់ថ្នាក់ (Group Type)</label>
                                        <select
                                          value={editForm.groupType || 'INSTITUTION'}
                                          onChange={(e) => updateField('groupType', e.target.value)}
                                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-khmer text-sm"
                                        >
                                          <option value="INSTITUTION">ក្រសួង ស្ថាប័ន (Institution)</option>
                                          <option value="SUBJECT">វិញ្ញាសា (Subject)</option>
                                        </select>
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
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
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
                                    updateParent={(newMcqs: AdminCategory[]) => updateField('mcqs', newMcqs as unknown as QuizCategory[])}
                                    type="mcq"
                                    onSendTelegram={(item, type, elementId, categoryName) => {
                                      setSendingQuiz(item);
                                      setSendingQuizType(type);
                                      setSendingCategoryName(categoryName);
                                      setTelegramFormat('POLL');
                                    }}
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
                                    updateParent={(newQa: AdminCategory[]) => updateField('shortAnswers', newQa as unknown as ShortAnswerCategory[])}
                                    type="qa"
                                    onSendTelegram={(item, type, elementId, categoryName) => {
                                      setSendingQuiz(item);
                                      setSendingQuizType(type);
                                      setSendingCategoryName(categoryName);
                                      setTelegramFormat('TEXT');
                                    }}
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
                                <h3 className="font-bold text-slate-800 text-lg truncate flex items-center gap-2">
                                  {ministry.khmerName}
                                  {ministry.groupType === 'SUBJECT' && (
                                    <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">វិញ្ញាសា</span>
                                  )}
                                  {ministry.groupType !== 'SUBJECT' && (
                                    <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">ក្រសួង</span>
                                  )}
                                </h3>
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
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-xl font-bold text-slate-900">បញ្ជីសមាជិក ({usersInfo.length})</h2>
                <p className="text-sm text-slate-500 mt-1">គ្រប់គ្រងគណនី និងសិទ្ធិរបស់សមាជិកទាំងអស់</p>
              </div>
              <div className="relative w-64">
                <input 
                  placeholder="ស្វែងរកសមាជិក..." 
                  className="w-full text-sm rounded-xl px-4 py-2 border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-4 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-widest text-center w-16">No.</th>
                    <th className="px-6 py-4 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-widest">ឈ្មោះគណនី (Username)</th>
                    <th className="px-6 py-4 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-widest">ស្ថានភាពសិទ្ធិ</th>
                    <th className="px-6 py-4 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-widest">ថ្ងៃចុះឈ្មោះ</th>
                    <th className="px-6 py-4 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">សកម្មភាព</th>
                  </tr>
                </thead>
                <tbody>
                  {usersInfo
                    .filter(u => u.username?.toLowerCase().includes(userSearchTerm.toLowerCase()))
                    .map((u: AdminUser, idx: number) => (
                    <tr key={u.uid || idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 border-b border-slate-100 text-sm text-slate-500 text-center font-medium">{idx + 1}</td>
                      <td className="px-6 py-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">
                              {u.username}
                              {u.source === 'standard' && <span className="ml-2 inline-flex items-center bg-blue-100 text-blue-700 font-medium px-2 py-0.5 rounded-md text-[10px] tracking-widest">Google Auth</span>}
                              {u.source === 'custom' && <span className="ml-2 inline-flex items-center bg-purple-100 text-purple-700 font-medium px-2 py-0.5 rounded-md text-[10px] tracking-widest">App Auth</span>}
                            </p>
                            {u.role === 'ADMIN' && (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-red-600 tracking-widest mt-1 bg-red-50 px-2 py-0.5 rounded-md">
                                <Shield className="w-3 h-3" /> Admin
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 border-b border-slate-100">
                        {u.isPremium ? (
                          <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1 rounded-lg w-fit border border-amber-200">
                            <Crown className="w-4 h-4" /> <span className="text-xs font-bold tracking-widest">PREMIUM</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-500 bg-slate-100 px-3 py-1 rounded-lg w-fit border border-slate-200">
                            <span className="text-xs font-bold tracking-widest">NORMAL</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 border-b border-slate-100 text-sm text-slate-600">
                        {formatDateString(u.createdAt)}
                      </td>
                      <td className="px-6 py-4 border-b border-slate-100 text-right">
                        {u.role !== 'ADMIN' && (
                          <div className="flex justify-end gap-2 items-center">
                            {u.isPremium ? (
                              <button 
                                onClick={() => handleRevokePremium(u)}
                                className="h-9 px-4 text-xs font-bold uppercase tracking-widest rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-all flex items-center gap-2"
                              >
                                លុប Premium
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleGrantPremium(u)}
                                className="h-9 px-4 text-xs font-bold uppercase tracking-widest rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center gap-2 shadow-md shadow-blue-600/20"
                              >
                                <Crown className="w-4 h-4" /> ផ្ដល់ Premium
                              </button>
                            )}
                            <button
                              onClick={() => handleResetPassword(u)}
                              className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-slate-200 hover:border-blue-200 transition-all"
                              title="ប្តូរពាក្យសម្ងាត់"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="h-9 w-9 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-slate-200 hover:border-red-200 transition-all"
                              title="លុបគណនីសមាជិក"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {usersInfo.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-sm">
                        មិនមានទិន្នន័យសមាជិក
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* User Action Modal Dialog */}
      <AnimatePresence>
        {userActionDialog && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900">
                    {userActionDialog.type === 'GRANT_PREMIUM' && 'ផ្ដល់សិទ្ធិ Premium'}
                    {userActionDialog.type === 'REVOKE_PREMIUM' && 'លុបសិទ្ធិ Premium'}
                    {userActionDialog.type === 'DELETE_USER' && 'លុបគណនី'}
                    {userActionDialog.type === 'RESET_PASSWORD' && 'ប្តូរពាក្យសម្ងាត់'}
                  </h3>
                  <button onClick={() => setUserActionDialog(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  {userActionDialog.type === 'GRANT_PREMIUM' && (
                    <p className="text-slate-600 text-sm">តើអ្នកពិតជាចង់ផ្ដល់សិទ្ធិ Premium ជាអចិន្ត្រៃយ៍ដល់គណនី &quot;{userActionDialog.username}&quot; មែនទេ?</p>
                  )}
                  {userActionDialog.type === 'REVOKE_PREMIUM' && (
                    <p className="text-slate-600 text-sm">តើអ្នកពិតជាចង់លុបសិទ្ធិ Premium ពីគណនី &quot;{userActionDialog.username}&quot; មែនទេ?</p>
                  )}
                  {userActionDialog.type === 'DELETE_USER' && (
                    <p className="text-slate-600 text-sm font-bold text-red-500">តើអ្នកពិតជាចង់លុបគណនី &quot;{userActionDialog.username}&quot; មែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។</p>
                  )}
                  {userActionDialog.type === 'RESET_PASSWORD' && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">បញ្ចូលពាក្យសម្ងាត់ថ្មីសម្រាប់គណនី &quot;{userActionDialog.username}&quot;</label>
                      <input 
                        type="text" 
                        value={newPasswordValue}
                        onChange={(e) => setNewPasswordValue(e.target.value)}
                        className="w-full h-11 px-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="ពាក្យសម្ងាត់ថ្មី"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-8 flex gap-3 justify-end border-t border-slate-100 pt-6">
                  <button onClick={() => setUserActionDialog(null)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
                    បោះបង់
                  </button>
                  <button 
                    onClick={confirmUserAction}
                    disabled={userActionDialog.type === 'RESET_PASSWORD' && (!newPasswordValue || newPasswordValue.trim().length === 0)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50 ${userActionDialog.type === 'DELETE_USER' || userActionDialog.type === 'REVOKE_PREMIUM' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    បញ្ជាក់
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Telegram Sending Modal Dialog */}
      <AnimatePresence>
        {sendingQuiz && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md border border-slate-100 relative space-y-5"
            >
              {/* Header */}
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">ផ្ញើសំណួរទៅកាន់ Telegram</h4>
                  <p className="text-[10px] text-slate-400 font-medium">បង្ហោះសំណួរទៅឆានែល ឬគ្រុប Telegram ភ្លាមៗ</p>
                </div>
                <button 
                  onClick={() => setSendingQuiz(null)}
                  className="ml-auto p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Question Summary */}
              <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-blue-600">សំណួរ៖</span>
                <p className="text-xs font-bold text-slate-700 line-clamp-2 leading-relaxed">{sendingQuiz.question}</p>
              </div>

              {/* Form Field: Chat ID */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Telegram Chat ID (ID គ្រុប ឬឆានែល)</label>
                <input 
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="ឧទាហរណ៍៖ -100123456789 ឬ @channelname"
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all font-semibold text-slate-800 placeholder-slate-400"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {[
                    { label: "Web QCM Q & A", val: "@web_qcm_q_and_a" },
                    { label: "Naret26", val: "@Naret26" },
                    { label: "TheAdvisor26", val: "@theAdvisor26" },
                    { label: "Family of Law", val: "@familyoflaw" },
                    { label: "Khmer Family of Law", val: "@khmerfamilyoflaw" },
                    { label: "User (700259660)", val: "700259660" }
                  ].map(t => (
                    <button 
                      key={t.val}
                      type="button"
                      onClick={() => setTelegramChatId(t.val)}
                      className="px-2 py-1 text-[10px] font-extrabold bg-slate-50 border border-slate-100 rounded-lg hover:bg-blue-50 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Field: Format Selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">ជ្រើសរើសទម្រង់ផ្ញើ (Sending Format)</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTelegramFormat('POLL')}
                    disabled={sendingQuizType !== 'mcq'}
                    className={`py-2 px-1 text-[11px] font-extrabold rounded-xl border transition-all flex flex-col items-center justify-center gap-1.5 ${
                      telegramFormat === 'POLL' 
                        ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-sm' 
                        : sendingQuizType !== 'mcq'
                          ? 'bg-slate-50 border-slate-150 text-slate-300 cursor-not-allowed opacity-50'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-sm">🗳️</span>
                    <span>ទម្រង់ Poll</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTelegramFormat('TEXT')}
                    className={`py-2 px-1 text-[11px] font-extrabold rounded-xl border transition-all flex flex-col items-center justify-center gap-1.5 ${
                      telegramFormat === 'TEXT' 
                        ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-sm' 
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-sm">📝</span>
                    <span>ទម្រង់ Text</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTelegramFormat('IMAGE')}
                    className={`py-2 px-1 text-[11px] font-extrabold rounded-xl border transition-all flex flex-col items-center justify-center gap-1.5 ${
                      telegramFormat === 'IMAGE' 
                        ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-sm' 
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-sm">🖼️</span>
                    <span>ទម្រង់ Image</span>
                  </button>
                </div>
                {sendingQuizType !== 'mcq' && (
                  <p className="text-[9px] text-amber-600 font-medium leading-relaxed">
                    * សំណួរប្រភេទចម្លើយខ្លី (Q&A) មិនអាចផ្ញើជាទម្រង់ Poll បានទេ។
                  </p>
                )}
              </div>

              {/* Progress / Error Reporting */}
              {telegramProgress && (
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100/50 animate-pulse">
                  <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
                  <span>{telegramProgress}</span>
                </div>
              )}
              {telegramError && (
                <div className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-150 leading-relaxed">
                  {telegramError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSendingQuiz(null)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition-all"
                >
                  បោះបង់
                </button>
                <button
                  type="button"
                  onClick={handleSendTelegramQuiz}
                  disabled={isSendingTelegram || !telegramChatId}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/10 transition-all flex items-center justify-center gap-1.5"
                >
                  {isSendingTelegram ? 'កំពុងផ្ញើ...' : 'ផ្ញើទៅ Telegram'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

