import React from 'react';
import {
  FileText,
  Languages,
  HelpCircle,
  Upload,
  Cpu,
  GraduationCap,
  Sparkles,
  ArrowLeft,
  CheckCircle,
  FileCheck,
  Zap,
  BookOpen,
  Eye,
  Download,
  Award
} from 'lucide-react';
import { SAMPLE_NOTES } from '../utils/sampleNotes';

interface HomePageProps {
  onStartNow: () => void;
  onSelectSample: (sampleId: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onStartNow, onSelectSample }) => {
  return (
    <div className="space-y-24 py-8">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-6 pb-12 lg:pt-12">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-emerald-500/10 via-teal-500/10 to-blue-600/10 blur-3xl -z-10 rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center px-4 sm:px-6 space-y-8">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-emerald-400 text-xs sm:text-sm font-semibold shadow-inner">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>المساعد الأكاديمي الذكي الأول لطلاب الجامعات واللغات</span>
          </div>

          {/* Main Headline (Exact requirement: حوّل محاضراتك إلى ملاحظات جاهزة للمذاكرة) */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-[1.2] sm:leading-[1.15]">
            حوّل محاضراتك إلى <br className="hidden sm:inline" />
            <span className="bg-gradient-to-l from-emerald-600 via-teal-600 to-slate-900 bg-clip-text text-transparent">
              ملاحظات جاهزة للمذاكرة
            </span>
          </h1>

          {/* Supporting Text */}
          <p className="max-w-2xl mx-auto text-base sm:text-xl text-slate-600 leading-relaxed font-normal">
            تطبيق <strong className="text-slate-900 font-bold">ورقتي (Wara2ty)</strong> يستخدم تقنيات الرؤية الحاسوبية المتقدمة ونماذج الذكاء الاصطناعي لفهم خط اليد والملاحظات المطبوعة، استخراج النصوص، ترجمة المحاضرات التركية بدقة إلى العربية، وتوليد ملخصات واختبارات تفاعلية فورية.
          </p>

          {/* Prominent "ابدأ الآن" CTA button and secondary actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={onStartNow}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg flex items-center justify-center gap-3 shadow-xl shadow-slate-900/20 hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center group-hover:rotate-12 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              <span>ابدأ الآن مجاناً</span>
              <ArrowLeft className="w-5 h-5 text-emerald-400 group-hover:-translate-x-1 transition-transform" />
            </button>

            <a
              href="#how-it-works"
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 font-semibold text-base border border-slate-200 transition-all flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4 text-slate-500" />
              <span>كيف يعمل ورقتي؟</span>
            </a>
          </div>

          {/* Trust Highlights */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs sm:text-sm text-slate-500 font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>يدعم خط اليد والمستندات المطبوعة</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>تخصص دقيق في اللغة التركية والترجمة</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>توليد 5 أسئلة اختبار تفاعلية بنقرة واحدة</span>
            </div>
          </div>

        </div>
      </section>

      {/* QUICK TRY SAMPLES SECTION (For instant testing) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
                  تجربة سريعة وفورية
                </span>
                <h3 className="text-xl sm:text-2xl font-bold mt-2">ليس لديك صورة ورقة الآن؟ جرب نموذجاً جاهزاً!</h3>
                <p className="text-slate-300 text-sm mt-1">
                  اختر إحدى نماذج الملاحظات الجامعية التركية الحقيقية واختبر الذكاء الاصطناعي مباشرة:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {SAMPLE_NOTES.map((sample) => (
                <div
                  key={sample.id}
                  onClick={() => onSelectSample(sample.id)}
                  className="bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-emerald-500/50 rounded-2xl p-4 text-right transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <span className="inline-block text-[11px] font-semibold text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded-md border border-emerald-800/50">
                      {sample.badge}
                    </span>
                    <h4 className="font-bold text-sm text-white group-hover:text-emerald-300 transition-colors">
                      {sample.title}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {sample.description}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs font-semibold text-emerald-400 group-hover:text-emerald-300">
                    <span>تحليل هذا النموذج</span>
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PAGE 1 REQUIREMENT: THREE MAIN FEATURES */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-3 mb-12">
          <span className="text-emerald-600 font-bold text-sm bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-100">
            مزايا حصرية للطلاب
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
            ثلاث قدرات خارقة في منصة واحدة
          </h2>
          <p className="text-slate-600 max-w-xl mx-auto text-sm sm:text-base">
            صُمم ورقتي ليتجاوز برامج الـ OCR التقليدية، عبر الجمع بين الفهم اللغوي والتحليل الأكاديمي العميق.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Feature 1: استخراج النصوص من الصور */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-md shadow-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold shadow-inner">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                استخراج النصوص من الصور
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                تقنيات Computer Vision المتقدمة لقراءة الملاحظات المكتوبة بخط اليد والمستندات المطبوعة، مع الحفاظ الدقيق على العناوين والفقرات والقوائم والجداول، وتحديد الأجزاء غير الواضحة بكل شفافية وبدون تأليف.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-blue-700">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <span>قابلية التعديل الفوري والنسخ بنقرة واحدة</span>
            </div>
          </div>

          {/* Feature 2: الترجمة الذكية */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-md shadow-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shadow-inner">
                <Languages className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                الترجمة الذكية المتخصصة
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                ترجمة أكاديمية احترافية للملاحظات باللغة التركية والأجنبية إلى لغة عربية سليمة وواضحة، مع استخراج المفردات والمصطلحات الأكاديمية الجديدة لتمكين الطالب من تكوين قاموسه الخاص ونطق الكلمات.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>دعم تركي/عربي فائق الدقة مع السياق الأكاديمي</span>
            </div>
          </div>

          {/* Feature 3: إنشاء الملخصات والاختبارات */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-md shadow-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold shadow-inner">
                <HelpCircle className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                إنشاء الملخصات والاختبارات
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                صياغة ملخص دراسي مركز بأبرز النقاط ونصيحة للامتحان، بالإضافة إلى بنك أسئلة تدريبية من 5 أسئلة اختيار من متعدد تفاعلية مع تفسير لكل إجابة وحساب لعلامتك فوراً.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-purple-700">
              <CheckCircle className="w-4 h-4 text-purple-600" />
              <span>تثبيت المعلومات والاستعداد للاختبارات الحقيقية</span>
            </div>
          </div>

        </div>
      </section>

      {/* PAGE 1 REQUIREMENT: THREE-STEP EXPLANATION */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-slate-100/70 rounded-3xl p-8 sm:p-12 border border-slate-200">
          <div className="text-center space-y-3 mb-12">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              طريقة العمل البسيطة
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900">
              ثلاث خطوات تفصلك عن مادتك الدراسية المنظمة
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            
            {/* Step 1 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 relative text-right space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-black flex items-center justify-center text-lg shadow-sm">
                1
              </div>
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <Upload className="w-4 h-4" />
                <span>الخطوة الأولى: ارفع الصورة</span>
              </div>
              <h4 className="text-lg font-bold text-slate-900">التقط صورة لدفترك أو حمل ملفاً</h4>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                ارفع صورة واضحة لصفحة المحاضرة (JPG، PNG، WEBP) سواء كانت بخط اليد أو مطبوعة بالسحب والإفلات.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 relative text-right space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-lg shadow-sm">
                2
              </div>
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <Cpu className="w-4 h-4" />
                <span>الخطوة الثانية: التحليل الذكي</span>
              </div>
              <h4 className="text-lg font-bold text-slate-900">معالجة فورية بالرؤية الحاسوبية</h4>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                يقوم محرك Gemini بقراءة الملاحظات بدقة، التعرف على اللغة، واستخراج الهيكل والترجمة والمفردات.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 relative text-right space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white font-black flex items-center justify-center text-lg shadow-sm">
                3
              </div>
              <div className="flex items-center gap-2 text-teal-600 font-bold text-sm">
                <GraduationCap className="w-4 h-4" />
                <span>الخطوة الثالثة: ذاكر وتفاعل</span>
              </div>
              <h4 className="text-lg font-bold text-slate-900">مراجعة، اختبار، وتنزيل PDF</h4>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                انسخ النص، عدله، راجع الترجمة والمفردات، اختبر نفسك بالأسئلة التفاعلية، ونزّل ملخص المذاكرة كملف PDF.
              </p>
            </div>

          </div>

          <div className="mt-10 text-center">
            <button
              onClick={onStartNow}
              className="px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base shadow-lg shadow-emerald-600/20 transition cursor-pointer"
            >
              ابدأ الخطوة الأولى الآن
            </button>
          </div>
        </div>
      </section>

      {/* TARGET USERS FOCUS & BENEFIT CARD */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-950/70 px-3 py-1 rounded-full border border-emerald-800/40">
              <Award className="w-3.5 h-3.5" />
              <span>مخصص لطلاب الجامعات التركية والعربية</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black">
              هل تدرس باللغة التركية أو لغة أجنبية؟ ورقتي صُنع لأجلك.
            </h3>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              الكثير من الطلاب يواجهون صعوبة في متابعة خطوط الأساتذة السريعة على السبورة أو قراءة ملازم الدفاتر باللغة التركية. ورقتي لا يكتفي باستخراج الكلمات، بل يترجمها ترجمة أكاديمية واعية، ويستخلص لك مصطلحات الدرس حتى تذاكر في نصف الوقت وبأعلى استيعاب.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
};
