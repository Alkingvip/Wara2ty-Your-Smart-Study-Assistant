export interface VocabItem {
  word: string;
  meaning: string;
  context?: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface StudySummary {
  title: string;
  overview: string;
  keyPoints: string[];
  examTip: string;
}

export interface AnalysisData {
  detectedLanguage: string;
  clarityScore: string;
  topics: string[];
  extractedText: string;
  arabicTranslation: string;
  summary: StudySummary;
  vocabulary: VocabItem[];
  quiz: QuizQuestion[];
  uncertainSections?: string[];
}

export interface AnalysisResponse {
  success: boolean;
  data?: AnalysisData;
  error?: string;
}

export type ActivePage = 'home' | 'upload' | 'results';

export interface SampleNote {
  id: string;
  title: string;
  subject: string;
  language: string;
  badge: string;
  description: string;
  imageDataUrl: string;
}
