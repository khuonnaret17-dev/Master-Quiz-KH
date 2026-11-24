import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Trophy,
  CheckCircle2,
  XCircle,
  Share2,
  Volume2,
  VolumeX,
  Eye,
  Award,
  BookOpen,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Question } from '../types';
import { SocialShareModal } from './SocialShareModal';
import { KhmerCornerMotif, KhmerLotusCrest, KhmerLotusDivider } from './KhmerOrnaments';
import { renderQuestionCardImage } from '../services/telegram';
import {
  renderResultCardImage,
  formatQuestionSocialCaption,
  formatResultSocialCaption,
  ShareImageFormat,
} from '../services/socialShare';
import {
  toKhmerNum,
  getOptionLabel,
  playCorrectSound,
  playWrongSound,
  playClickSound,
  shuffleArray,
} from '../utils/khmer';

interface QuizGameScreenProps {
  questions: Question[];
  title: string;
  isMuted: boolean;
  onToggleMute: () => void;
  onExit: () => void;
  onNextPart?: () => void;
}

export const QuizGameScreen: React.FC<QuizGameScreenProps> = ({
  questions,
  title,
  isMuted,
  onToggleMute,
  onExit,
  onNextPart,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [revealedShortAnswers, setRevealedShortAnswers] = useState<Record<number, boolean>>({});
  const [selfAssessment, setSelfAssessment] = useState<Record<number, boolean>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [shareModalMode, setShareModalMode] = useState<null | 'question' | 'result'>(null);

  const randomizedOptionsRef = useRef<
    Record<number, { options: string[]; correctIndex: number }>
  >({});

  useEffect(() => {
    const map: Record<number, { options: string[]; correctIndex: number }> = {};
    questions.forEach((q, idx) => {
      if (q.type === 'mcq' && q.options && q.options.length > 0) {
        const originalCorrectOption = q.options[q.correct ?? 0];
        const shuffled = shuffleArray(q.options.map((opt) => opt.replace(/^[ក-ឃA-D]\.\s*/, '')));
        const newCorrectIndex = shuffled.findIndex(
          (opt) => opt === originalCorrectOption.replace(/^[ក-ឃA-D]\.\s*/, '')
        );

        map[idx] = {
          options: shuffled,
          correctIndex: newCorrectIndex !== -1 ? newCorrectIndex : 0,
        };
      }
    });
    randomizedOptionsRef.current = map;
  }, [questions]);

  const currentQ = questions[currentIndex];
  const qOptionsData = randomizedOptionsRef.current[currentIndex] || {
    options: currentQ?.options || [],
    correctIndex: currentQ?.correct ?? 0,
  };

  const totalQuestions = questions.length;
  let correctCount = 0;
  questions.forEach((q, idx) => {
    if (q.type === 'mcq') {
      const selected = userAnswers[idx];
      const correctIdx = randomizedOptionsRef.current[idx]?.correctIndex ?? q.correct ?? 0;
      if (selected === correctIdx) correctCount++;
    } else {
      if (selfAssessment[idx]) correctCount++;
    }
  });

  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const handleSelectOption = (optionIndex: number) => {
    if (userAnswers[currentIndex] !== undefined) return;
    playClickSound();

    const isCorrect = optionIndex === qOptionsData.correctIndex;
    if (isCorrect) {
      playCorrectSound();
    } else {
      playWrongSound();
    }

    setUserAnswers((prev) => ({ ...prev, [currentIndex]: optionIndex }));
  };

  const handleMarkSelfAssessment = (correct: boolean) => {
    if (correct) {
      playCorrectSound();
    } else {
      playWrongSound();
    }
    setSelfAssessment((prev) => ({ ...prev, [currentIndex]: correct }));
  };

  const handleFinishQuiz = () => {
    setIsCompleted(true);
    if (percentage >= 50) {
      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Ignore
      }
    }
  };

  const handleRetry = () => {
    setUserAnswers({});
    setRevealedShortAnswers({});
    setSelfAssessment({});
    setCurrentIndex(0);
    setIsCompleted(false);
    setIsReviewMode(false);
  };

  const medalTitle =
    percentage >= 90
      ? 'ឆ្នើមឥតខ្ចោះ — លេខ ១! 🏆'
      : percentage >= 75
      ? 'លទ្ធផលល្អប្រសើរណាស់! 🥇'
      : percentage >= 50
      ? 'ជាប់កម្រិតមធ្យម! 🥈'
      : 'ខំប្រឹងប្រែងបន្ថែមទៀត!';

  const medalClass =
    percentage >= 90
      ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-400 text-amber-900 dark:text-amber-200'
      : percentage >= 75
      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-900 dark:text-emerald-200'
      : percentage >= 50
      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 text-blue-900 dark:text-blue-200'
      : 'app-subcard app-text-primary';

  const resultShareParams = useMemo(
    () => ({
      title,
      correctCount,
      totalQuestions,
      percentage,
      medalTitle,
    }),
    [title, correctCount, totalQuestions, percentage, medalTitle]
  );

  const renderShareImage = useCallback(
    async ({ format, showAnswer }: { format: ShareImageFormat; showAnswer: boolean }) => {
      if (shareModalMode === 'result') {
        return renderResultCardImage({ ...resultShareParams, format });
      }
      const shareQuestionObj: Question =
        currentQ.type === 'mcq'
          ? {
              ...currentQ,
              options: qOptionsData.options,
              correct: qOptionsData.correctIndex,
            }
          : currentQ;
      return renderQuestionCardImage(shareQuestionObj, currentIndex + 1, {
        showAnswer,
        format,
      });
    },
    [shareModalMode, resultShareParams, currentQ, qOptionsData, currentIndex]
  );

  const hasCurrentUserAnswered =
    userAnswers[currentIndex] !== undefined ||
    Boolean(revealedShortAnswers[currentIndex]) ||
    isReviewMode;

  const shareModal = (
    <SocialShareModal
      isOpen={shareModalMode !== null}
      onClose={() => setShareModalMode(null)}
      title={
        shareModalMode === 'result'
          ? `លទ្ធផលតេស្ត — ${title}`
          : `សំណួរទី ${toKhmerNum(currentIndex + 1)} · ${currentQ?.subject || title}`
      }
      initialCaption={
        shareModalMode === 'result'
          ? formatResultSocialCaption(resultShareParams)
          : currentQ
          ? formatQuestionSocialCaption(
              currentQ.type === 'mcq'
                ? { ...currentQ, options: qOptionsData.options, correct: qOptionsData.correctIndex }
                : currentQ,
              currentIndex + 1
            )
          : ''
      }
      filenameBase={
        shareModalMode === 'result'
          ? 'MasterQuiz_Result'
          : `MasterQuiz_Q${currentIndex + 1}`
      }
      renderImage={renderShareImage}
      allowShowAnswerToggle={shareModalMode === 'question'}
      defaultShowAnswer={hasCurrentUserAnswered}
    />
  );

  // Result Summary Screen
  if (isCompleted && !isReviewMode) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="relative khmer-ornate-card rounded-2xl p-7 sm:p-10 text-center">
          <KhmerCornerMotif position="tl" size={34} />
          <KhmerCornerMotif position="tr" size={34} />
          <KhmerCornerMotif position="bl" size={34} />
          <KhmerCornerMotif position="br" size={34} />

          <KhmerLotusCrest size={52} className="mx-auto mb-2" />

          <div className="inline-flex mb-4">
            <div className="w-20 h-20 rounded-full bg-amber-600 text-white ring-4 ring-[var(--theme-gold)]/40 flex items-center justify-center shadow-md">
              <Trophy className="w-10 h-10" />
            </div>
          </div>

          <h2 className="font-moul text-xl sm:text-2xl app-text-primary mb-2">
            លទ្ធផលការធ្វើតេស្ត
          </h2>
          <p className="text-sm app-text-secondary mb-2">{title}</p>
          <KhmerLotusDivider width={200} className="mx-auto mb-5" />

          <div className={`p-5 rounded-2xl border max-w-sm mx-auto mb-8 ${medalClass}`}>
            <p className="font-moul text-base sm:text-lg mb-2">{medalTitle}</p>
            <div className="flex items-baseline justify-center gap-1">
              <span className="font-moul text-4xl sm:text-5xl tabular-nums">
                {toKhmerNum(percentage)}
              </span>
              <span className="text-xl font-bold">%</span>
            </div>
            <p className="text-sm mt-2 font-kantumruy font-medium">
              ឆ្លើយត្រូវ <strong className="tabular-nums">{toKhmerNum(correctCount)}</strong> ក្នុងចំណោម{' '}
              <strong className="tabular-nums">{toKhmerNum(totalQuestions)}</strong> សំណួរ
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
            <button
              type="button"
              onClick={() => setShareModalMode('result')}
              className="sm:col-span-2 py-3 px-4 rounded-xl khmer-btn-crimson font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>ចែករំលែកលទ្ធផល (Facebook / TikTok)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsReviewMode(true)}
              className="py-3 px-4 rounded-xl app-subcard app-text-primary font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-85 transition cursor-pointer"
            >
              <Eye className="w-4 h-4 khmer-accent-text" />
              <span>ពិនិត្យចម្លើយឡើងវិញ</span>
            </button>

            <button
              type="button"
              onClick={handleRetry}
              className="py-3 px-4 rounded-xl khmer-btn-primary font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>ធ្វើតេស្តម្ដងទៀត</span>
            </button>

            {onNextPart && (
              <button
                type="button"
                onClick={onNextPart}
                className="sm:col-span-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>បន្តទៅភាគបន្ទាប់</span>
              </button>
            )}

            <button
              type="button"
              onClick={onExit}
              className="sm:col-span-2 py-2.5 px-4 rounded-xl app-subcard app-text-secondary hover:opacity-80 text-sm font-medium transition cursor-pointer"
            >
              ត្រឡប់ទៅមឺនុយដើម
            </button>
          </div>
        </div>
        {shareModal}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <button
          type="button"
          onClick={onExit}
          className="flex items-center gap-1.5 text-sm font-semibold app-card px-3.5 py-2 rounded-xl hover:opacity-80 transition cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>ចាកចេញ</span>
        </button>

        <div className="text-center truncate px-2">
          <p className="font-moul text-sm sm:text-base app-text-primary truncate">{title}</p>
          {isReviewMode && (
            <span className="text-xs khmer-accent-text font-semibold">
              កំពុងពិនិត្យចម្លើយឡើងវិញ
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleMute}
            title="បិទ/បើកសំឡេង"
            className="p-2 rounded-xl app-card hover:opacity-80 transition cursor-pointer"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-red-600 dark:text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            )}
          </button>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-400 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-bold text-xs sm:text-sm tabular-nums">
            ត្រូវ {toKhmerNum(correctCount)}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full app-subcard rounded-full h-2.5 mb-6 overflow-hidden">
        <div
          className="h-2.5 rounded-full transition-all duration-300"
          style={{
            width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
            backgroundColor: 'var(--theme-accent)',
          }}
        />
      </div>

      {/* Main Question Card */}
      <div className="relative khmer-ornate-card rounded-2xl p-7 sm:p-9">
        <KhmerCornerMotif position="tl" size={30} />
        <KhmerCornerMotif position="tr" size={30} />
        <KhmerCornerMotif position="bl" size={30} />
        <KhmerCornerMotif position="br" size={30} />

        {/* Card Header info */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5 pb-3 border-b app-border">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-moul khmer-accent-text tabular-nums">
              សំណួរទី {toKhmerNum(currentIndex + 1)} / {toKhmerNum(totalQuestions)}
            </span>
            <span className="app-text-muted">·</span>
            <span className="font-semibold app-text-secondary">{currentQ.subject}</span>
          </div>

          <button
            type="button"
            onClick={() => setShareModalMode('question')}
            title="ចែករំលែកឬរក្សាទុកប័ណ្ណសំណួរជារូបភាព"
            className="flex items-center gap-1.5 text-xs font-semibold app-subcard px-3 py-1.5 rounded-xl hover:opacity-80 transition cursor-pointer whitespace-nowrap"
          >
            <Share2 className="w-3.5 h-3.5 khmer-gold-text" />
            <span>ចែករំលែក (FB / TikTok)</span>
          </button>
        </div>

        {/* Question Text */}
        <h2 className="font-kantumruy font-bold text-lg sm:text-xl app-text-primary mb-6 leading-relaxed">
          {currentQ.question}
        </h2>

        {/* MCQ Options */}
        {currentQ.type === 'mcq' && (
          <div className="space-y-3 mb-6">
            {qOptionsData.options.map((option, optIdx) => {
              const selectedIdx = userAnswers[currentIndex];
              const isSelected = selectedIdx === optIdx;
              const isCorrectOpt = optIdx === qOptionsData.correctIndex;
              const hasAnswered = selectedIdx !== undefined;

              let btnStyle = 'app-subcard hover:border-[var(--theme-accent)]';

              if (hasAnswered) {
                if (isCorrectOpt) {
                  btnStyle =
                    'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-600 text-emerald-950 dark:text-emerald-100';
                } else if (isSelected && !isCorrectOpt) {
                  btnStyle =
                    'bg-red-50 dark:bg-red-950/70 border-red-600 text-red-950 dark:text-red-100';
                } else {
                  btnStyle = 'app-subcard opacity-60';
                }
              }

              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => handleSelectOption(optIdx)}
                  disabled={hasAnswered}
                  className={`w-full p-4 rounded-xl border text-left flex items-start gap-3.5 transition cursor-pointer ${btnStyle}`}
                >
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                      hasAnswered && isCorrectOpt
                        ? 'bg-emerald-600 text-white'
                        : hasAnswered && isSelected && !isCorrectOpt
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white'
                    }`}
                  >
                    {getOptionLabel(optIdx, currentQ.subject)}
                  </span>
                  <span className="font-kantumruy text-base leading-relaxed flex-1 break-words font-medium">
                    {option}
                  </span>
                  {hasAnswered && isCorrectOpt && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-1" />
                  )}
                  {hasAnswered && isSelected && !isCorrectOpt && (
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-1" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* MCQ Reference Document / Explanation */}
        {currentQ.type === 'mcq' && currentQ.answer && (userAnswers[currentIndex] !== undefined || isReviewMode) && (
          <div className="mb-6 p-4 sm:p-5 rounded-xl app-answer-box font-siemreap text-sm sm:text-base leading-loose">
            <p className="font-moul text-xs sm:text-sm app-answer-title mb-1.5 flex items-center gap-2">
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>ឯកសារយោង / ការបកស្រាយ៖</span>
            </p>
            <div className="whitespace-pre-line">{currentQ.answer}</div>
          </div>
        )}

        {/* Short & Explanation Type Rendering */}
        {(currentQ.type === 'short' || currentQ.type === 'explanation') && (
          <div className="mb-6 space-y-4">
            {!revealedShortAnswers[currentIndex] ? (
              <button
                type="button"
                onClick={() =>
                  setRevealedShortAnswers((prev) => ({ ...prev, [currentIndex]: true }))
                }
                className="w-full py-3.5 px-4 rounded-xl khmer-btn-primary font-semibold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>ចុចដើម្បីបង្ហាញចម្លើយបកស្រាយ</span>
              </button>
            ) : (
              <div className="p-5 rounded-xl app-answer-box font-siemreap text-base leading-loose">
                <p className="font-moul text-xs sm:text-sm app-answer-title mb-2">
                  ចម្លើយបកស្រាយផ្លូវការ៖
                </p>
                <div className="whitespace-pre-line">{currentQ.answer}</div>

                {selfAssessment[currentIndex] === undefined && (
                  <div className="mt-5 pt-4 border-t app-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-sm font-semibold app-text-primary">
                      វាយតម្លៃការយល់ដឹងរបស់អ្នក៖
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleMarkSelfAssessment(true)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>យល់ច្បាស់ / ត្រូវ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMarkSelfAssessment(false)}
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>រៀនបន្ថែម</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-4 border-t app-border">
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="px-4 py-2.5 rounded-xl app-subcard app-text-primary disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ថយក្រោយ</span>
          </button>

          {currentIndex === totalQuestions - 1 ? (
            <button
              type="button"
              onClick={handleFinishQuiz}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-2 transition cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>បញ្ចប់ការធ្វើតេស្ត</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
              className="px-6 py-2.5 rounded-xl khmer-btn-primary font-bold text-sm flex items-center gap-2 cursor-pointer"
            >
              <span>សំណួរបន្ទាប់</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {shareModal}
    </div>
  );
};
