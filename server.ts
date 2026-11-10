import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel, GenerateContentResponse } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Support large image payloads (up to 50MB base64)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Express body-parser error middleware (handles 413 Payload Too Large & malformed JSON cleanly)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return res.status(413).json({
      success: false,
      code: 'PAYLOAD_TOO_LARGE',
      error: 'حجم الصورة المرفوعة كبير جداً ويتجاوز سعة الذاكرة المسموحة. يرجى اختيار صورة أصغر حجماً أو المحاولة مجدداً.',
    });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_JSON_PAYLOAD',
      error: 'تنسيق البيانات المرسلة إلى الخادم غير صالح.',
    });
  }
  next(err);
});

interface ExecutionStage {
  model: string;
  useSchema: boolean;
  useLowThinking: boolean;
  timeoutMs: number;
  delayBeforeMs: number;
  label: string;
}

// Multi-stage instant failover pipeline prioritizing ultra-fast, high-availability models
// to completely eliminate 503 High Demand spikes and connection hangs.
const EXECUTION_PIPELINE: ExecutionStage[] = [
  {
    model: 'gemini-3.1-flash-lite',
    useSchema: true,
    useLowThinking: false,
    timeoutMs: 25000,
    delayBeforeMs: 0,
    label: 'gemini-3.1-flash-lite (schema)',
  },
  {
    model: 'gemini-3.1-flash-lite',
    useSchema: false,
    useLowThinking: false,
    timeoutMs: 25000,
    delayBeforeMs: 300,
    label: 'gemini-3.1-flash-lite (fast json)',
  },
  {
    model: 'gemini-3.8-flash',
    useSchema: true,
    useLowThinking: true,
    timeoutMs: 14000,
    delayBeforeMs: 300,
    label: 'gemini-3.8-flash (low-thinking + schema)',
  },
  {
    model: 'gemini-flash-latest',
    useSchema: false,
    useLowThinking: false,
    timeoutMs: 14000,
    delayBeforeMs: 400,
    label: 'gemini-flash-latest (fast json)',
  },
];

function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY environment variable is not configured');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableOrOverloadError(err: any): boolean {
  const msg = String(err?.message || err || '').toLowerCase();
  const status = Number(err?.status || err?.code || err?.httpStatus || 0);

  if ([429, 500, 502, 503, 504, 404, 408].includes(status)) return true;

  return (
    msg.includes('503') ||
    msg.includes('429') ||
    msg.includes('stage_timeout') ||
    msg.includes('overloaded') ||
    msg.includes('unavailable') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('high demand') ||
    msg.includes('spikes in demand') ||
    msg.includes('capacity') ||
    msg.includes('too many requests') ||
    msg.includes('busy') ||
    msg.includes('deadline_exceeded') ||
    msg.includes('timeout') ||
    msg.includes('fetch failed') ||
    msg.includes('econnreset') ||
    msg.includes('socket hang up') ||
    msg.includes('not_found') ||
    msg.includes('404') ||
    msg.includes('empty text response')
  );
}

/**
 * Executes generateContent across the multi-stage pipeline with strict per-stage timeouts.
 * Immediately switches to the next stage on 503 High Demand / 429 / timeout without hanging.
 */
async function executeGeminiWithResilience(
  ai: GoogleGenAI,
  contents: any,
  responseSchema: any
): Promise<{ response: GenerateContentResponse; modelUsed: string }> {
  let lastError: any = null;

  for (const stage of EXECUTION_PIPELINE) {
    if (stage.delayBeforeMs > 0) {
      await sleep(stage.delayBeforeMs);
    }

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    try {
      const config: Record<string, any> = {
        responseMimeType: 'application/json',
      };

      if (stage.useSchema && responseSchema) {
        config.responseSchema = responseSchema;
      }

      if (stage.useLowThinking) {
        config.thinkingConfig = {
          thinkingLevel: ThinkingLevel.LOW,
        };
      }

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`STAGE_TIMEOUT after ${stage.timeoutMs}ms on ${stage.label}`));
        }, stage.timeoutMs);
      });

      const response = await Promise.race([
        ai.models.generateContent({
          model: stage.model,
          contents,
          config,
        }),
        timeoutPromise,
      ]);

      if (timeoutHandle) clearTimeout(timeoutHandle);

      if (response && response.text && response.text.trim().length > 0) {
        return { response, modelUsed: stage.label };
      }
      throw new Error('Model returned an empty text response');
    } catch (err: any) {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      lastError = err;
      const canSwitch = isRetryableOrOverloadError(err);
      console.warn(
        `[Gemini Resilience] Stage "${stage.label}" encountered error (${canSwitch ? 'switching immediately' : 'fatal'}):`,
        err?.message || err
      );

      if (!canSwitch) {
        throw err;
      }
    }
  }

  throw lastError || new Error('جميع مسارات الذكاء الاصطناعي مشغولة حالياً.');
}

/**
 * Safely strips Markdown code fences and parses JSON returned by the model.
 */
function safeParseJson<T = any>(rawText: string): T {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');

    if (
      firstBrace !== -1 &&
      lastBrace > firstBrace &&
      (firstBracket === -1 || firstBrace < firstBracket)
    ) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as T;
    }
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      return JSON.parse(cleaned.slice(firstBracket, lastBracket + 1)) as T;
    }
    throw new Error('تعذر قراءة استجابة الذكاء الاصطناعي بتنسيق منظم.');
  }
}

/**
 * Translates technical Gemini/server errors (including raw JSON 503 strings) into clear Arabic explanations.
 */
function translateErrorToArabic(error: any): { status: number; code: string; message: string; retryable: boolean } {
  const rawMsg = String(error?.message || error || '');
  const lower = rawMsg.toLowerCase();

  if (
    lower.includes('api_key_invalid') ||
    lower.includes('permission_denied') ||
    lower.includes('gemini_api_key environment variable is not configured') ||
    lower.includes('403')
  ) {
    return {
      status: 403,
      code: 'API_KEY_ERROR',
      retryable: false,
      message:
        'مفتاح خدمة الذكاء الاصطناعي (GEMINI_API_KEY) غير مضبوط أو غير صالح. يرجى التحقق منه في لوحة الإعدادات (Settings > Secrets).',
    };
  }

  if (
    lower.includes('503') ||
    lower.includes('overloaded') ||
    lower.includes('unavailable') ||
    lower.includes('high demand') ||
    lower.includes('spikes in demand') ||
    lower.includes('capacity') ||
    lower.includes('busy')
  ) {
    return {
      status: 503,
      code: 'SERVER_OVERLOADED',
      retryable: true,
      message:
        'خوادم الذكاء الاصطناعي تشهد ذروة طلبات مؤقتة حالياً (503). يرجى الضغط على "إعادة المحاولة" وسيتم التحليل فوراً عبر المسار السريع.',
    };
  }

  if (
    lower.includes('429') ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('rate limit')
  ) {
    return {
      status: 429,
      code: 'SERVER_BUSY_QUOTA',
      retryable: true,
      message:
        'تم الوصول للحد المؤقت للطلبات في الدقيقة (429). يرجى الانتظار بضع ثوانٍ ثم الضغط على "إعادة المحاولة".',
    };
  }

  if (lower.includes('invalid argument') || lower.includes('unsupported mime')) {
    return {
      status: 400,
      code: 'INVALID_IMAGE',
      retryable: false,
      message:
        'تعذر معالجة الصورة المرفوعة. يرجى التأكد من أن الصورة واضحة وبصيغة JPG أو PNG أو WEBP والمحاولة مجدداً.',
    };
  }

  return {
    status: 500,
    code: 'INTERNAL_ANALYSIS_ERROR',
    retryable: true,
    message: 'حدث خطأ مؤقت أثناء معالجة المحاضرة. يرجى الضغط على "إعادة المحاولة".',
  };
}

// Health check endpoint with memory & model cascade diagnostics
app.get('/api/health', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: 'ok',
    app: 'Wara2ty – ورقتي',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    pipelineStages: EXECUTION_PIPELINE.map((s) => s.label),
    memoryMB: Math.round(mem.rss / (1024 * 1024)),
    time: new Date().toISOString(),
  });
});

// Main multimodal note analysis endpoint
app.post('/api/analyze-note', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body || {};

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({
        success: false,
        code: 'MISSING_IMAGE',
        error: 'لم يتم إرفاق صورة للتحليل. يرجى اختيار صورة المحاضرة أولاً.',
      });
    }

    // Clean base64 string if data URL prefix exists
    let cleanBase64 = imageBase64.trim();
    let actualMime = mimeType;
    if (cleanBase64.includes(';base64,')) {
      const parts = cleanBase64.split(';base64,');
      cleanBase64 = parts[1] || '';
      const mimeMatch = parts[0].match(/data:(.*?)$/);
      if (mimeMatch && mimeMatch[1]) {
        actualMime = mimeMatch[1];
      }
    }

    if (!cleanBase64 || cleanBase64.length < 50) {
      return res.status(400).json({
        success: false,
        code: 'EMPTY_IMAGE',
        error: 'بيانات الصورة المرفوعة غير مكتملة أو تالفة. يرجى اختيار صورة أخرى.',
      });
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
7. صمّم ملخصاً دراسياً شاملاً (summary) يحتوي على عنوان واضح (title)، نبذة مركزة (overview)، نقاط رئيسية (keyPoints)، ونصيحة دراسية/امتحانية مفيدة (examTip).
8. أنشئ اختباراً تدريبياً تفاعلياً من 5 أسئلة اختيار من متعدد (quiz) مبنية حصراً ومباشرة على محتوى الملاحظات في الصورة، مع 4 خيارات واضحة (options)، ورقم الإجابة الصحيحة (correctIndex من 0 إلى 3)، وتفسير تعليمي عربي دقيق (explanation).

أرجع النتيجة حصراً بصيغة JSON مطابقة تماماً لهذا الهيكل:
{
  "detectedLanguage": "التركية",
  "clarityScore": "واضحة",
  "topics": ["موضوع 1", "موضوع 2"],
  "extractedText": "النص المستخرج بالكامل...",
  "arabicTranslation": "الترجمة العربية الكاملة...",
  "summary": {
    "title": "عنوان الدرس",
    "overview": "نبذة عامة من جملتين...",
    "keyPoints": ["نقطة 1", "نقطة 2", "نقطة 3", "نقطة 4"],
    "examTip": "نصيحة للامتحان..."
  },
  "vocabulary": [
    { "word": "Kelime", "meaning": "المعنى بالعربية", "context": "سياق الكلمة" }
  ],
  "quiz": [
    {
      "id": 1,
      "question": "نص السؤال باللغة العربية؟",
      "options": ["الخيار 1", "الخيار 2", "الخيار 3", "الخيار 4"],
      "correctIndex": 0,
      "explanation": "تفسير الإجابة الصحيحة"
    }
  ],
  "uncertainSections": []
}
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

    const { response, modelUsed } = await executeGeminiWithResilience(
      ai,
      { parts: [imagePart, textPart] },
      responseSchema
    );

    const rawText = response.text || '';
    const rawParsed = safeParseJson<any>(rawText);

    // Normalize data structure to prevent any missing field errors on client
    const normalizedData = {
      detectedLanguage: rawParsed?.detectedLanguage || 'غير محدد',
      clarityScore: rawParsed?.clarityScore || 'واضحة',
      topics: Array.isArray(rawParsed?.topics) ? rawParsed.topics.map(String) : [],
      extractedText: rawParsed?.extractedText || 'لم يتم العثور على نص واضح في الصورة.',
      arabicTranslation: rawParsed?.arabicTranslation || rawParsed?.extractedText || '',
      summary: {
        title: rawParsed?.summary?.title || 'ملخص المحاضرة الدراسية',
        overview: rawParsed?.summary?.overview || 'تم استخراج وتحليل محتوى المحاضرة بنجاح.',
        keyPoints: Array.isArray(rawParsed?.summary?.keyPoints)
          ? rawParsed.summary.keyPoints.map(String)
          : [],
        examTip: rawParsed?.summary?.examTip || 'راجع المصطلحات الأساسية والنقاط الرئيسية قبل الاختبار.',
      },
      vocabulary: Array.isArray(rawParsed?.vocabulary)
        ? rawParsed.vocabulary.map((v: any) => ({
            word: String(v?.word || ''),
            meaning: String(v?.meaning || ''),
            context: v?.context ? String(v.context) : undefined,
          }))
        : [],
      quiz: Array.isArray(rawParsed?.quiz)
        ? rawParsed.quiz.slice(0, 5).map((q: any, idx: number) => ({
            id: idx + 1,
            question: String(q?.question || `سؤال ${idx + 1}`),
            options:
              Array.isArray(q?.options) && q.options.length >= 2
                ? q.options.slice(0, 4).map(String)
                : ['الخيار الأول', 'الخيار الثاني', 'الخيار الثالث', 'الخيار الرابع'],
            correctIndex:
              typeof q?.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex <= 3
                ? q.correctIndex
                : 0,
            explanation: String(q?.explanation || 'الإجابة مستخرجة من محتوى المحاضرة.'),
          }))
        : [],
      uncertainSections: Array.isArray(rawParsed?.uncertainSections)
        ? rawParsed.uncertainSections.map(String)
        : [],
    };

    return res.json({
      success: true,
      modelUsed,
      data: normalizedData,
    });
  } catch (error: any) {
    console.error('Error analyzing image note:', error);
    const translated = translateErrorToArabic(error);
    return res.status(translated.status).json({
      success: false,
      code: translated.code,
      retryable: translated.retryable,
      error: translated.message,
    });
  }
});

// Endpoint to generate 5 fresh interactive questions from analyzed lecture content
app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { lectureText, lectureTitle, summary } = req.body || {};

    if (!lectureText && !summary) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_LECTURE_CONTENT',
        error: 'نص المحاضرة غير متوفر لتوليد الأسئلة.',
      });
    }

    const ai = getGenAI();
    const prompt = `
أنت خبير أكاديمي وواضع امتحانات جامعية في تطبيق "ورقتي – Wara2ty".
المطلوب منك:
بناءً حصرياً ومباشرة على محتوى المحاضرة والملاحظات الدراسية المرفقة أدناه، قم بصياغة 5 أسئلة اختيار من متعدد (MCQ) جديدة ومختلفة لقياس استيعاب الطالب بدقة.

الشروط الإلزامية:
1. الأسئلة يجب أن تكون مبنية 100% على محتوى المحاضرة ولا تعتمد على أي افتراضات خارجية.
2. لكل سؤال 4 خيارات حصرية وواضحة (أ، ب، ج، د).
3. خيار واحد فقط صحيح بدقة (رقم الفهرس correctIndex من 0 إلى 3).
4. اكتب شرحاً وتفسيراً تعليمياً واضحاً باللغة العربية لكل سؤال يوضح لماذا هذا الخيار هو الصحيح.
5. إذا كانت المحاضرة تركية، يمكنك صياغة أسئلة تختبر فهم القواعد أو معاني الكلمات أو المفاهيم العلمية الواردة فيها.

أرجع النتيجة حصراً كمصفوفة JSON (Array of 5 objects) بهذا الشكل:
[
  {
    "id": 1,
    "question": "نص السؤال باللغة العربية؟",
    "options": ["الخيار 1", "الخيار 2", "الخيار 3", "الخيار 4"],
    "correctIndex": 0,
    "explanation": "تفسير الإجابة الصحيحة"
  }
]

عنوان المحاضرة: ${lectureTitle || ''}
ملخص المحاضرة: ${typeof summary === 'object' ? JSON.stringify(summary) : summary || ''}

نص المحاضرة:
${String(lectureText || '').substring(0, 15000)}
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

    const { response, modelUsed } = await executeGeminiWithResilience(ai, prompt, quizSchema);

    const rawText = response.text || '[]';
    const parsedPayload = safeParseJson<any>(rawText);
    const rawQuestions = Array.isArray(parsedPayload)
      ? parsedPayload
      : Array.isArray(parsedPayload?.questions)
      ? parsedPayload.questions
      : Array.isArray(parsedPayload?.quiz)
      ? parsedPayload.quiz
      : [];

    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      throw new Error('لم يرجع النموذج قائمة أسئلة صالحة.');
    }

    const normalizedQuestions = rawQuestions.slice(0, 5).map((q: any, idx: number) => ({
      id: idx + 1,
      question: String(q?.question || `سؤال ${idx + 1}`),
      options:
        Array.isArray(q?.options) && q.options.length >= 2
          ? q.options.slice(0, 4).map(String)
          : ['الخيار الأول', 'الخيار الثاني', 'الخيار الثالث', 'الخيار الرابع'],
      correctIndex:
        typeof q?.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex <= 3
          ? q.correctIndex
          : 0,
      explanation: String(q?.explanation || 'الإجابة الصحيحة مستمدة من شرح المحاضرة.'),
    }));

    return res.json({
      success: true,
      modelUsed,
      questions: normalizedQuestions,
    });
  } catch (error: any) {
    console.error('Error generating quiz questions:', error);
    const translated = translateErrorToArabic(error);
    return res.status(translated.status).json({
      success: false,
      code: translated.code,
      retryable: translated.retryable,
      error: translated.message,
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

  // Increase server timeouts to prevent premature socket disconnects during deep OCR + translation
  server.keepAliveTimeout = 120000;
  server.headersTimeout = 125000;

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
