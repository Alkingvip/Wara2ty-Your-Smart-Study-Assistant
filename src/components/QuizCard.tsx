import React, { useState } from 'react';
import { QuizQuestion } from '../types';
import {
  CheckCircle2,
  XCircle,
  Award,
  RotateCcw,
  HelpCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Send,
  RefreshCw,
  AlertCircle,
  BookOpen,
} from 'lucide-react';

interface QuizCardProps {
  questions: QuizQuestion[];
  lectureText?: string;
  lectureTitle?: string;
  summary?: any;
  onQuestionsUpdated?: (newQuestions: QuizQuestion[]) => void;
}

export const QuizCard: React.FC<QuizCardProps> = ({
  questions = [],
  lectureText = '',
  lectureTitle = '',
  summary = null,
  onQuestionsUpdated,
}) => {
  // Current active question index (0 to 4)
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  // Store user answers: question.id -> selected option index (0..3)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  // Whether the quiz has been submitted
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  // Filter for review after submission
  const [reviewFilter, setReviewFilter] = useState<'all' | 'correct' | 'incorrect'>('all');
  // AI regeneration state
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex];

  // Calculate answered count
  const answeredCount = Object.keys(selectedAnswers).length;

  // Handle option selection
  const handleSelectOption = (optionIndex: number) => {
    if (isSubmitted || !currentQuestion) return;

    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionIndex,
    }));
  };

  // Navigation handlers
  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Submit Quiz
  const handleSubmitQuiz = () => {
    setIsSubmitted(true);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  // Restart Quiz
  const handleRestartQuiz = () => {
    setSelectedAnswers({});
    setIsSubmitted(false);
    setCurrentIndex(0);
    setReviewFilter('all');
  };

  // Generate 5 fresh questions using real AI integration with multi-model fallback & auto-retry
  const handleRegenerateQuestions = async () => {
    setIsRegenerating(true);
    setApiError(null);

    const maxAttempts = 3;
    try {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const response = await fetch('/api/generate-quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lectureText,
            lectureTitle,
            summary,
          }),
        });

        const rawText = await response.text();
        let resData: any;
        try {
          resData = JSON.parse(rawText);
        } catch {
          if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, 1200 * attempt));
            continue;
          }
          throw new Error('الخادم يشهد ضغطاً مؤقتاً حالياً (503). يرجى الضغط على "إعادة المحاولة".');
        }

        if (!response.ok || !resData.success || !Array.isArray(resData.questions)) {
          const errStr = String(resData.error || '');
          const is503 =
            response.status === 503 ||
            response.status === 429 ||
            errStr.toLowerCase().includes('503') ||
            errStr.toLowerCase().includes('high demand') ||
            errStr.toLowerCase().includes('unavailable');

          if (attempt < maxAttempts && is503) {
            await new Promise((r) => setTimeout(r, 1200 * attempt));
            continue;
          }

          if (is503 || errStr.trim().startsWith('{')) {
            throw new Error(
              'خوادم الذكاء الاصطناعي تشهد ذروة طلبات مؤقتة حالياً (503). يرجى الضغط على "إعادة المحاولة" لتوليد الأسئلة فوراً.'
            );
          }
          throw new Error(errStr || 'فشل في توليد أسئلة جديدة من المحاضرة.');
        }

        if (onQuestionsUpdated) {
          onQuestionsUpdated(resData.questions);
        }
        setSelectedAnswers({});
        setIsSubmitted(false);
        setCurrentIndex(0);
        setReviewFilter('all');
        return;
      }
    } catch (err: any) {
      console.error('Error generating fresh quiz:', err);
      const raw = String(err?.message || '');
      setApiError(
        raw.trim().startsWith('{') || raw.toLowerCase().includes('high demand')
          ? 'خوادم الذكاء الاصطناعي تشهد ذروة طلبات مؤقتة حالياً (503). يرجى الضغط على "إعادة المحاولة".'
          : raw || 'تعذر توليد أسئلة جديدة حالياً. يرجى المحاولة مرة أخرى.'
      );
    } finally {
      setIsRegenerating(false);
    }
  };

  // Calculate final score
  const correctCount = questions.reduce((acc, q) => {
    return selectedAnswers[q.id] === q.correctIndex ? acc + 1 : acc;
  }, 0);
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // Review questions filtering
  const filteredReviewQuestions = questions.filter((q) => {
    const isCorrect = selectedAnswers[q.id] === q.correctIndex;
    if (reviewFilter === 'correct') return isCorrect;
    if (reviewFilter === 'incorrect') return !isCorrect;
    return true;
  });

  // If no questions are loaded yet
  if (!questions || questions.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-5 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
          <HelpCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-900">لم يتم العثور على أسئلة جاهزة</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            يمكنك إنشاء اختبار مكون من 5 أسئلة اختيار من متعدد بالذكاء الاصطناعي بناءً على محتوى محاضرتك الآن.
          </p>
        </div>
        <button
          onClick={handleRegenerateQuestions}
          disabled={isRegenerating}
          className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition shadow-md flex items-center gap-2 mx-auto cursor-pointer whitespace-nowrap"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isRegenerating ? 'جاري صياغة الأسئلة...' : 'توليد 5 أسئلة الآن'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* API Error Alert */}
      {apiError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <p>{apiError}</p>
          </div>
          <button
            onClick={handleRegenerateQuestions}
            disabled={isRegenerating}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition whitespace-nowrap cursor-pointer"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* QUIZ HEADER */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 text-right w-full sm:w-auto">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-black">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">اختبر نفسك</h3>
              <span className="text-xs font-medium text-emerald-400">
                · 5 أسئلة اختيار من متعدد
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              أسئلة مبنية حصراً على المحتوى الفعلي للمحاضرة المرفوعة لقياس استيعابك
            </p>
          </div>
        </div>

        {/* Top actions & score indicator */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0">
          {isSubmitted ? (
            <div className="flex items-center gap-3">
              <div className="text-right tabular-nums">
                <span className="text-[11px] text-slate-400 block">النتيجة النهائية</span>
                <span className="text-lg font-black text-emerald-400">
                  {correctCount} / {totalQuestions} ({percentage}%)
                </span>
              </div>
              <button
                onClick={handleRestartQuiz}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة الاختبار</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-300 tabular-nums">
                تمت الإجابة: <strong className="text-emerald-400">{answeredCount}</strong> من {totalQuestions}
              </span>
              <button
                onClick={handleRegenerateQuestions}
                disabled={isRegenerating}
                title="توليد 5 أسئلة جديدة من المحاضرة"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition cursor-pointer whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">أسئلة جديدة</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODE 1: ACTIVE QUIZ TAKING (Display one question at a time) */}
      {!isSubmitted && currentQuestion && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-9 shadow-sm space-y-7">
          {/* Progress Indicator Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold tabular-nums">
              <span className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <span>السؤال {currentIndex + 1}</span>
                <span className="text-slate-400 font-normal">من أصل {totalQuestions}</span>
              </span>
              <span>{Math.round(((currentIndex + 1) / totalQuestions) * 100)}% من الاختبار</span>
            </div>

            {/* Progress track */}
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-l from-emerald-500 to-teal-500 rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
              />
            </div>

            {/* Question Quick-Jump Buttons (1 to 5) */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 pt-2">
              {questions.map((q, qIdx) => {
                const isAnswered = selectedAnswers[q.id] !== undefined;
                const isCurrent = qIdx === currentIndex;

                return (
                  <button
                    key={q.id || qIdx}
                    type="button"
                    onClick={() => setCurrentIndex(qIdx)}
                    className={`w-10 h-10 rounded-2xl text-xs font-bold transition-all flex items-center justify-center relative cursor-pointer tabular-nums ${
                      isCurrent
                        ? 'bg-slate-900 text-white shadow-md scale-105 ring-2 ring-emerald-500 ring-offset-2'
                        : isAnswered
                        ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                        : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{qIdx + 1}</span>
                    {isAnswered && !isCurrent && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[8px]">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Question Stem */}
          <div className="pt-2 space-y-2">
            <div className="inline-flex items-center gap-2 text-slate-500 text-xs font-bold tabular-nums">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              <span>سؤال اختيار من متعدد ({currentIndex + 1})</span>
            </div>
            <h4 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
              {currentQuestion.question}
            </h4>
          </div>

          {/* 4 Answer Options */}
          <div className="grid grid-cols-1 gap-3.5 pt-2">
            {currentQuestion.options.map((option, optIdx) => {
              const isSelected = selectedAnswers[currentQuestion.id] === optIdx;
              const optionLetters = ['أ', 'ب', 'ج', 'د'];

              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => handleSelectOption(optIdx)}
                  className={`text-right p-4 sm:p-5 rounded-2xl border-2 transition-all text-sm sm:text-base flex items-center justify-between gap-4 cursor-pointer group ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/70 text-slate-950 font-bold shadow-sm'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3.5 flex-1">
                    <span
                      className={`w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white border border-slate-300 text-slate-700 group-hover:border-slate-400'
                      }`}
                    >
                      {optionLetters[optIdx] || optIdx + 1}
                    </span>
                    <span className="leading-relaxed">{option}</span>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Navigation & Submission Controls */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Prev button */}
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition cursor-pointer w-full sm:w-auto justify-center whitespace-nowrap ${
                currentIndex === 0
                  ? 'text-slate-300 bg-slate-50 border border-slate-200 cursor-not-allowed'
                  : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-sm'
              }`}
            >
              <ArrowRight className="w-4 h-4" />
              <span>السؤال السابق</span>
            </button>

            <span className="text-xs text-slate-400 hidden md:inline">
              يمكنك تغيير إجابتك والتنقل بحرية قبل الضغط على تسليم
            </span>

            {/* Next or Submit Button */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {currentIndex < totalQuestions - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition shadow-md cursor-pointer w-full sm:w-auto justify-center whitespace-nowrap"
                >
                  <span>السؤال التالي</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmitQuiz}
                  className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-sm transition shadow-lg shadow-emerald-500/25 cursor-pointer w-full sm:w-auto justify-center whitespace-nowrap"
                >
                  <Send className="w-4 h-4" />
                  <span>تسليم الإجابات وإنهاء الاختبار</span>
                </button>
              )}

              {currentIndex < totalQuestions - 1 && answeredCount === totalQuestions && (
                <button
                  type="button"
                  onClick={handleSubmitQuiz}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs transition cursor-pointer whitespace-nowrap"
                  title="أجبت على كل الأسئلة! يمكنك التسليم الآن"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>تسليم الآن</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: AFTER SUBMISSION (Score, Breakdown, Explanations, Restart) */}
      {isSubmitted && (
        <div className="space-y-8">
          {/* Final Score Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-9 text-white shadow-xl text-center space-y-6 relative overflow-hidden">
            <div className="relative z-10 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/30">
                <Award className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-emerald-400">
                  نتيجة اختبار المحاضرة
                </span>
                <h4 className="text-2xl sm:text-3xl font-black pt-1">
                  {percentage >= 80
                    ? 'نتيجة ممتازة ومبهرة!'
                    : percentage >= 60
                    ? 'أداء جيد جداً!'
                    : 'تحتاج للمراجعة وإعادة المحاولة'}
                </h4>
                <p className="text-slate-300 text-sm max-w-lg mx-auto tabular-nums">
                  حصلت على <strong className="text-emerald-400 text-lg font-bold">{correctCount}</strong> من أصل{' '}
                  <strong className="text-white text-lg font-bold">{totalQuestions}</strong> أسئلة بنسبة نجاح{' '}
                  <strong className="text-emerald-400 text-lg font-bold">{percentage}%</strong>.
                </p>
              </div>

              {/* Actions: Restart Quiz & Regenerate AI Questions */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleRestartQuiz}
                  className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-md transition cursor-pointer flex items-center gap-2 whitespace-nowrap"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>إعادة الاختبار</span>
                </button>

                <button
                  type="button"
                  onClick={handleRegenerateQuestions}
                  disabled={isRegenerating}
                  className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 transition cursor-pointer flex items-center gap-2 whitespace-nowrap"
                >
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>{isRegenerating ? 'جاري صياغة أسئلة جديدة...' : 'توليد 5 أسئلة جديدة بالذكاء الاصطناعي'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Review Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">تصفية مراجعة الأسئلة:</span>
              <div className="flex items-center gap-1.5 tabular-nums">
                <button
                  type="button"
                  onClick={() => setReviewFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    reviewFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  الكل ({totalQuestions})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter('correct')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    reviewFilter === 'correct'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  الصحيحة ({correctCount})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter('incorrect')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    reviewFilter === 'incorrect'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                  }`}
                >
                  الخاطئة ({totalQuestions - correctCount})
                </button>
              </div>
            </div>

            <span className="text-xs text-slate-400">
              راجع الإجابات الصحيحة والتفسير الأكاديمي المرفق بكل سؤال
            </span>
          </div>

          {/* Detailed Question Review List */}
          <div className="space-y-6">
            {filteredReviewQuestions.map((q, idx) => {
              const studentAnswer = selectedAnswers[q.id];
              const isCorrect = studentAnswer === q.correctIndex;
              const hasAnswered = studentAnswer !== undefined;
              const originalIndex = questions.findIndex((item) => item.id === q.id);

              return (
                <div
                  key={q.id || idx}
                  className={`bg-white rounded-3xl border-2 p-6 sm:p-8 space-y-5 transition-all shadow-sm ${
                    isCorrect
                      ? 'border-emerald-200 bg-white'
                      : 'border-rose-200 bg-white'
                  }`}
                >
                  {/* Review Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 tabular-nums">
                        <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-black flex items-center justify-center">
                          {originalIndex + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          السؤال رقم {originalIndex + 1}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-slate-900 pt-1 leading-relaxed">
                        {q.question}
                      </h4>
                    </div>

                    <div className="shrink-0">
                      {isCorrect ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>إجابة صحيحة</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-rose-700 text-xs font-bold">
                          <XCircle className="w-4 h-4 text-rose-600" />
                          <span>{hasAnswered ? 'إجابة خاطئة' : 'لم يتم الإجابة'}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 4 Choices with highlighted correct and incorrect answers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {q.options.map((option, optIdx) => {
                      const isCorrectChoice = optIdx === q.correctIndex;
                      const isStudentChoice = optIdx === studentAnswer;

                      let style = 'bg-slate-50 border-slate-200 text-slate-600 opacity-60';
                      let statusLabel = null;

                      if (isCorrectChoice) {
                        style = 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold';
                        statusLabel = (
                          <span className="text-[11px] font-bold text-emerald-800 whitespace-nowrap shrink-0">
                            الإجابة الصحيحة ✓
                          </span>
                        );
                      } else if (isStudentChoice && !isCorrectChoice) {
                        style = 'bg-rose-50 border-rose-400 text-rose-950 font-semibold';
                        statusLabel = (
                          <span className="text-[11px] font-bold text-rose-800 whitespace-nowrap shrink-0">
                            إجابتك المختارة ✗
                          </span>
                        );
                      }

                      return (
                        <div
                          key={optIdx}
                          className={`p-4 rounded-2xl border text-sm flex items-start justify-between gap-3 ${style}`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                isCorrectChoice
                                  ? 'bg-emerald-600 text-white'
                                  : isStudentChoice
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-white border border-slate-300 text-slate-700'
                              }`}
                            >
                              {['أ', 'ب', 'ج', 'د'][optIdx] || optIdx + 1}
                            </span>
                            <span className="leading-relaxed">{option}</span>
                          </div>
                          {statusLabel}
                        </div>
                      );
                    })}
                  </div>

                  {/* Arabic Educational Explanation */}
                  <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>التفسير والشرح الأكاديمي:</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                      {q.explanation}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
