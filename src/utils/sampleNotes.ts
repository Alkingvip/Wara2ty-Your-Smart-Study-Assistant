import { SampleNote } from '../types';

/**
 * Generates an authentic canvas-rendered lecture note image to serve as real test inputs.
 */
function createLectureNoteCanvas(
  title: string,
  subTitle: string,
  date: string,
  lines: string[],
  highlightIndexes: number[] = [],
  marginNote: string = ''
): string {
  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background: Paper with subtle warm tint
  ctx.fillStyle = '#faf8f5';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Red left margin line (classic notebook)
  ctx.strokeStyle = '#fca5a5';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(110, 0);
  ctx.lineTo(110, canvas.height);
  ctx.stroke();

  // Horizontal notebook rules
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  const lineSpacing = 36;
  const startY = 160;

  for (let y = startY; y < canvas.height - 40; y += lineSpacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Header Box (Navy Blue banner)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(40, 45, 820, 85);

  // Header Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(title, 65, 85);

  // Subtitle & Date
  ctx.fillStyle = '#34d399'; // Soft Green
  ctx.font = '16px sans-serif';
  ctx.fillText(subTitle, 65, 112);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(date, 830, 85);

  // Margin Note (Handwritten style)
  if (marginNote) {
    ctx.save();
    ctx.translate(55, 380);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'italic bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`★ ${marginNote}`, 0, 0);
    ctx.restore();
  }

  // Render Note Content Lines
  ctx.textAlign = 'left';
  let curY = startY + 28;

  lines.forEach((line, index) => {
    // Highlighter effect
    if (highlightIndexes.includes(index)) {
      ctx.fillStyle = 'rgba(52, 211, 153, 0.25)'; // Soft emerald highlighter
      ctx.fillRect(130, curY - 22, 700, 30);
    }

    if (line.startsWith('## ')) {
      ctx.fillStyle = '#1e3a8a'; // Navy Blue header
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(line.replace('## ', ''), 135, curY);
    } else if (line.startsWith('# ')) {
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 25px sans-serif';
      ctx.fillText(line.replace('# ', ''), 135, curY);
    } else if (line.startsWith('• ') || line.startsWith('- ')) {
      ctx.fillStyle = '#10b981'; // Bullet
      ctx.beginPath();
      ctx.arc(145, curY - 6, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.font = '18px sans-serif';
      ctx.fillText(line.substring(2), 165, curY);
    } else if (line.startsWith('> ')) {
      // Important box
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(135, curY - 24, 690, 32);
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(135, curY - 24);
      ctx.lineTo(135, curY + 8);
      ctx.stroke();

      ctx.fillStyle = '#065f46';
      ctx.font = 'italic bold 17px sans-serif';
      ctx.fillText(line.replace('> ', ''), 155, curY);
    } else {
      ctx.fillStyle = '#334155';
      ctx.font = '18px sans-serif';
      ctx.fillText(line, 135, curY);
    }

    curY += lineSpacing;
  });

  return canvas.toDataURL('image/jpeg', 0.92);
}

export const SAMPLE_NOTES: SampleNote[] = [
  {
    id: 'turkish-grammar',
    title: 'قواعد اللغة التركية: الزمن الحاضر (Şimdiki Zaman)',
    subject: 'اللغة التركية وآدابها',
    language: 'التركية',
    badge: 'تركي - شائع للطلاب',
    description: 'ملاحظات محاضرة جامعية تشرح صياغة الزمن الحاضر في التركية مع اللواحق (-iyor) والأمثلة وقواعد التوافق الصوتي.',
    imageDataUrl: '', // generated dynamically
  },
  {
    id: 'turkish-medical',
    title: 'مصطلحات طبية بالتركية: الجهاز الهضمي (Sindirim Sistemi)',
    subject: 'الطب والعلوم الصحية',
    language: 'التركية واللاتينية',
    badge: 'طبي - مصطلحات وتشريح',
    description: 'ملاحظات طالب طب في جامعة تركية تتضمن أعضاء الجهاز الهضمي ووظائفها ومصطلحات سريرية مترجمة.',
    imageDataUrl: '',
  },
  {
    id: 'turkish-history',
    title: 'التاريخ والأدب العثماني والتركي (Osmanlı ve Türk Edebiyatı)',
    subject: 'التاريخ الإنساني',
    language: 'التركية',
    badge: 'تاريخ وأدب',
    description: 'ملخص مكتوب لأبرز المراحل الأدبية والشعراء والمصطلحات التاريخية في العصر العثماني والحديث.',
    imageDataUrl: '',
  },
];

export function getSampleNoteImageData(id: string): string {
  if (typeof document === 'undefined') return '';

  if (id === 'turkish-grammar') {
    return createLectureNoteCanvas(
      'TÜRKÇE DERS NOTLARI: ŞİMDİKİ ZAMAN',
      'İstanbul Üniversitesi - Dilbilim ve Dilbilgisi Dersi',
      'Ders: 04 / Tarih: 18.10.2025',
      [
        '# Konu: Şimdiki Zaman (-iyor Eki)',
        'Bu zaman kipi şu anda yapılmakta olan veya devam eden eylemleri anlatır.',
        '',
        '## 1. Temel Yapı ve Formül:',
        '• Formül: Fiil Kökü + (ı / i / u / ü) + yor + Şahıs Eki',
        '> Örnek 1: Gel-mek -> Gel + i + yor + um = Geliyorum (أنا قادم / آتي الآن)',
        '> Örnek 2: Git-mek -> Gid + i + yor = Gidiyor (هو يذهب - t harfi d olur)',
        '> Örnek 3: Oku-mak -> Oku + yor = Okuyor (هو يقرأ)',
        '',
        '## 2. Ünlü Daralması Kuralı (قاعدة تضييق الحروف الصوتية):',
        '• Fiil kökü geniş sesli (a, e) ile bitiyorsa:',
        '• a -> ı veya u  (Örnek: Başla-mak -> Başlıyor)',
        '• e -> i veya ü  (Örnek: Bekle-mek -> Bekliyor)',
        '',
        '## 3. Olumsuz Şekil (الشرط المنفي -mıyor / -miyor):',
        '• Yapı: Fiil Kökü + -mı / -mi / -mu / -mü + yor + Şahıs eki',
        '• Örnek: Anlamıyorum (لا أفهم) / Bilmiyor (لا يعلم)',
        '',
        '## 4. Önemli Kelimeler ve Cümleler (Ödev):',
        '• Kütüphanede Türkçe sınavına çalışıyorum.',
        '• Öğretmen tahtaya yeni kelimeleri yazıyor.',
      ],
      [4, 9, 10, 16],
      'Önemli Sınav Sorusu!'
    );
  }

  if (id === 'turkish-medical') {
    return createLectureNoteCanvas(
      'TIBBİ BİYOLOJİ: SİNDİRİM SİSTEMİ ANATOMİSİ',
      'Cerrahpaşa Tıp Fakültesi - Dönem 2',
      'Hafta: 03 / Tarih: 22.10.2025',
      [
        '# Sindirim Kanalı Organları ve Temel İşlevleri',
        'Besinlerin mekanik ve kimyasal parçalanmasını sağlayan organlar sistemi.',
        '',
        '## 1. Ağız ve Yutak (Cavitas Oris & Farenks):',
        '• Tükürük bezleri amilaz enzimi içerir, karbonhidrat sindirimi başlar.',
        '• Dil (lingua) besinlerin karıştırılması ve yutulmasını sağlar.',
        '',
        '## 2. Mide (Gaster):',
        '• pH değeri yaklaşık 1.5 - 2.0 (Hidroklorik Asit - HCl salgısı).',
        '• Pepsin ve gastrin enzimleri protein sindirimini başlatır.',
        '> Klinik Not: Gastrit ve ülser mukozal bariyerin hasarında oluşur.',
        '',
        '## 3. Karaciğer ve Safra Kesesi (Hepar & Vesica Biliaris):',
        '• Safra (bile) üretir ve yağların mekanik emülsifikasyonunu sağlar.',
        '• Toksinlerin arındırılması ve glikojen depolanmasında birincil organdır.',
        '',
        '## 4. İnce Bağırsak (Duodenum, Jejunum, İleum):',
        '• Besin emiliminin (absorpsiyon) en yoğun gerçekleştiği kısımdır.',
        '• Villus yapıları yüzey alanını 600 kat genişletir.',
      ],
      [3, 8, 12, 17],
      'Anatomi Pratik Sınavı'
    );
  }

  return createLectureNoteCanvas(
    'TÜRK EDEBİYATI VE KÜLTÜR TARİHİ',
    'Ankara Üniversitesi - Edebiyat Fakültesi',
    'Ders: 07 / Tarih: 15.10.2025',
    [
      '# Tanzimat Dönemi Türk Edebiyatı (1860-1896)',
      'Batılılaşma hareketlerinin edebiyata yansıdığı ilk dönemdir.',
      '',
      '## 1. Temel Özellikler ve Akımlar:',
      '• Sanat toplum içindir anlayışı benimsenmiştir.',
      '• Fransız edebiyatından roman, tiyatro ve makale türleri çevrilmiştir.',
      '• Hak, adalet, vatan ve hürriyet kavramları ilk kez işlenmiştir.',
      '',
      '## 2. Önemli Temsilciler:',
      '• Şinasi: İlk Türkçe özel gazete (Tercüman-ı Ahval) ve ilk tiyatro (Şair Evlenmesi).',
      '> Namık Kemal: Vatan Şairi olarak bilinir (Vatan yahut Silistre eseri).',
      '• Ziya Paşa: Terkib-i Bend ve şiir eleştirileri ile ünlüdür.',
      '',
      '## 3. Dil ve Üslup Tartışmaları:',
      '• Dilde sadeleşme savunulmuş ancak tam başarılamamıştır.',
      '• Divan edebiyatı nazım şekilleri ve aruz ölçüsü kullanılmaya devam etmiştir.',
    ],
    [3, 7, 9, 13],
    'Final Konusu'
  );
}
