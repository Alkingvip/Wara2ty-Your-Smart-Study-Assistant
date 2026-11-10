/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './components/HomePage';
import { UploadSection } from './components/UploadSection';
import { AnalysisLoading } from './components/AnalysisLoading';
import { ResultsView } from './components/ResultsView';
import { ActivePage, AnalysisData, AnalysisResponse, QuizQuestion } from './types';
import { getSampleNoteImageData } from './utils/sampleNotes';
import { saveAnalysisSession, loadAnalysisSession } from './utils/storage';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

function isTemporaryOverloadError(msg: string, status?: number): boolean {
  if (status && [429, 502, 503, 504].includes(status)) return true;
  const lower = (msg || '').toLowerCase();
  return (
    lower.includes('503') ||
    lower.includes('429') ||
    lower.includes('high demand') ||
    lower.includes('spikes in demand') ||
    lower.includes('unavailable') ||
    lower.includes('overloaded') ||
    lower.includes('resource_exhausted') ||
    lower.includes('ذروة طلبات') ||
    lower.includes('ضغطاً مؤقتاً') ||
    lower.includes('ازدحاماً')
  );
}

function formatArabicError(rawMsg: string): string {
  const lower = (rawMsg || '').toLowerCase();
  if (
    lower.includes('503') ||
    lower.includes('high demand') ||
    lower.includes('spikes in demand') ||
    lower.includes('unavailable') ||
    lower.includes('overloaded')
  ) {
    return 'خوادم الذكاء الاصطناعي تشهد ذروة طلبات مؤقتة في هذه اللحظة (503). اضغط على "إعادة المحاولة" وسيتم التحليل فوراً عبر المسار السريع البديل.';
  }
  if (lower.includes('429') || lower.includes('resource_exhausted') || lower.includes('quota')) {
    return 'تم الوصول للحد المؤقت للطلبات في الدقيقة (429). يرجى الانتظار بضع ثوانٍ ثم الضغط على "إعادة المحاولة".';
  }
  if (rawMsg.trim().startsWith('{')) {
    return 'حدث ضغط مؤقت أثناء معالجة الطلب في الخادم. يرجى الضغط على "إعادة المحاولة".';
  }
  return rawMsg;
}

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>('home');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedMime, setUploadedMime] = useState<string>('image/jpeg');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [retryNotice, setRetryNotice] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Restore saved session from localStorage on initial load
  useEffect(() => {
    const saved = loadAnalysisSession();
    if (saved && saved.data) {
      setAnalysisResult(saved.data);
      if (saved.image) {
        setUploadedImage(saved.image);
      }
    }
  }, []);

  // Navigate to Upload page from Home CTA
  const handleStartNow = () => {
    setErrorMessage(null);
    setActivePage('upload');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Select a preset sample note
  const handleSelectSample = (sampleId: string) => {
    setErrorMessage(null);
    const dataUrl = getSampleNoteImageData(sampleId);
    if (dataUrl) {
      setUploadedImage(dataUrl);
      setUploadedMime('image/jpeg');
      setActivePage('upload');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Trigger real multimodal Gemini AI analysis via backend API with automatic client-side retry on 503
  const handleAnalyze = async (base64Image: string, mimeType: string) => {
    setIsLoading(true);
    setRetryNotice(null);
    setErrorMessage(null);
    setUploadedImage(base64Image);
    setUploadedMime(mimeType || 'image/jpeg');

    const maxClientAttempts = 3;

    try {
      for (let attempt = 1; attempt <= maxClientAttempts; attempt++) {
        try {
          const response = await fetch('/api/analyze-note', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageBase64: base64Image,
              mimeType: mimeType || 'image/jpeg',
              targetLanguage: 'ar',
            }),
          });

          const rawText = await response.text();
          let result: AnalysisResponse;

          try {
            result = JSON.parse(rawText);
          } catch {
            if (response.status === 413) {
              throw new Error(
                'حجم الصورة المرسلة كبير جداً ويتجاوز سعة الخادم. يرجى اختيار صورة أصغر والمحاولة مجدداً.'
              );
            }
            throw new Error(
              response.status === 503 || response.status === 502 || response.status === 504
                ? '503 UNAVAILABLE'
                : 'تعذر استلام استجابة مكتملة من الخادم بسبب ضغط الشبكة.'
            );
          }

          if (!response.ok || !result.success || !result.data) {
            const errStr = result.error || `HTTP ${response.status}`;
            if (
              attempt < maxClientAttempts &&
              isTemporaryOverloadError(errStr, response.status)
            ) {
              setRetryNotice(
                `الخادم يشهد ذروة طلبات لحظية، جاري إعادة المحاولة تلقائياً عبر المسار السريع (${attempt + 1}/${maxClientAttempts})...`
              );
              await new Promise((r) => setTimeout(r, 1500 * attempt));
              continue;
            }
            throw new Error(formatArabicError(errStr));
          }

          setAnalysisResult(result.data);
          saveAnalysisSession(result.data, base64Image);
          setActivePage('results');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        } catch (innerErr: any) {
          const msg = String(innerErr?.message || innerErr || '');
          if (attempt < maxClientAttempts && isTemporaryOverloadError(msg)) {
            setRetryNotice(
              `الخادم يشهد ذروة طلبات لحظية، جاري إعادة المحاولة تلقائياً عبر المسار السريع (${attempt + 1}/${maxClientAttempts})...`
            );
            await new Promise((r) => setTimeout(r, 1500 * attempt));
            continue;
          }
          throw innerErr;
        }
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
      setErrorMessage(
        formatArabicError(
          err?.message ||
            'حدث خطأ أثناء الاتصال بخادم الذكاء الاصطناعي. يرجى الضغط على "إعادة المحاولة" بعد لحظات.'
        )
      );
    } finally {
      setIsLoading(false);
      setRetryNotice(null);
    }
  };

  const handleUpdateExtractedText = (newText: string) => {
    if (analysisResult) {
      const updated: AnalysisData = {
        ...analysisResult,
        extractedText: newText,
      };
      setAnalysisResult(updated);
      saveAnalysisSession(updated, uploadedImage);
    }
  };

  const handleUpdateQuiz = (newQuiz: QuizQuestion[]) => {
    if (analysisResult) {
      const updated: AnalysisData = {
        ...analysisResult,
        quiz: newQuiz,
      };
      setAnalysisResult(updated);
      saveAnalysisSession(updated, uploadedImage);
    }
  };

  const handleAnalyzeAnother = () => {
    setUploadedImage(null);
    setErrorMessage(null);
    setActivePage('upload');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoHome = () => {
    setErrorMessage(null);
    setActivePage('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activePage={activePage}
        onNavigate={(page) => {
          setErrorMessage(null);
          setActivePage(page);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        hasResults={!!analysisResult}
      />

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="max-w-4xl mx-auto px-4 mt-6 w-full no-print">
          <div className="bg-rose-50 border border-rose-200 text-rose-900 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-rose-700 block">تنبيه من الخادم</span>
                <p className="text-sm font-medium leading-relaxed">{errorMessage}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              {uploadedImage && (
                <button
                  onClick={() => {
                    setErrorMessage(null);
                    handleAnalyze(uploadedImage, uploadedMime);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>إعادة المحاولة</span>
                </button>
              )}
              <button
                onClick={() => setErrorMessage(null)}
                className="p-2 rounded-xl text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                title="إغلاق التنبيه"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {isLoading ? (
          <AnalysisLoading retryNotice={retryNotice} />
        ) : (
          <>
            {activePage === 'home' && (
              <HomePage
                onStartNow={handleStartNow}
                onSelectSample={handleSelectSample}
                hasSavedSession={!!analysisResult}
                savedTitle={analysisResult?.summary?.title}
                onResumeSavedSession={() => {
                  setActivePage('results');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}

            {activePage === 'upload' && (
              <UploadSection
                onAnalyze={handleAnalyze}
                isLoading={isLoading}
                initialImageData={uploadedImage}
              />
            )}

            {activePage === 'results' && analysisResult && (
              <ResultsView
                data={analysisResult}
                originalImage={uploadedImage}
                onAnalyzeAnother={handleAnalyzeAnother}
                onGoHome={handleGoHome}
                onUpdateExtractedText={handleUpdateExtractedText}
                onUpdateQuiz={handleUpdateQuiz}
              />
            )}
          </>
        )}
      </main>

      {/* Professional Footer */}
      <Footer onStartNow={handleStartNow} />
    </div>
  );
}
