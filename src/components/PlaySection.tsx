import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Shuffle,
  Layers,
  Search,
  Eye,
  Play,
  HelpCircle,
  Download,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Question, Subject, UserSession } from '../types';
import { toKhmerNum, khmerAlphabetSort, shuffleArray, getOptionLabel } from '../utils/khmer';
import { exportQuestionsToPDF } from '../services/pdfExport';
import { KhmerCornerMotif, KhmerLotusCrest, KhmerLotusDivider } from './KhmerOrnaments';

interface PlaySectionProps {
  questions: Question[];
  subjects: Subject[];
  session: UserSession;
  onStartQuiz: (quizQuestions: Question[], title: string) => void;
}

export const PlaySection: React.FC<PlaySectionProps> = ({
  questions,
  subjects,
  session,
  onStartQuiz,
}) => {
  const [activeTab, setActiveTab] = useState<'subject' | 'mixed' | 'dictionary'>('subject');

  // Filter for subject view
  const [typeFilter, setTypeFilter] = useState<'all' | 'mcq' | 'short' | 'explanation'>('all');

  // Part selection modal
  const [selectedSubjectForParts, setSelectedSubjectForParts] = useState<Subject | null>(null);

  // View Paper modal
  const [viewingSubject, setViewingSubject] = useState<Subject | null>(null);
  const [paperPdfCountLimit, setPaperPdfCountLimit] = useState<number | 'all'>('all');
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  // Mixed mode state
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [mixedCount, setMixedCount] = useState<number>(10);

  // Dictionary search
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedWords, setExpandedWords] = useState<Record<string, boolean>>({});

  // Filter active subjects
  const activeSubjects = useMemo(() => {
    return subjects.filter((s) => s.isActive !== false);
  }, [subjects]);

  // Map questions by subject name
  const questionsBySubject = useMemo(() => {
    const map: Record<string, Question[]> = {};
    for (const q of questions) {
      if (q.isActive === false) continue;
      if (!map[q.subject]) {
        map[q.subject] = [];
      }
      map[q.subject].push(q);
    }
    return map;
  }, [questions]);

  // Dictionary words (Type === 'explanation')
  const dictionaryWords = useMemo(() => {
    const list = questions.filter((q) => q.type === 'explanation');
    const sorted = [...list].sort((a, b) => khmerAlphabetSort(a.question, b.question));
    if (!searchTerm.trim()) return sorted;
    const term = searchTerm.toLowerCase();
    return sorted.filter(
      (item) =>
        item.question.toLowerCase().includes(term) ||
        (item.answer && item.answer.toLowerCase().includes(term))
    );
  }, [questions, searchTerm]);

  const toggleWordExpand = (id: string) => {
    setExpandedWords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenPartsModal = (subject: Subject) => {
    setSelectedSubjectForParts(subject);
  };

  const handleStartPart = (subject: Subject, partIndex: number) => {
    const allSubjectQuestions = questionsBySubject[subject.name] || [];
    const startIndex = partIndex * 10;
    const partQuestions = allSubjectQuestions.slice(startIndex, startIndex + 10);
    if (partQuestions.length === 0) return;

    setSelectedSubjectForParts(null);
    onStartQuiz(partQuestions, `${subject.name} (ភាគ ${toKhmerNum(partIndex + 1)})`);
  };

  const handleToggleSubjectSelect = (id: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllSubjects = () => {
    setSelectedSubjectIds(activeSubjects.map((s) => s.id));
  };

  const handleClearAllSubjects = () => {
    setSelectedSubjectIds([]);
  };

  const handleStartMixedQuiz = () => {
    const validSubjectNames = activeSubjects
      .filter((s) => selectedSubjectIds.includes(s.id))
      .map((s) => s.name);

    let pool: Question[] = [];
    if (validSubjectNames.length === 0) {
      pool = questions.filter((q) => q.isActive !== false);
    } else {
      pool = questions.filter((q) => q.isActive !== false && validSubjectNames.includes(q.subject));
    }

    if (pool.length === 0) return;

    const shuffled = shuffleArray(pool);
    const selected = shuffled.slice(0, Math.min(mixedCount, shuffled.length));
    onStartQuiz(selected, `វិញ្ញាសាចម្រុះ (${toKhmerNum(selected.length)} សំណួរ)`);
  };

  const handleDownloadPDF = async () => {
    if (!viewingSubject) return;
    const allSubjectQuestions = questionsBySubject[viewingSubject.name] || [];
    if (allSubjectQuestions.length === 0) return;

    const targetQuestions =
      paperPdfCountLimit === 'all'
        ? allSubjectQuestions
        : allSubjectQuestions.slice(0, Math.min(Math.max(1, paperPdfCountLimit), allSubjectQuestions.length));

    setIsDownloadingPDF(true);
    try {
      let savedSettings;
      try {
        const raw = localStorage.getItem('master_quiz_pdf_settings_v1');
        if (raw) savedSettings = JSON.parse(raw);
      } catch {
        // Ignore
      }
      await exportQuestionsToPDF({
        subjectTitle: viewingSubject.name,
        questions: targetQuestions,
        template: savedSettings?.template || 'royal',
        answerMode: 'both',
        includeAnswerKey: true,
        settings: savedSettings,
        filename: `${viewingSubject.name}_Master_Quiz.pdf`,
      });
    } catch (err) {
      console.error('Error downloading PDF:', err);
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Khmer Cultural Hero Banner */}
      <div className="relative khmer-ornate-card rounded-2xl p-7 sm:p-9 mb-8">
        <KhmerCornerMotif position="tl" size={34} />
        <KhmerCornerMotif position="tr" size={34} />
        <KhmerCornerMotif position="bl" size={34} />
        <KhmerCornerMotif position="br" size={34} />

        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2.5 mb-1">
              <KhmerLotusCrest size={38} />
              <p className="text-xs sm:text-sm font-bold khmer-gold-text">
                ប្រព័ន្ធត្រៀមប្រឡងក្របខ័ណ្ឌរដ្ឋ
              </p>
            </div>
            <h1 className="leading-[69px] font-moul text-xl sm:text-3xl app-text-primary mb-2">
              កម្មវិធីត្រៀមប្រឡងក្របខ័ណ្ឌ
            </h1>
            <p className="app-text-secondary text-sm sm:text-base max-w-xl font-kantumruy leading-relaxed">
              ជ្រើសរើសមុខវិជ្ជាដើម្បីហ្វឹកហាត់តាមភាគ (១ភាគ = ១០សំណួរ) ឬសាកល្បងសមត្ថភាពជាមួយការប្រឡងចម្រុះគ្រប់មុខវិជ្ជា។
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
            <div className="text-center px-5 py-3 rounded-xl khmer-frame-card min-w-[112px]">
              <span className="block text-xl sm:text-2xl font-bold khmer-accent-text font-moul tabular-nums">
                {toKhmerNum(questions.length)}
              </span>
              <span className="text-xs app-text-secondary font-semibold">សំណួរសរុប</span>
            </div>

            <div className="text-center px-5 py-3 rounded-xl khmer-frame-card min-w-[112px]">
              <span className="block text-xl sm:text-2xl font-bold khmer-gold-text font-moul tabular-nums">
                {toKhmerNum(activeSubjects.length)}
              </span>
              <span className="text-xs app-text-secondary font-semibold">មុខវិជ្ជា</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Mode Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 mb-8 app-subcard p-1.5 rounded-2xl max-w-xl mx-auto">
        <button
          type="button"
          onClick={() => setActiveTab('subject')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'subject'
              ? 'khmer-btn-primary shadow-sm'
              : 'app-text-secondary hover:opacity-80'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>តាមមុខវិជ្ជា</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('mixed')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'mixed'
              ? 'khmer-btn-primary shadow-sm'
              : 'app-text-secondary hover:opacity-80'
          }`}
        >
          <Shuffle className="w-4 h-4" />
          <span>តេស្តចម្រុះ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dictionary')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'dictionary'
              ? 'khmer-btn-primary shadow-sm'
              : 'app-text-secondary hover:opacity-80'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>ពន្យល់ពាក្យ</span>
        </button>
      </div>

      {/* TAB 1: BY SUBJECT */}
      {activeTab === 'subject' && (
        <div className="space-y-6">
          {/* Sub-filters for question types */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <span className="text-sm font-semibold app-text-secondary mr-1 shrink-0">ប្រភេទ៖</span>
            {[
              { id: 'all', label: 'ទាំងអស់' },
              { id: 'mcq', label: 'QCM (ពហុជម្រើស)' },
              { id: 'short', label: 'Q & A (សំណួរ-ចម្លើយ)' },
              { id: 'explanation', label: 'ពន្យល់ពាក្យ' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTypeFilter(f.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap cursor-pointer ${
                  typeFilter === f.id
                    ? 'khmer-btn-primary shadow-sm'
                    : 'app-card app-text-secondary hover:opacity-85'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Subjects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeSubjects
              .filter((sub) => typeFilter === 'all' || sub.type === typeFilter)
              .map((sub) => {
                const count = (questionsBySubject[sub.name] || []).length;
                const partsCount = Math.ceil(count / 10);

                return (
                  <div
                    key={sub.id}
                    className="khmer-frame-card rounded-2xl p-6 flex flex-col justify-between transition hover:border-[var(--theme-gold)]"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold mb-2.5">
                        <span className="khmer-accent-text">
                          {sub.type === 'mcq'
                            ? 'QCM · ពហុជ្រើសរើស'
                            : sub.type === 'short'
                            ? 'Q & A · សំណួរ-ចម្លើយ'
                            : 'ពន្យល់ពាក្យ'}
                        </span>
                        <span className="app-text-secondary tabular-nums">
                          {toKhmerNum(count)} សំណួរ
                        </span>
                      </div>

                      <h3 className="font-moul text-base sm:text-lg app-text-primary mb-2 leading-relaxed">
                        {sub.name}
                      </h3>

                      <p className="text-sm app-text-secondary mb-6 font-kantumruy">
                        បែងចែកជា {toKhmerNum(partsCount || 1)} ភាគ (១ភាគ = ១០សំណួរ)
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-4 border-t app-border">
                      <button
                        type="button"
                        onClick={() => handleOpenPartsModal(sub)}
                        disabled={count === 0}
                        className="flex-1 py-2.5 px-4 rounded-xl khmer-btn-primary font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>ចូលធ្វើតេស្ត</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setViewingSubject(sub)}
                        disabled={count === 0}
                        title="មើលវិញ្ញាសាទាំងមូល"
                        className="p-2.5 rounded-xl app-subcard app-text-primary hover:opacity-80 transition disabled:opacity-50 cursor-pointer"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {activeSubjects.filter((sub) => typeFilter === 'all' || sub.type === typeFilter).length === 0 && (
            <div className="py-16 px-6 text-center rounded-2xl khmer-frame-card">
              <KhmerLotusDivider width={180} className="mx-auto mb-3" />
              <BookOpen className="w-12 h-12 app-text-muted mx-auto mb-3" />
              <h4 className="font-moul text-base app-text-primary mb-2">
                មិនទាន់មានមុខវិជ្ជា ឬវិញ្ញាសាក្នុងប្រព័ន្ធនៅឡើយទេ
              </h4>
              <p className="text-sm app-text-secondary max-w-md mx-auto">
                អ្នកគ្រប់គ្រង (Admin) អាចចូលទៅកាន់ផ្ទាំង «គ្រប់គ្រង» ដើម្បីបន្ថែមមុខវិជ្ជា និងបញ្ចូលវិញ្ញាសាថ្មីៗ។
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MIXED MODE */}
      {activeTab === 'mixed' && (
        <div className="relative khmer-ornate-card rounded-2xl p-7 sm:p-9 max-w-3xl mx-auto">
          <KhmerCornerMotif position="tl" size={30} />
          <KhmerCornerMotif position="tr" size={30} />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl khmer-btn-primary flex items-center justify-center shrink-0">
              <Shuffle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-moul text-lg sm:text-xl app-text-primary">
                ការធ្វើតេស្តចម្រុះមុខវិជ្ជា
              </h2>
              <p className="text-sm app-text-secondary">
                ជ្រើសរើសមុខវិជ្ជាចូលគ្នាដើម្បីបង្កើតវិញ្ញាសាចៃដន្យដូចការប្រឡងពិតប្រាកដ
              </p>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold app-text-primary">
                ជ្រើសរើសមុខវិជ្ជា៖
              </label>
              <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
                <button
                  type="button"
                  onClick={handleSelectAllSubjects}
                  className="khmer-accent-text hover:underline cursor-pointer"
                >
                  ជ្រើសរើសទាំងអស់
                </button>
                <span className="app-text-muted">·</span>
                <button
                  type="button"
                  onClick={handleClearAllSubjects}
                  className="text-red-600 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  ដកចេញទាំងអស់
                </button>
              </div>
            </div>

            {activeSubjects.length === 0 ? (
              <div className="p-6 text-center text-sm app-text-secondary app-subcard rounded-xl">
                មិនទាន់មានមុខវិជ្ជាសម្រាប់ជ្រើសរើសនៅឡើយទេ។
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                {activeSubjects.map((sub) => {
                  const isSelected = selectedSubjectIds.includes(sub.id);
                  const count = (questionsBySubject[sub.name] || []).length;

                  return (
                    <div
                      key={sub.id}
                      onClick={() => handleToggleSubjectSelect(sub.id)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
                        isSelected
                          ? 'khmer-soft-surface border-[var(--theme-accent)] font-semibold'
                          : 'app-subcard hover:opacity-90'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 rounded accent-[var(--theme-accent)] focus:ring-0"
                        />
                        <span className="text-sm font-semibold">{sub.name}</span>
                      </div>
                      <span className="text-xs app-text-secondary font-mono tabular-nums">
                        ({toKhmerNum(count)})
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mb-8">
            <label className="block text-sm font-bold app-text-primary mb-3">
              ចំនួនសំណួរចៃដន្យ៖
            </label>
            <div className="grid grid-cols-5 gap-2 sm:gap-3">
              {[10, 20, 30, 50, 100].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setMixedCount(num)}
                  className={`py-2.5 rounded-xl text-sm font-bold transition flex flex-col items-center justify-center cursor-pointer ${
                    mixedCount === num
                      ? 'khmer-btn-primary shadow-sm'
                      : 'app-subcard app-text-primary hover:opacity-85'
                  }`}
                >
                  <span className="font-moul">{toKhmerNum(num)}</span>
                  <span className="text-xs font-normal">សំណួរ</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartMixedQuiz}
            className="w-full py-3.5 rounded-xl khmer-btn-primary font-bold text-sm sm:text-base shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Shuffle className="w-5 h-5" />
            <span>ចាប់ផ្ដើមតេស្តចម្រុះ ({toKhmerNum(mixedCount)} សំណួរ)</span>
          </button>
        </div>
      )}

      {/* TAB 3: DICTIONARY / EXPLANATION */}
      {activeTab === 'dictionary' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 app-text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ស្វែងរកពាក្យគន្លឹះ ឬអត្ថន័យច្បាប់/រដ្ឋបាល..."
              className="w-full pl-12 pr-10 py-3.5 rounded-2xl app-input text-sm sm:text-base shadow-sm transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 app-text-muted hover:opacity-75 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Results Info */}
          <div className="flex items-center justify-between text-sm app-text-secondary px-1 font-medium">
            <span>
              រកឃើញចំនួន <strong className="khmer-accent-text font-bold tabular-nums">{toKhmerNum(dictionaryWords.length)}</strong> ពាក្យ
            </span>
            <span>រៀបតាមលំដាប់អក្ខរក្រមខ្មែរ</span>
          </div>

          {/* Dictionary Accordion List */}
          <div className="space-y-3">
            {dictionaryWords.length === 0 ? (
              <div className="text-center py-12 khmer-frame-card rounded-2xl">
                <HelpCircle className="w-10 h-10 mx-auto app-text-muted mb-2" />
                <p className="app-text-secondary text-sm sm:text-base">មិនមានពាក្យដែលអ្នកស្វែងរកទេ!</p>
              </div>
            ) : (
              dictionaryWords.map((item, index) => {
                const id = item.id || `dict-${index}`;
                const isExpanded = expandedWords[id] ?? false;

                return (
                  <div
                    key={id}
                    className="rounded-2xl khmer-frame-card overflow-hidden transition"
                  >
                    <button
                      type="button"
                      onClick={() => toggleWordExpand(id)}
                      className="w-full px-5 py-4 flex items-center justify-between text-left hover:opacity-90 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5">
                        <span className="w-8 h-8 rounded-lg app-subcard font-moul text-xs khmer-gold-text flex items-center justify-center shrink-0 tabular-nums">
                          {toKhmerNum(index + 1)}
                        </span>
                        <span className="font-moul text-sm sm:text-base app-text-primary">
                          {item.question}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs sm:text-sm font-semibold app-text-secondary hidden sm:inline">
                          {isExpanded ? 'បិទ' : 'មើលការពន្យល់'}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 khmer-accent-text" />
                        ) : (
                          <ChevronDown className="w-5 h-5 app-text-muted" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 border-t app-border">
                        <div className="p-4 rounded-xl app-answer-box font-siemreap text-base leading-loose whitespace-pre-line">
                          {item.answer || 'មិនទាន់មានការបកស្រាយលម្អិត។'}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL: SELECT PART (១ភាគ = ១០សំណួរ) */}
      {selectedSubjectForParts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="khmer-ornate-card w-full max-w-lg rounded-2xl p-6 sm:p-8 shadow-2xl relative">
            <KhmerCornerMotif position="tl" size={28} />
            <button
              type="button"
              onClick={() => setSelectedSubjectForParts(null)}
              className="absolute top-4 right-4 app-text-muted hover:opacity-75 p-1.5 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6 mt-1">
              <span className="text-xs khmer-gold-text font-bold">
                ជ្រើសរើសភាគដើម្បីចាប់ផ្ដើម
              </span>
              <h3 className="font-moul text-lg sm:text-xl app-text-primary mt-1">
                {selectedSubjectForParts.name}
              </h3>
              <p className="text-sm app-text-secondary mt-1">
                សរុប {toKhmerNum((questionsBySubject[selectedSubjectForParts.name] || []).length)} សំណួរ (១ភាគ = ១០សំណួរ)
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
              {Array.from({
                length: Math.ceil(
                  (questionsBySubject[selectedSubjectForParts.name] || []).length / 10
                ),
              }).map((_, idx) => {
                const countInPart = Math.min(
                  10,
                  (questionsBySubject[selectedSubjectForParts.name] || []).length - idx * 10
                );

                return (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => handleStartPart(selectedSubjectForParts, idx)}
                    className="p-4 rounded-xl app-subcard hover:bg-[var(--theme-accent)] hover:text-white hover:border-[var(--theme-accent)] flex flex-col items-center justify-center transition group shadow-sm cursor-pointer"
                  >
                    <span className="font-moul text-sm">
                      ភាគ {toKhmerNum(idx + 1)}
                    </span>
                    <span className="text-xs opacity-80 mt-1 tabular-nums">
                      {toKhmerNum(idx * 10 + 1)} - {toKhmerNum(idx * 10 + countInPart)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW FULL PAPER */}
      {viewingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="khmer-ornate-card w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl relative overflow-hidden">
            <div className="p-5 sm:p-6 border-b app-border flex items-center justify-between app-subcard">
              <div>
                <span className="text-xs font-bold khmer-gold-text">
                  កម្រងវិញ្ញាសាពេញលេញ
                </span>
                <h3 className="font-moul text-base sm:text-xl app-text-primary mt-0.5">
                  {viewingSubject.name}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {session.role === 'admin' && (() => {
                  const totalAvail = (questionsBySubject[viewingSubject.name] || []).length;
                  const resolvedLimit =
                    paperPdfCountLimit === 'all'
                      ? totalAvail
                      : Math.min(Math.max(1, paperPdfCountLimit), totalAvail);
                  return (
                    <>
                      <div className="flex items-center gap-1.5 app-card px-2.5 py-1.5 rounded-xl border text-xs">
                        <span className="app-text-secondary font-medium whitespace-nowrap">
                          ចំនួន៖
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={Math.max(1, totalAvail)}
                          disabled={isDownloadingPDF || totalAvail === 0}
                          placeholder={String(totalAvail)}
                          value={paperPdfCountLimit === 'all' ? '' : paperPdfCountLimit}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (!raw) {
                              setPaperPdfCountLimit('all');
                              return;
                            }
                            const n = Math.max(1, parseInt(raw, 10) || 1);
                            setPaperPdfCountLimit(n >= totalAvail ? 'all' : n);
                          }}
                          className="w-14 bg-transparent font-bold app-text-primary text-center focus:outline-none tabular-nums"
                          title="កំណត់ចំនួនសំណួរសម្រាប់ទាញយក PDF"
                        />
                        <span className="app-text-muted tabular-nums">
                          / {toKhmerNum(totalAvail)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleDownloadPDF}
                        disabled={isDownloadingPDF || totalAvail === 0}
                        className="px-4 py-2 rounded-xl khmer-btn-crimson text-xs sm:text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>
                          {isDownloadingPDF
                            ? 'កំពុងបង្កើត PDF...'
                            : `ទាញយក PDF (${toKhmerNum(resolvedLimit)})`}
                        </span>
                      </button>
                    </>
                  );
                })()}
                <button
                  type="button"
                  onClick={() => {
                    setViewingSubject(null);
                    setPaperPdfCountLimit('all');
                  }}
                  className="p-2 rounded-xl app-text-muted hover:opacity-75 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-5" id="printable-paper-content">
              <div className="text-center pb-5 border-b app-border">
                <KhmerLotusCrest size={48} className="mx-auto mb-1" />
                <p className="font-moul text-sm sm:text-base khmer-gold-text">
                  ព្រះរាជាណាចក្រកម្ពុជា
                </p>
                <p className="font-siemreap text-xs sm:text-sm app-text-secondary font-semibold mt-0.5">
                  ជាតិ · សាសនា · ព្រះមហាក្សត្រ
                </p>
                <KhmerLotusDivider width={210} className="mx-auto my-2" />
                <h2 className="font-moul text-base sm:text-lg app-text-primary mt-1">
                  វិញ្ញាសា៖ {viewingSubject.name}
                </h2>
              </div>

              {(questionsBySubject[viewingSubject.name] || []).map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="p-4 sm:p-5 rounded-xl app-subcard"
                >
                  <div className="flex items-start gap-2.5 mb-2">
                    <span className="font-moul khmer-gold-text text-sm mt-0.5 tabular-nums">
                      {toKhmerNum(idx + 1)}.
                    </span>
                    <p className="font-kantumruy font-semibold text-base app-text-primary leading-relaxed">
                      {q.question}
                    </p>
                  </div>

                  {q.type === 'mcq' && q.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3 pl-6">
                      {q.options.map((opt, oIdx) => {
                        const isCorrect = oIdx === q.correct;
                        return (
                          <div
                            key={oIdx}
                            className={`p-3 rounded-xl text-sm font-medium border ${
                              isCorrect
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border-emerald-500'
                                : 'app-card app-text-primary'
                            }`}
                          >
                            <span className="font-bold mr-1.5">
                              {getOptionLabel(oIdx, q.subject)}.
                            </span>
                            <span>{opt.replace(/^[ក-ឃA-D]\.\s*/, '')}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {(q.type === 'short' || q.type === 'explanation') && q.answer && (
                    <div className="mt-3 pl-6">
                      <div className="p-3.5 rounded-xl app-answer-box text-sm sm:text-base font-siemreap leading-relaxed whitespace-pre-line">
                        {q.answer}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
