import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, Eye } from 'lucide-react';

interface OriginalImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title?: string;
}

export const OriginalImageModal: React.FC<OriginalImageModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = 'ورقة المحاضرة الأصلية',
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  if (!isOpen || !imageUrl) return null;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setZoomLevel(1);
    setRotation(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl text-white">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">{title}</h3>
              <p className="text-xs text-slate-400">راجع خط اليد والتفاصيل لمقارنتها مع النص المستخرج</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="تصغير"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-slate-400 w-12 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="تكبير"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleRotate}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="تدوير"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition"
            >
              إعادة ضبط
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition ml-2"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Canvas / Viewport */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-950 flex items-center justify-center min-h-[400px]">
          <div
            style={{
              transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
              transition: 'transform 0.2s ease-out',
            }}
            className="origin-center"
          >
            <img
              src={imageUrl}
              alt="الورقة الأصلية"
              className="max-h-[65vh] w-auto max-w-full rounded-xl shadow-2xl object-contain border border-slate-800"
            />
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between text-xs text-slate-400">
          <span>استخدم زري التكبير والتصغير أو حرك الصورة للفحص الدقيق للكلمات</span>
          <a
            href={imageUrl}
            download="wara2ty_original_note.jpg"
            className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>حفظ الصورة في جهازك</span>
          </a>
        </div>

      </div>
    </div>
  );
};
