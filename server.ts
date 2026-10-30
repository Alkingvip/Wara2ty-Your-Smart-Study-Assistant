import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Support large image payloads (up to 30MB base64)
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Lazy/Shared Gemini client initialization
let genAiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured');
    }
    genAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Wara2ty – ورقتي',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    time: new Date().toISOString(),
  });
});

// Main multimodal note analysis endpoint
app.post('/api/analyze-note', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', targetLanguage = 'ar' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        error: 'Missing imageBase64 in request body.',
        code: 'MISSING_IMAGE',
      });
    }

    // Clean base64 string if data URL prefix exists
    let cleanBase64 = imageBase64;
    let actualMime = mimeType;
    if (imageBase64.includes(';base64,')) {
      const parts = imageBase64.split(';base64,');
      cleanBase64 = parts[1];
      const mimeMatch = parts[0].match(/data:(.*?)$/);
      if (mimeMatch && mimeMatch[1]) {
        actualMime = mimeMatch[1];
      }
    }

    const ai = getGenAI();

    const promptText = `
أنت خبير أكاديمي ومساعد دراسي متخصص في تحويل ملاحظات المحاضرات المكتوبة بخط اليد والمطبوعة إلى مواد دراسية رقمية فائقة التنظيم والدقة (تطبيق ورقتي - Wara2ty).

المهمة:
1. اقرأ الصورة المرفقة بتركيز فائق (Computer Vision & OCR)، سواء كانت بخط اليد أو مطبوعة، وحافظ على العناوين، الفقرات، القوائم، والمعادلات والجداول إن وجدت.
2. اكتشف لغة المصدر بدقة (خاصة التركية Türkçe، أو العربية، أو الإنجليزية، أو خليط).
3. لا تختلق كلمات غير مقروءة أو مطموسة إطلاقاً! إذا وُجدت كلمة غير واضحة، ضع علامة [غير واضح] بدلاً منها وأضف ملاحظة في قائمة uncertainSections.
4. استخرج النصوص بالكامل (extractedText) مع الحفاظ على التنسيق.
5. ترجم المحتوى كاملاً إلى لغة عربية فصحى أكاديمية واضحة ومترابطة (arabicTranslation)، مع الحفاظ التام على المعنى العلمي والاصطلاحي، خصوصاً إذا كانت الملاحظات باللغة التركية (أو الإنجليزية). إذا كانت الملاحظات أصلها عربية، قدم صياغة منقحة ومنظمة مع إيضاح المصطلحات.
6. استخرج قائمة بأهم الكلمات والمصطلحات المفتاحية (vocabulary)، خصوصاً الكلمات التركية/الأجنبية الهامة في المحاضرة مع معناها العربي الدقيق وسياقها في الدرس لتسهيل الحفظ.
7. صمّم ملخصاً دراسياً شاملاً (summary) يحتوي على عنوان واضح، نبذة مركزة (2-3 جمل)، نقاط رئيسية مرقمة أو نقطية (4-8 نقاط)، ونصيحة دراسية/امتحانية مفيدة (examTip).
8. أنشئ اختباراً تدريبياً تفاعلياً من 5 أسئلة اختيار من متعدد (quiz) مبنية حصراً ومباشرة على محتوى الملاحظات في الصورة، مع 4 خيارات واضحة، ورقم الإجابة الصحيحة (0 إلى 3)، وتفسير تعليمي عربي دقيق لسبب صحة الإجابة.
`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        detectedLanguage: {
          type: Type.STRING,
          description: 'Detected language name in Arabic, e.g. التركية, العربية, الإنجليزية, خليط تركي وعربي',
        },
        clarityScore: {
          type: Type.STRING,
          description: 'Assessment of the image/handwriting clarity in Arabic, e.g. ممتازة, واضحة, متوسطة, بها أجزاء غير واضحة',
        },
        topics: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'List of 2 to 5 relevant topic tags or subject classifications',
        },
        extractedText: {
          type: Type.STRING,
          description: 'Exact transcribed text preserving layout, line breaks, headings, bullet points, and tables. Mark smudged or ambiguous words with [غير واضح].',
        },
        arabicTranslation: {
          type: Type.STRING,
          description: 'Complete, fluent, and accurate Arabic translation preserving technical meaning and paragraph structures.',
        },
        summary: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Subject or lecture title in Arabic' },
            overview: { type: Type.STRING, description: 'Executive summary in 2-3 sentences in Arabic' },
            keyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Key principles, facts, formulas, or rules extracted from the note',
            },
            examTip: { type: Type.STRING, description: 'Actionable study or exam tip related to this content' },
          },
          required: ['title', 'overview', 'keyPoints', 'examTip'],
        },
        vocabulary: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING, description: 'Original word or term (e.g., Turkish keyword or technical term)' },
              meaning: { type: Type.STRING, description: 'Exact Arabic meaning and definition' },
              context: { type: Type.STRING, description: 'Brief context or example sentence showing usage' },
            },
            required: ['word', 'meaning'],
          },
          description: 'Key academic words and technical terms extracted from the text',
        },
        quiz: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER, description: 'Question index 1 to 5' },
              question: { type: Type.STRING, description: 'Question stem in Arabic strictly testing material from the image' },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Four plausible answer choices in Arabic',
              },
              correctIndex: { type: Type.INTEGER, description: '0-based index of the correct choice (0, 1, 2, or 3)' },
              explanation: { type: Type.STRING, description: 'Arabic educational explanation of the correct answer' },
            },
            required: ['id', 'question', 'options', 'correctIndex', 'explanation'],
          },
          description: 'Exactly 5 multiple-choice questions based strictly on the uploaded note',
        },
        uncertainSections: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Any ambiguous or smudged sections noted during transcription',
        },
      },
      required: [
        'detectedLanguage',
        'clarityScore',
        'topics',
        'extractedText',
        'arabicTranslation',
        'summary',
        'vocabulary',
        'quiz',
      ],
    };

    const imagePart = {
      inlineData: {
        mimeType: actualMime,
        data: cleanBase64,
      },
    };

    const textPart = {
      text: promptText,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    const rawText = response.text;
    if (!rawText) {
      throw new Error('Model returned an empty response.');
    }

    const parsedData = JSON.parse(rawText);
    return res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('Error analyzing image note:', error);
    const message = error?.message || 'فشل في تحليل الصورة بواسطة الذكاء الاصطناعي.';
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
});

// Endpoint to generate 5 fresh interactive questions from analyzed lecture content
app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { lectureText, lectureTitle, summary } = req.body;

    if (!lectureText && !summary) {
      return res.status(400).json({
        success: false,
        error: 'نص المحاضرة غير متوفر لتوليد الأسئلة.',
      });
    }

    const ai = getGenAI();
    const prompt = `
أنت خبير أكاديمي وواضع امتحانات جامعية في تطبيق "ورقتي – Wara2ty".
المطلوب منك:
بناءً حصرياً ومباشرة على محتوى المحاضرة والملاحظات الدراسية المرفقة أدناه، قم بصياغة 5 أسئلة اختيار من متعدد (MCQ) لقياس استيعاب الطالب بدقة.

الشروط الإلزامية:
1. الأسئلة يجب أن تكون مبنية 100% على محتوى المحاضرة ولا تعتمد على أي افتراضات خارجية.
2. لكل سؤال 4 خيارات حصرية وواضحة (أ، ب، ج، د).
3. خيار واحد فقط صحيح بدقة (رقم الفهرس correctIndex من 0 إلى 3).
4. اكتب شرحاً وتفسيراً تعليمياً واضحاً باللغة العربية لكل سؤال يوضح لماذا هذا الخيار هو الصحيح.
5. إذا كانت المحاضرة تركية، يمكنك صياغة أسئلة تختبر فهم القواعد أو معاني الكلمات أو المفاهيم العلمية الواردة فيها.

عنوان المحاضرة: ${lectureTitle || ''}
ملخص المحاضرة: ${typeof summary === 'object' ? JSON.stringify(summary) : summary || ''}

نص المحاضرة:
${(lectureText || '').substring(0, 15000)}
`;

    const quizSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER, description: 'Question index from 1 to 5' },
          question: { type: Type.STRING, description: 'Question text in Arabic' },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Exactly 4 distinct choices in Arabic',
          },
          correctIndex: { type: Type.INTEGER, description: '0-based index of correct option (0, 1, 2, or 3)' },
          explanation: { type: Type.STRING, description: 'Clear pedagogical explanation in Arabic' },
        },
        required: ['id', 'question', 'options', 'correctIndex', 'explanation'],
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: quizSchema,
      },
    });

    const rawText = response.text;
    if (!rawText) {
      throw new Error('لم يرجع النموذج أي استجابة.');
    }

    const parsedQuestions = JSON.parse(rawText);
    return res.json({
      success: true,
      questions: parsedQuestions,
    });
  } catch (error: any) {
    console.error('Error generating quiz questions:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'فشل في توليد أسئلة الاختبار بواسطة الذكاء الاصطناعي.',
    });
  }
});

// Configure Vite middleware in dev or static files in production
async function startServer() {
  const distPath = path.resolve(__dirname, 'dist');
  const indexHtmlPath = path.resolve(distPath, 'index.html');
  const hasDist = fs.existsSync(indexHtmlPath);

  // Cloud Run detection (K_SERVICE is set automatically by Cloud Run)
  const isCloudRun = Boolean(process.env.K_SERVICE || process.env.K_REVISION);
  const isExplicitProduction = process.env.NODE_ENV === 'production';
  const isProduction = isCloudRun || isExplicitProduction || (hasDist && process.env.NODE_ENV !== 'development');

  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('Vite middleware mounted in development mode');
    } catch (viteErr) {
      console.warn('Could not initialize Vite middleware, falling back to static files:', viteErr);
      if (hasDist) {
        app.use(express.static(distPath));
        app.get('*', (req, res) => res.sendFile(indexHtmlPath));
      }
    }
  } else {
    if (hasDist) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(indexHtmlPath);
      });
      console.log(`Serving static production files from: ${distPath}`);
    } else {
      console.warn('Warning: dist/index.html was not found. Serving fallback page.');
      app.get('*', (req, res) => {
        res.status(200).send(`
          <!DOCTYPE html>
          <html lang="ar" dir="rtl">
            <head><meta charset="UTF-8"><title>Wara2ty – ورقتي</title></head>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
              <h2>تطبيق ورقتي – Wara2ty</h2>
              <p>الخادم يعمل بنجاح على المنفذ ${PORT}. يرجى تشغيل بناء واجهة المستخدم (npm run build).</p>
            </body>
          </html>
        `);
      });
    }
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Wara2ty server is running at http://0.0.0.0:${PORT} [mode: ${isProduction ? 'production' : 'development'}]`);
  });

  // Graceful shutdown handling for Cloud Run container lifecycle
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server gracefully');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server gracefully');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
