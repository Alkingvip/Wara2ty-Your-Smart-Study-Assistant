import { AnalysisData } from '../types';

const STORAGE_KEY_RESULT = 'wara2ty_latest_analysis_v1';
const STORAGE_KEY_IMAGE = 'wara2ty_latest_image_v1';
const STORAGE_KEY_TIMESTAMP = 'wara2ty_latest_timestamp_v1';

export interface SavedSession {
  data: AnalysisData;
  image: string | null;
  savedAt: string | null;
}

export function saveAnalysisSession(data: AnalysisData, imageBase64: string | null): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  const nowIso = new Date().toISOString();

  try {
    window.localStorage.setItem(STORAGE_KEY_RESULT, JSON.stringify(data));
    window.localStorage.setItem(STORAGE_KEY_TIMESTAMP, nowIso);
  } catch (err) {
    console.warn('Could not save analysis result to localStorage:', err);
    try {
      // Clear old keys and retry saving just the text data
      window.localStorage.removeItem(STORAGE_KEY_IMAGE);
      window.localStorage.setItem(STORAGE_KEY_RESULT, JSON.stringify(data));
      window.localStorage.setItem(STORAGE_KEY_TIMESTAMP, nowIso);
    } catch {
      // Ignore if private browsing disables localStorage completely
    }
  }

  if (imageBase64) {
    try {
      // Only store image in localStorage if it's reasonably sized (< 2.5MB string)
      if (imageBase64.length < 2_500_000) {
        window.localStorage.setItem(STORAGE_KEY_IMAGE, imageBase64);
      } else {
        window.localStorage.removeItem(STORAGE_KEY_IMAGE);
      }
    } catch {
      // Quota exceeded for image; keep the text analysis intact
      window.localStorage.removeItem(STORAGE_KEY_IMAGE);
    }
  }
}

export function loadAnalysisSession(): SavedSession | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;

  try {
    const rawResult = window.localStorage.getItem(STORAGE_KEY_RESULT);
    if (!rawResult) return null;

    const parsed = JSON.parse(rawResult) as AnalysisData;
    if (!parsed || !parsed.extractedText || !parsed.summary) {
      return null;
    }

    const savedImage = window.localStorage.getItem(STORAGE_KEY_IMAGE);
    const savedAt = window.localStorage.getItem(STORAGE_KEY_TIMESTAMP);

    return {
      data: parsed,
      image: savedImage || null,
      savedAt: savedAt || null,
    };
  } catch (err) {
    console.warn('Failed to load saved session from localStorage:', err);
    return null;
  }
}

export function clearAnalysisSession(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY_RESULT);
    window.localStorage.removeItem(STORAGE_KEY_IMAGE);
    window.localStorage.removeItem(STORAGE_KEY_TIMESTAMP);
  } catch {
    // Ignore
  }
}
