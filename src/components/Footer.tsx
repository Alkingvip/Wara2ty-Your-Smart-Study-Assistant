import React from 'react';
import { BookOpen, Sparkles, CheckCircle2, ShieldCheck, Heart } from 'lucide-react';

interface FooterProps {
  onStartNow: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onStartNow }) => {
  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800/80 pt-16 pb-12 mt-20 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          
          {/* Col 1: Brand & Bio */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-md">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-2xl font-black text-white font-sans">ورقتي – Wara2ty</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md">
              منصة ذكية صُممت خصيصاً لمساعدة طلاب الجامعات والباحثين ودارسي اللغات (خاصة اللغة التركية) على تحويل صور المحاضرات اليدوية والملازم المطبوعة إلى مواد دراسية منسقة، مترجمة، ومزودة بملخصات واختبارات تفاعلية فورية.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                رؤية حاسوبية متقدمة (Computer Vision)
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                خصوصية تامة وحماية لبيانات الملاحظات
              </span>
            </div>
          </div>

          {/* Col 2: Key Capabilities */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4 tracking-wide">القدرات والمميزات</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li className="hover:text-emerald-400 transition cursor-pointer">قراءة خط اليد والمطبوعات بدقة</li>
              <li className="hover:text-emerald-400 transition cursor-pointer">الترجمة الأكاديمية (تركي / عربي)</li>
              <li className="hover:text-emerald-400 transition cursor-pointer">استخراج الكلمات والمفردات الصعبة</li>
              <li className="hover:text-emerald-400 transition cursor-pointer">صياغة ملخصات الدرس ونقاط الامتحان</li>
              <li className="hover:text-emerald-400 transition cursor-pointer">توليد 5 أسئلة اختيار من متعدد تفاعلية</li>
              <li className="hover:text-emerald-400 transition cursor-pointer">تصدير المادة كملف PDF منظم</li>
            </ul>
          </div>

          {/* Col 3: Student Action */}
          <div className="space-y-4">
            <h4 className="text-white font-bold text-sm mb-4 tracking-wide">جاهز للمذاكرة بذكاء؟</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              وفّر ساعات من التفريغ اليدوي والترجمة العشوائية، وحوّل دفتر ملاحظاتك إلى شريك دراسي متكامل بضغطة زر واحدة.
            </p>
            <button
              onClick={onStartNow}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>جرّب تحليل ورقتك الآن</span>
            </button>
          </div>

        </div>

        {/* Bottom Credits */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} ورقتي – Wara2ty. جميع الحقوق محفوظة لخدمة الطلاب والدارسين.</p>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>صُنع بشغف لمساعدة طلاب الجامعات ودارسي اللغة التركية</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          </div>
        </div>
      </div>
    </footer>
  );
};
