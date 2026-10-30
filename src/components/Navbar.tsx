import React from 'react';
import { BookOpen, Sparkles, ArrowLeft, UploadCloud, Layers } from 'lucide-react';
import { ActivePage } from '../types';

interface NavbarProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  hasResults: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activePage, onNavigate, hasResults }) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo & Name */}
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-3.5 group text-right focus:outline-none"
        >
          <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200">
            <BookOpen className="w-6 h-6 text-slate-950" />
            <Sparkles className="w-3.5 h-3.5 text-white absolute -top-1 -right-1 fill-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight text-white font-sans">ورقتي</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Wara2ty
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">مساعد دراسي بالرؤية الحاسوبية والذكاء الاصطناعي</p>
          </div>
        </button>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5 lg:gap-3 bg-slate-800/60 p-1.5 rounded-2xl border border-slate-700/60 text-sm">
          <button
            onClick={() => onNavigate('home')}
            className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
              activePage === 'home'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            الرئيسية
          </button>
          <button
            onClick={() => onNavigate('upload')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
              activePage === 'upload'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            رفع وتحليل صورة
          </button>

          {hasResults && (
            <button
              onClick={() => onNavigate('results')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                activePage === 'results'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
              }`}
            >
              <Layers className="w-4 h-4" />
              النتائج الحالية
            </button>
          )}
        </nav>

        {/* Primary Call to Action */}
        <div className="flex items-center gap-3">
          {activePage !== 'upload' ? (
            <button
              onClick={() => onNavigate('upload')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-sm shadow-md shadow-emerald-500/25 transition-all duration-150 cursor-pointer"
            >
              <span>ابدأ الآن</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => onNavigate('home')}
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 transition"
            >
              العودة للرئيسية
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
