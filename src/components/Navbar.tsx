import React from 'react';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { ActivePage } from '../types';

interface NavbarProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  hasResults: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activePage, onNavigate, hasResults }) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 text-right focus:outline-none whitespace-nowrap shrink-0 cursor-pointer group"
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 font-black shadow-sm group-hover:bg-emerald-400 transition-colors">
            <BookOpen className="w-5 h-5 text-slate-950" />
          </div>
          <span className="text-xl font-black tracking-tight text-white">
            ورقتي – Wara2ty
          </span>
        </button>

        {/* Zone 2: Clean Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
          <button
            onClick={() => onNavigate('home')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activePage === 'home'
                ? 'border-emerald-400 text-white'
                : 'border-transparent text-slate-300 hover:text-white'
            }`}
          >
            الرئيسية
          </button>
          <button
            onClick={() => onNavigate('upload')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activePage === 'upload'
                ? 'border-emerald-400 text-white'
                : 'border-transparent text-slate-300 hover:text-white'
            }`}
          >
            رفع وتحليل صورة
          </button>
          {hasResults && (
            <button
              onClick={() => onNavigate('results')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                activePage === 'results'
                  ? 'border-emerald-400 text-emerald-300'
                  : 'border-transparent text-emerald-400 hover:text-emerald-300'
              }`}
            >
              نتائج المحاضرة المحفوظة
            </button>
          )}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          {activePage !== 'upload' ? (
            <button
              onClick={() => onNavigate('upload')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>ابدأ الآن</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : hasResults ? (
            <button
              onClick={() => onNavigate('results')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs sm:text-sm border border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              عرض النتائج المحفوظة
            </button>
          ) : (
            <button
              onClick={() => onNavigate('home')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm border border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              العودة للرئيسية
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
