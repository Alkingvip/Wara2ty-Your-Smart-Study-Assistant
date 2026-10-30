/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './components/HomePage';
import { UploadSection } from './components/UploadSection';
import { AnalysisLoading } from './components/AnalysisLoading';
import { ResultsView } from './components/ResultsView';
import { ActivePage, AnalysisData, AnalysisResponse } from './types';
import { getSampleNoteImageData } from './utils/sampleNotes';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>('home');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Navigate to Upload page from Home CTA
  const handleStartNow = () => {
    setActivePage('upload');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Select a preset sample note
  const handleSelectSample = (sampleId: string) => {
    const dataUrl = getSampleNoteImageData(sampleId);
    if (dataUrl) {
      setUploadedImage(dataUrl);
      setActivePage('upload');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Trigger real multimodal Gemini AI analysis via backend API
  const handleAnalyze = async (base64Image: string, mimeType: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setUploadedImage(base64Image);

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

      const result: AnalysisResponse = await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || 'فشل في تحليل الصورة. يرجى التأكد من وضوح الصورة والمحاولة مرة أخرى.');
      }

      setAnalysisResult(result.data);
      setActivePage('results');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Analysis error:', err);
      setErrorMessage(
        err.message || 'حدث خطأ أثناء الاتصال بنموذج الذكاء الاصطناعي. يرجى المحاولة مرة أخرى بعد ثوانٍ قليلة.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateExtractedText = (newText: string) => {
    if (analysisResult) {
      setAnalysisResult({
        ...analysisResult,
        extractedText: newText,
      });
    }
  };

  const handleUpdateQuiz = (newQuiz: any[]) => {
    if (analysisResult) {
      setAnalysisResult({
        ...analysisResult,
        quiz: newQuiz,
      });
    }
  };

  const handleAnalyzeAnother = () => {
    setUploadedImage(null);
    setErrorMessage(null);
    setActivePage('upload');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoHome = () => {
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
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <p className="text-sm font-medium">{errorMessage}</p>
            </div>
            <button
              onClick={() => {
                setErrorMessage(null);
                if (uploadedImage) {
                  handleAnalyze(uploadedImage, 'image/jpeg');
                }
              }}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>إعادة المحاولة</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {isLoading ? (
          <AnalysisLoading />
        ) : (
          <>
            {activePage === 'home' && (
              <HomePage
                onStartNow={handleStartNow}
                onSelectSample={handleSelectSample}
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
