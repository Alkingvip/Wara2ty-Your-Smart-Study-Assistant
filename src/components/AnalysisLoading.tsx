import React, { useEffect, useState } from 'react';
import { Sparkles, Scan, FileSearch, CheckCircle, Languages, HelpCircle } from 'lucide-react';

export const AnalysisLoading: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(0);

  const steps = [
    {
      title: 'فحص الصورة بالرؤية الحاسوبية',
      desc: 'قراءة النصوص المكتوبة بخط اليد والمطبوعة وفحص الهيكل والجداول...',
      icon: Scan,
    },
    {
      title: 'الكشف عن اللغة والترجمة الأكاديمية',
      desc: 'التعرف على المفردات التركية/الأجنبية وتوليد الترجمة العربية الدقيقة...',
      icon: Languages,
    },
    {
      title: 'استخراج المصطلحات والمفردات الصعبة',
      desc: 'بناء معجم دراسي خاص بمصطلحات المحاضرة ونطقها وسياقها...',
      icon: FileSearch,
    },
    {
      title: 'توليد الملخص وبنك الأسئلة التدريبية',
      desc: 'صياغة ملخص مركز للدرس و5 أسئلة اختيار من متعدد تفاعلية...',
      icon: HelpCircle,
    },
  ];

  useEffect(() => {
    const timer1 = setTimeout(() => setCurrentStep(1), 1800);
    const timer2 = setTimeout(() => setCurrentStep(2), 3800);
    const timer3 = setTimeout(() => setCurrentStep(3), 6200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-10">
      
      {/* Central Visual Scanner */}
      <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
        {/* Pulsing rings */}
        <div className="absolute inset-0 rounded-3xl bg-emerald-500/20 animate-ping" />
        <div className="absolute inset-1 rounded-3xl bg-emerald-500/30 animate-pulse" />
        <div className="relative z-10 w-24 h-24 rounded-3xl bg-slate-900 border border-slate-800 text-white flex items-center justify-center shadow-2xl">
          <Scan className="w-10 h-10 text-emerald-400 animate-bounce" />
          <Sparkles className="w-5 h-5 text-emerald-300 absolute -top-2 -right-2 fill-emerald-300 animate-spin" />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
          جاري تحليل محاضرتك بواسطة الذكاء الاصطناعي...
        </h3>
        <p className="text-slate-500 text-sm max-w-md mx-auto">
          يقوم نموذج Wara2ty بفحص خط اليد وتفكيك النصوص ومطابقة المعاني الأكاديمية بدقة فائقة.
        </p>
      </div>

      {/* Progressive Step Progress */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm text-right space-y-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isDone = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <div
              key={index}
              className={`flex items-start gap-3.5 p-3 rounded-2xl transition-all duration-300 ${
                isCurrent
                  ? 'bg-emerald-50/70 border border-emerald-200'
                  : isDone
                  ? 'bg-slate-50 opacity-80'
                  : 'opacity-40'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  isDone
                    ? 'bg-emerald-600 text-white'
                    : isCurrent
                    ? 'bg-emerald-500 text-slate-950 font-bold animate-pulse'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {isDone ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
              </div>
              <div className="space-y-0.5 flex-1">
                <h4 className="text-sm font-bold text-slate-900">{step.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Helpful student quote */}
      <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200/80 text-xs text-slate-600">
        💡 <strong className="text-slate-900">نصيحة ورقتي:</strong> يقوم التطبيق بتمييز الكلمات غير الواضحة بعلامة <code className="bg-white px-1.5 py-0.5 rounded border text-slate-800">[غير واضح]</code> لضمان عدم اختلاق أي معلومات مغلوطة في دراستك.
      </div>
    </div>
  );
};
