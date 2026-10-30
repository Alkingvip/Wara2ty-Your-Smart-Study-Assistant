import React, { useState } from 'react';
import {
  FileText,
  Languages,
  BookMarked,
  Sparkles,
  HelpCircle,
  Copy,
  Check,
  Download,
  Eye,
  RefreshCw,
  Home,
  Save,
  Volume2,
  Tag,
  AlertTriangle,
  Search,
  BookOpen,
  ArrowRight,
  Maximize2
} from 'lucide-react';
import { AnalysisData } from '../types';
import { QuizCard } from './QuizCard';
import { exportStudyMaterialToPDF } from '../utils/pdfExport';
import { OriginalImageModal } from './OriginalImageModal';

interface ResultsViewProps {
  data: AnalysisData;
  originalImage: string | null;
  onAnalyzeAnother: () => void;
  onGoHome: () => void;
  onUpdateExtractedText: (newText: string) => void;
  onUpdateQuiz?: (newQuiz: any[]) => void;
}

type TabType = 'extracted' | 'translation' | 'vocabulary' | 'summary' | 'quiz';

export const ResultsView: React.FC<ResultsViewProps> = ({
  data,
  originalImage,
  onAnalyzeAnother,
  onGoHome,
  onUpdateExtractedText,
  onUpdateQuiz,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [isEditingText, setIsEditingText] = useState<boolean>(false);
  const [editedText, setEditedText] = useState<string>(data.extractedText);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [vocabSearch, setVocabSearch] = useState<string>('');
  const [isImageModalOpen, setIsImageModalOpen] = useState<boolean>(false);
  const [highlightUncertain, setHighlightUncertain] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    showToast(`تم نسخ ${type} إلى الحافظة بنجاح!`);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleSaveTextEdit = () => {
    onUpdateExtractedText(editedText);
    setIsEditingText(false);
    showToast('تم حفظ التعديلات على النص المستخرج!');
  };

  const handleDownloadPDF = () => {
    showToast('جاري إعداد وتحميل ملف الـ PDF الدراسي...');
    exportStudyMaterialToPDF(data, data.summary.title);
  };

  const speakText = (text: string, lang: string = 'tr-TR') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Filter vocabulary by search query
  const filteredVocab = data.vocabulary.filter(
    (item) =>
      item.word.toLowerCase().includes(vocabSearch.toLowerCase()) ||
      item.meaning.toLowerCase().includes(vocabSearch.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-semibold border border-slate-700 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Action & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              اللغة المكتشفة: {data.detectedLanguage}
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              وضوح الخط: {data.clarityScore}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            {data.summary.title || 'نتائج تحليل المحاضرة'}
          </h2>
          {data.topics && data.topics.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              {data.topics.map((t, i) => (
                <span key={i} className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {originalImage && (
            <button
              onClick={() => setIsImageModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
            >
              <Eye className="w-4 h-4 text-slate-600" />
              <span>معاينة الورقة الأصلية</span>
            </button>
          )}

          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-md shadow-emerald-500/20 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تنزيل ملخص PDF</span>
          </button>

          <button
            onClick={onAnalyzeAnother}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>تحليل صورة أخرى</span>
          </button>

          <button
            onClick={onGoHome}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
            title="العودة للرئيسية"
          >
            <Home className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs Navigation (PAGE 4 REQUIREMENT: Separate sections/tabs) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 no-scrollbar">
        
        {/* Tab 1: الملخص الدراسي */}
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'summary'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>الملخص الذكي للدرس</span>
        </button>

        {/* Tab 2: النص المستخرج */}
        <button
          onClick={() => setActiveTab('extracted')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'extracted'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4 text-blue-400" />
          <span>النص المستخرج (OCR)</span>
        </button>

        {/* Tab 3: الترجمة العربية */}
        <button
          onClick={() => setActiveTab('translation')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'translation'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Languages className="w-4 h-4 text-emerald-400" />
          <span>الترجمة العربية</span>
        </button>

        {/* Tab 4: المفردات والمصطلحات */}
        <button
          onClick={() => setActiveTab('vocabulary')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'vocabulary'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BookMarked className="w-4 h-4 text-amber-400" />
          <span>المفردات والمصطلحات ({data.vocabulary.length})</span>
        </button>

        {/* Tab 5: اختبر نفسك */}
        <button
          onClick={() => setActiveTab('quiz')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'quiz'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <HelpCircle className="w-4 h-4 text-purple-400" />
          <span>اختبر نفسك</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>

      </div>

      {/* TAB 1: SUMMARY */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            
            {/* Overview */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>النبذة العامة للمحاضرة</span>
              </div>
              <p className="text-base sm:text-lg text-slate-800 leading-relaxed font-medium bg-slate-50 p-5 rounded-2xl border border-slate-100">
                {data.summary.overview}
              </p>
            </div>

            {/* Key Points */}
            <div className="space-y-3">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>أبرز النقاط والمفاهيم الأساسية:</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.summary.keyPoints.map((point, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3"
                  >
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <p className="text-sm text-slate-700 leading-relaxed font-medium">
                      {point}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Exam Tip */}
            {data.summary.examTip && (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3.5">
                <span className="text-2xl flex-shrink-0">💡</span>
                <div className="space-y-1">
                  <h5 className="font-bold text-sm text-emerald-900">نصيحة ذهبية للامتحان:</h5>
                  <p className="text-sm text-emerald-800 leading-relaxed">
                    {data.summary.examTip}
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* TAB 2: EXTRACTED TEXT (Editable & Copyable) */}
      {activeTab === 'extracted' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-slate-900">النص المستخرج من الصورة</h3>
              <p className="text-xs text-slate-500">
                يمكنك تعديل أي جزء من النص يدوياً وحفظ التغييرات أو نسخه مباشرة.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isEditingText ? (
                <button
                  onClick={handleSaveTextEdit}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ التعديلات</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsEditingText(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  <span>تعديل النص</span>
                </button>
              )}

              <button
                onClick={() => handleCopy(editedText, 'النص المستخرج')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
              >
                {copiedType === 'النص المستخرج' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>نسخ النص</span>
              </button>
            </div>
          </div>

          {/* Uncertainty reminder */}
          {data.uncertainSections && data.uncertainSections.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                <strong>تنويه الدقة:</strong> الكلمات المطموسة أو غير الواضحة في الصورة مُعلّمة بـ <code className="bg-white px-1.5 py-0.5 rounded border">[غير واضح]</code> لضمان عدم اختلاق أي معلومات.
              </span>
            </div>
          )}

          {/* Textarea or View */}
          {isEditingText ? (
            <div className="space-y-2">
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                rows={16}
                dir="auto"
                className="w-full p-4 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-mono text-sm leading-relaxed"
                placeholder="النص المستخرج..."
              />
              <div className="flex justify-between text-xs text-slate-400 px-1">
                <span>عدد الحروف: {editedText.length}</span>
                <span>اضغط &quot;حفظ التعديلات&quot; بالأعلى لتثبيت التغيير</span>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div
                dir="auto"
                className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 font-sans text-sm sm:text-base leading-relaxed whitespace-pre-wrap select-text max-h-[600px] overflow-y-auto"
              >
                {editedText}
              </div>
              <div className="mt-2 text-xs text-slate-400 text-left">
                عدد الكلمات: {editedText.split(/\s+/).filter(Boolean).length} | الحروف: {editedText.length}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ARABIC TRANSLATION */}
      {activeTab === 'translation' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-slate-900">الترجمة العربية الأكاديمية</h3>
              <p className="text-xs text-slate-500">
                ترجمة واضحة تحافظ على المصطلحات وتوضح المعنى العلمي والدراسي.
              </p>
            </div>

            <button
              onClick={() => handleCopy(data.arabicTranslation, 'الترجمة العربية')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer self-start sm:self-auto"
            >
              {copiedType === 'الترجمة العربية' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>نسخ الترجمة</span>
            </button>
          </div>

          <div
            dir="rtl"
            className="p-6 sm:p-8 rounded-2xl bg-emerald-50/40 border border-emerald-100 text-slate-900 font-sans text-base sm:text-lg leading-relaxed whitespace-pre-wrap select-text"
          >
            {data.arabicTranslation}
          </div>
        </div>
      )}

      {/* TAB 4: VOCABULARY */}
      {activeTab === 'vocabulary' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-slate-900">معجم المفردات والمصطلحات الأكاديمية</h3>
              <p className="text-xs text-slate-500">
                أهم الكلمات التخصصية المستخرجة من المحاضرة مع الترجمة وسياق الاستخدام.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Search Box */}
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={vocabSearch}
                  onChange={(e) => setVocabSearch(e.target.value)}
                  placeholder="ابحث في الكلمات..."
                  className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                onClick={() => {
                  const vocabText = data.vocabulary
                    .map((v) => `${v.word} : ${v.meaning}`)
                    .join('\n');
                  handleCopy(vocabText, 'المفردات');
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold whitespace-nowrap transition cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ القائمة</span>
              </button>
            </div>
          </div>

          {filteredVocab.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              لا توجد مصطلحات مطابقة لبحثك.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredVocab.map((item, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition-all space-y-2 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-lg font-bold text-slate-900 block tracking-wide group-hover:text-emerald-700 transition">
                        {item.word}
                      </span>
                      <span className="text-sm font-semibold text-emerald-700 block">
                        {item.meaning}
                      </span>
                    </div>

                    {/* Audio Pronunciation Button */}
                    <button
                      onClick={() => speakText(item.word, 'tr-TR')}
                      className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-300 transition shadow-sm"
                      title="استمع للنطق الصوتي"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  {item.context && (
                    <div className="text-xs text-slate-500 pt-1 border-t border-slate-200/60">
                      <strong className="text-slate-600">السياق في المحاضرة: </strong>
                      <span>{item.context}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: اختبر نفسك (5 interactive questions) */}
      {activeTab === 'quiz' && (
        <QuizCard
          questions={data.quiz}
          lectureText={data.extractedText}
          lectureTitle={data.summary.title}
          summary={data.summary}
          onQuestionsUpdated={onUpdateQuiz}
        />
      )}

      {/* Original Image Modal */}
      <OriginalImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        imageUrl={originalImage}
        title={data.summary.title || 'ورقة المحاضرة الأصلية'}
      />

    </div>
  );
};
