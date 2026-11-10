import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  Sparkles,
  Trash2,
  RefreshCw,
  FileText,
  AlertCircle,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { SAMPLE_NOTES, getSampleNoteImageData } from '../utils/sampleNotes';
import { optimizeImageForAnalysis, formatBytesArabic } from '../utils/imageOptimizer';

interface UploadSectionProps {
  onAnalyze: (base64Image: string, mimeType: string) => void;
  isLoading: boolean;
  initialImageData?: string | null;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  onAnalyze,
  isLoading,
  initialImageData = null,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(initialImageData);
  const [fileMime, setFileMime] = useState<string>('image/jpeg');
  const [fileName, setFileName] = useState<string>('');
  const [fileSizeStr, setFileSizeStr] = useState<string>('');
  const [compressionNotice, setCompressionNotice] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialImageData) {
      setImagePreview(initialImageData);
    }
  }, [initialImageData]);

  const handleProcessFile = useCallback(async (file: File) => {
    setErrorMessage(null);
    setCompressionNotice(null);

    // Validate mime type: JPG, PNG, WEBP
    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type.toLowerCase())) {
      setErrorMessage('صيغة الملف غير مدعومة. يرجى رفع صورة بصيغة JPG أو PNG أو WEBP.');
      return;
    }

    // Validate raw size (allow up to 35MB raw since we compress it in-browser)
    if (file.size > 35 * 1024 * 1024) {
      setErrorMessage('حجم الصورة كبير جداً. الحد الأقصى المسموح به هو 35 ميغابايت.');
      return;
    }

    setIsOptimizing(true);
    setFileName(file.name);

    try {
      const result = await optimizeImageForAnalysis(file);
      setImagePreview(result.dataUrl);
      setFileMime(result.mimeType);
      setFileSizeStr(
        `${formatBytesArabic(result.optimizedSizeBytes)} (${result.width}×${result.height} بكسل)`
      );

      if (result.wasCompressed && result.originalSizeBytes > result.optimizedSizeBytes) {
        const savedPercent = Math.round(
          ((result.originalSizeBytes - result.optimizedSizeBytes) / result.originalSizeBytes) * 100
        );
        if (savedPercent >= 15) {
          setCompressionNotice(
            `تم ضغط وتحسين أبعاد الصورة تلقائياً من ${formatBytesArabic(
              result.originalSizeBytes
            )} إلى ${formatBytesArabic(
              result.optimizedSizeBytes
            )} (توفير ${savedPercent}%) لتسريع الرفع ومنع امتلاء ذاكرة السيرفر.`
          );
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'تعذر قراءة أو تحسين ملف الصورة. حاول مرة أخرى.');
    } finally {
      setIsOptimizing(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleProcessFile(e.dataTransfer.files[0]);
      }
    },
    [handleProcessFile]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setFileName('');
    setFileSizeStr('');
    setCompressionNotice(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectSample = (sampleId: string) => {
    setErrorMessage(null);
    setCompressionNotice(null);
    const dataUrl = getSampleNoteImageData(sampleId);
    if (dataUrl) {
      const selected = SAMPLE_NOTES.find((s) => s.id === sampleId);
      setImagePreview(dataUrl);
      setFileMime('image/jpeg');
      setFileName(selected ? `${selected.title}.jpg` : 'نموذج_محاضرة.jpg');
      setFileSizeStr('نموذج جاهز عالي الدقة (900×1200 بكسل)');
    }
  };

  const handleSubmitAnalysis = () => {
    if (!imagePreview) {
      setErrorMessage('يرجى رفع صورة أولاً للبدء بالتحليل.');
      return;
    }
    onAnalyze(imagePreview, fileMime);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 text-emerald-700 text-xs font-bold">
          <UploadCloud className="w-4 h-4" />
          <span>الخطوة 1 · رفع ورقة الملاحظات</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
          ارفع صورة محاضرتك أو اختر نموذجاً
        </h2>
        <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto">
          يدعم Wara2ty صور الملاحظات اليدوية والصفحات المطبوعة بصيغ JPG و PNG و WEBP مع ضغط ذكي تلقائي لضمان سرعة التحليل.
        </p>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      {/* Smart Compression Notice */}
      {compressionNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3.5 rounded-2xl flex items-center gap-3 text-xs sm:text-sm">
          <Zap className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p>{compressionNotice}</p>
        </div>
      )}

      {/* Main Upload / Preview Area */}
      {!imagePreview ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !isOptimizing && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-14 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50/80 scale-[1.01]'
              : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/60 shadow-sm'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleInputChange}
          />

          <div className="space-y-4 max-w-md mx-auto">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-slate-100 text-slate-700 flex items-center justify-center shadow-inner">
              <UploadCloud className={`w-10 h-10 text-emerald-600 ${isOptimizing ? 'animate-bounce' : ''}`} />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                {isOptimizing ? 'جاري تحسين وضغط الصورة...' : 'اسحب وأفلت صورة المحاضرة هنا'}
              </h3>
              <p className="text-sm text-slate-500">
                أو انقر للتصفح من هاتفك أو جهازك
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2 text-xs text-slate-500 font-medium">
              <span>JPG</span>
              <span aria-hidden="true">·</span>
              <span>PNG</span>
              <span aria-hidden="true">·</span>
              <span>WEBP</span>
              <span aria-hidden="true">·</span>
              <span>تحسين تلقائي للأحجام الكبيرة</span>
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={isOptimizing}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-md hover:bg-slate-800 transition whitespace-nowrap"
              >
                {isOptimizing ? 'يرجى الانتظار...' : 'تحديد صورة من الجهاز'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Image Preview Box */
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">{fileName || 'صورة الملاحظات المختارة'}</h4>
                <p className="text-xs text-slate-500 tabular-nums">{fileSizeStr || 'جاهزة للتحليل'}</p>
              </div>
            </div>

            {/* Replace / Remove Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isOptimizing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition whitespace-nowrap cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>استبدال الصورة</span>
              </button>
              <button
                type="button"
                onClick={handleRemoveImage}
                disabled={isLoading || isOptimizing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition whitespace-nowrap cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف</span>
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleInputChange}
          />

          {/* Image Display */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900/5 max-h-[500px] flex items-center justify-center p-2">
            <img
              src={imagePreview}
              alt="معاينة الملاحظات"
              className="max-h-[460px] w-auto object-contain rounded-xl shadow-inner"
            />
          </div>

          {/* Action Bar: "حلّل الصورة" button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>سيتم فحص خط اليد واستخراج النصوص والترجمة وإنشاء الاختبار فوراً</span>
            </div>

            <button
              onClick={handleSubmitAnalysis}
              disabled={isLoading || isOptimizing}
              className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-base flex items-center justify-center gap-3 transition-all cursor-pointer shadow-lg whitespace-nowrap ${
                isLoading || isOptimizing
                  ? 'bg-slate-400 text-white cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 shadow-emerald-500/25 hover:shadow-xl'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              <span>حلّل الصورة بالذكاء الاصطناعي</span>
            </button>
          </div>
        </div>
      )}

      {/* SAMPLE QUICK SELECTION GRID */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-7 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <h4 className="text-base font-bold text-slate-900">
              أو جرّب أحد النماذج التعليمية الجاهزة (ملاحظات باللغة التركية):
            </h4>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SAMPLE_NOTES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => handleSelectSample(sample.id)}
              disabled={isLoading || isOptimizing}
              className="text-right p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-all text-xs space-y-1.5 group cursor-pointer"
            >
              <span className="font-bold text-slate-900 block group-hover:text-emerald-700 transition">
                {sample.title}
              </span>
              <span className="text-[11px] text-slate-500 block">
                {sample.subject} · {sample.badge}
              </span>
              <span className="inline-block text-[11px] text-emerald-700 font-bold pt-1">
                اختر هذا النموذج ←
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
