// server.ts
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var PORT = parseInt(process.env.PORT || "3000", 10);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use((err, req, res, next) => {
  if (err?.type === "entity.too.large" || err?.status === 413) {
    return res.status(413).json({
      success: false,
      code: "PAYLOAD_TOO_LARGE",
      error: "\u062D\u062C\u0645 \u0627\u0644\u0635\u0648\u0631\u0629 \u0627\u0644\u0645\u0631\u0641\u0648\u0639\u0629 \u0643\u0628\u064A\u0631 \u062C\u062F\u0627\u064B \u0648\u064A\u062A\u062C\u0627\u0648\u0632 \u0633\u0639\u0629 \u0627\u0644\u0630\u0627\u0643\u0631\u0629 \u0627\u0644\u0645\u0633\u0645\u0648\u062D\u0629. \u064A\u0631\u062C\u0649 \u0627\u062E\u062A\u064A\u0627\u0631 \u0635\u0648\u0631\u0629 \u0623\u0635\u063A\u0631 \u062D\u062C\u0645\u0627\u064B \u0623\u0648 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u062C\u062F\u062F\u0627\u064B."
    });
  }
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      success: false,
      code: "INVALID_JSON_PAYLOAD",
      error: "\u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0631\u0633\u0644\u0629 \u0625\u0644\u0649 \u0627\u0644\u062E\u0627\u062F\u0645 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D."
    });
  }
  next(err);
});
var EXECUTION_PIPELINE = [
  {
    model: "gemini-3.1-flash-lite",
    useSchema: true,
    useLowThinking: false,
    timeoutMs: 25e3,
    delayBeforeMs: 0,
    label: "gemini-3.1-flash-lite (schema)"
  },
  {
    model: "gemini-3.1-flash-lite",
    useSchema: false,
    useLowThinking: false,
    timeoutMs: 25e3,
    delayBeforeMs: 300,
    label: "gemini-3.1-flash-lite (fast json)"
  },
  {
    model: "gemini-3.8-flash",
    useSchema: true,
    useLowThinking: true,
    timeoutMs: 14e3,
    delayBeforeMs: 300,
    label: "gemini-3.8-flash (low-thinking + schema)"
  },
  {
    model: "gemini-flash-latest",
    useSchema: false,
    useLowThinking: false,
    timeoutMs: 14e3,
    delayBeforeMs: 400,
    label: "gemini-flash-latest (fast json)"
  }
];
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("GEMINI_API_KEY environment variable is not configured");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function isRetryableOrOverloadError(err) {
  const msg = String(err?.message || err || "").toLowerCase();
  const status = Number(err?.status || err?.code || err?.httpStatus || 0);
  if ([429, 500, 502, 503, 504, 404, 408].includes(status)) return true;
  return msg.includes("503") || msg.includes("429") || msg.includes("stage_timeout") || msg.includes("overloaded") || msg.includes("unavailable") || msg.includes("resource_exhausted") || msg.includes("quota") || msg.includes("rate limit") || msg.includes("high demand") || msg.includes("spikes in demand") || msg.includes("capacity") || msg.includes("too many requests") || msg.includes("busy") || msg.includes("deadline_exceeded") || msg.includes("timeout") || msg.includes("fetch failed") || msg.includes("econnreset") || msg.includes("socket hang up") || msg.includes("not_found") || msg.includes("404") || msg.includes("empty text response");
}
async function executeGeminiWithResilience(ai, contents, responseSchema) {
  let lastError = null;
  for (const stage of EXECUTION_PIPELINE) {
    if (stage.delayBeforeMs > 0) {
      await sleep(stage.delayBeforeMs);
    }
    let timeoutHandle = null;
    try {
      const config = {
        responseMimeType: "application/json"
      };
      if (stage.useSchema && responseSchema) {
        config.responseSchema = responseSchema;
      }
      if (stage.useLowThinking) {
        config.thinkingConfig = {
          thinkingLevel: ThinkingLevel.LOW
        };
      }
      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`STAGE_TIMEOUT after ${stage.timeoutMs}ms on ${stage.label}`));
        }, stage.timeoutMs);
      });
      const response = await Promise.race([
        ai.models.generateContent({
          model: stage.model,
          contents,
          config
        }),
        timeoutPromise
      ]);
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (response && response.text && response.text.trim().length > 0) {
        return { response, modelUsed: stage.label };
      }
      throw new Error("Model returned an empty text response");
    } catch (err) {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      lastError = err;
      const canSwitch = isRetryableOrOverloadError(err);
      console.warn(
        `[Gemini Resilience] Stage "${stage.label}" encountered error (${canSwitch ? "switching immediately" : "fatal"}):`,
        err?.message || err
      );
      if (!canSwitch) {
        throw err;
      }
    }
  }
  throw lastError || new Error("\u062C\u0645\u064A\u0639 \u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0645\u0634\u063A\u0648\u0644\u0629 \u062D\u0627\u0644\u064A\u0627\u064B.");
}
function safeParseJson(rawText) {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    const firstBracket = cleaned.indexOf("[");
    const lastBracket = cleaned.lastIndexOf("]");
    if (firstBrace !== -1 && lastBrace > firstBrace && (firstBracket === -1 || firstBrace < firstBracket)) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      return JSON.parse(cleaned.slice(firstBracket, lastBracket + 1));
    }
    throw new Error("\u062A\u0639\u0630\u0631 \u0642\u0631\u0627\u0621\u0629 \u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0628\u062A\u0646\u0633\u064A\u0642 \u0645\u0646\u0638\u0645.");
  }
}
function translateErrorToArabic(error) {
  const rawMsg = String(error?.message || error || "");
  const lower = rawMsg.toLowerCase();
  if (lower.includes("api_key_invalid") || lower.includes("permission_denied") || lower.includes("gemini_api_key environment variable is not configured") || lower.includes("403")) {
    return {
      status: 403,
      code: "API_KEY_ERROR",
      retryable: false,
      message: "\u0645\u0641\u062A\u0627\u062D \u062E\u062F\u0645\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A (GEMINI_API_KEY) \u063A\u064A\u0631 \u0645\u0636\u0628\u0648\u0637 \u0623\u0648 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646\u0647 \u0641\u064A \u0644\u0648\u062D\u0629 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A (Settings > Secrets)."
    };
  }
  if (lower.includes("503") || lower.includes("overloaded") || lower.includes("unavailable") || lower.includes("high demand") || lower.includes("spikes in demand") || lower.includes("capacity") || lower.includes("busy")) {
    return {
      status: 503,
      code: "SERVER_OVERLOADED",
      retryable: true,
      message: '\u062E\u0648\u0627\u062F\u0645 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u062A\u0634\u0647\u062F \u0630\u0631\u0648\u0629 \u0637\u0644\u0628\u0627\u062A \u0645\u0624\u0642\u062A\u0629 \u062D\u0627\u0644\u064A\u0627\u064B (503). \u064A\u0631\u062C\u0649 \u0627\u0644\u0636\u063A\u0637 \u0639\u0644\u0649 "\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629" \u0648\u0633\u064A\u062A\u0645 \u0627\u0644\u062A\u062D\u0644\u064A\u0644 \u0641\u0648\u0631\u0627\u064B \u0639\u0628\u0631 \u0627\u0644\u0645\u0633\u0627\u0631 \u0627\u0644\u0633\u0631\u064A\u0639.'
    };
  }
  if (lower.includes("429") || lower.includes("resource_exhausted") || lower.includes("quota") || lower.includes("rate limit")) {
    return {
      status: 429,
      code: "SERVER_BUSY_QUOTA",
      retryable: true,
      message: '\u062A\u0645 \u0627\u0644\u0648\u0635\u0648\u0644 \u0644\u0644\u062D\u062F \u0627\u0644\u0645\u0624\u0642\u062A \u0644\u0644\u0637\u0644\u0628\u0627\u062A \u0641\u064A \u0627\u0644\u062F\u0642\u064A\u0642\u0629 (429). \u064A\u0631\u062C\u0649 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631 \u0628\u0636\u0639 \u062B\u0648\u0627\u0646\u064D \u062B\u0645 \u0627\u0644\u0636\u063A\u0637 \u0639\u0644\u0649 "\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629".'
    };
  }
  if (lower.includes("invalid argument") || lower.includes("unsupported mime")) {
    return {
      status: 400,
      code: "INVALID_IMAGE",
      retryable: false,
      message: "\u062A\u0639\u0630\u0631 \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0635\u0648\u0631\u0629 \u0627\u0644\u0645\u0631\u0641\u0648\u0639\u0629. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0623\u0646 \u0627\u0644\u0635\u0648\u0631\u0629 \u0648\u0627\u0636\u062D\u0629 \u0648\u0628\u0635\u064A\u063A\u0629 JPG \u0623\u0648 PNG \u0623\u0648 WEBP \u0648\u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u062C\u062F\u062F\u0627\u064B."
    };
  }
  return {
    status: 500,
    code: "INTERNAL_ANALYSIS_ERROR",
    retryable: true,
    message: '\u062D\u062F\u062B \u062E\u0637\u0623 \u0645\u0624\u0642\u062A \u0623\u062B\u0646\u0627\u0621 \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0645\u062D\u0627\u0636\u0631\u0629. \u064A\u0631\u062C\u0649 \u0627\u0644\u0636\u063A\u0637 \u0639\u0644\u0649 "\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629".'
  };
}
app.get("/api/health", (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: "ok",
    app: "Wara2ty \u2013 \u0648\u0631\u0642\u062A\u064A",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"),
    pipelineStages: EXECUTION_PIPELINE.map((s) => s.label),
    memoryMB: Math.round(mem.rss / (1024 * 1024)),
    time: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.post("/api/analyze-note", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = req.body || {};
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return res.status(400).json({
        success: false,
        code: "MISSING_IMAGE",
        error: "\u0644\u0645 \u064A\u062A\u0645 \u0625\u0631\u0641\u0627\u0642 \u0635\u0648\u0631\u0629 \u0644\u0644\u062A\u062D\u0644\u064A\u0644. \u064A\u0631\u062C\u0649 \u0627\u062E\u062A\u064A\u0627\u0631 \u0635\u0648\u0631\u0629 \u0627\u0644\u0645\u062D\u0627\u0636\u0631\u0629 \u0623\u0648\u0644\u0627\u064B."
      });
    }
    let cleanBase64 = imageBase64.trim();
    let actualMime = mimeType;
    if (cleanBase64.includes(";base64,")) {
      const parts = cleanBase64.split(";base64,");
      cleanBase64 = parts[1] || "";
      const mimeMatch = parts[0].match(/data:(.*?)$/);
      if (mimeMatch && mimeMatch[1]) {
        actualMime = mimeMatch[1];
      }
    }
    if (!cleanBase64 || cleanBase64.length < 50) {
      return res.status(400).json({
        success: false,
        code: "EMPTY_IMAGE",
        error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0635\u0648\u0631\u0629 \u0627\u0644\u0645\u0631\u0641\u0648\u0639\u0629 \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629 \u0623\u0648 \u062A\u0627\u0644\u0641\u0629. \u064A\u0631\u062C\u0649 \u0627\u062E\u062A\u064A\u0627\u0631 \u0635\u0648\u0631\u0629 \u0623\u062E\u0631\u0649."
      });
    }
    const ai = getGenAI();
    const promptText = `
\u0623\u0646\u062A \u062E\u0628\u064A\u0631 \u0623\u0643\u0627\u062F\u064A\u0645\u064A \u0648\u0645\u0633\u0627\u0639\u062F \u062F\u0631\u0627\u0633\u064A \u0645\u062A\u062E\u0635\u0635 \u0641\u064A \u062A\u062D\u0648\u064A\u0644 \u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0627\u0644\u0645\u062D\u0627\u0636\u0631\u0627\u062A \u0627\u0644\u0645\u0643\u062A\u0648\u0628\u0629 \u0628\u062E\u0637 \u0627\u0644\u064A\u062F \u0648\u0627\u0644\u0645\u0637\u0628\u0648\u0639\u0629 \u0625\u0644\u0649 \u0645\u0648\u0627\u062F \u062F\u0631\u0627\u0633\u064A\u0629 \u0631\u0642\u0645\u064A\u0629 \u0641\u0627\u0626\u0642\u0629 \u0627\u0644\u062A\u0646\u0638\u064A\u0645 \u0648\u0627\u0644\u062F\u0642\u0629 (\u062A\u0637\u0628\u064A\u0642 \u0648\u0631\u0642\u062A\u064A - Wara2ty).

\u0627\u0644\u0645\u0647\u0645\u0629:
1. \u0627\u0642\u0631\u0623 \u0627\u0644\u0635\u0648\u0631\u0629 \u0627\u0644\u0645\u0631\u0641\u0642\u0629 \u0628\u062A\u0631\u0643\u064A\u0632 \u0641\u0627\u0626\u0642 (Computer Vision & OCR)\u060C \u0633\u0648\u0627\u0621 \u0643\u0627\u0646\u062A \u0628\u062E\u0637 \u0627\u0644\u064A\u062F \u0623\u0648 \u0645\u0637\u0628\u0648\u0639\u0629\u060C \u0648\u062D\u0627\u0641\u0638 \u0639\u0644\u0649 \u0627\u0644\u0639\u0646\u0627\u0648\u064A\u0646\u060C \u0627\u0644\u0641\u0642\u0631\u0627\u062A\u060C \u0627\u0644\u0642\u0648\u0627\u0626\u0645\u060C \u0648\u0627\u0644\u0645\u0639\u0627\u062F\u0644\u0627\u062A \u0648\u0627\u0644\u062C\u062F\u0627\u0648\u0644 \u0625\u0646 \u0648\u062C\u062F\u062A.
2. \u0627\u0643\u062A\u0634\u0641 \u0644\u063A\u0629 \u0627\u0644\u0645\u0635\u062F\u0631 \u0628\u062F\u0642\u0629 (\u062E\u0627\u0635\u0629 \u0627\u0644\u062A\u0631\u0643\u064A\u0629 T\xFCrk\xE7e\u060C \u0623\u0648 \u0627\u0644\u0639\u0631\u0628\u064A\u0629\u060C \u0623\u0648 \u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629\u060C \u0623\u0648 \u062E\u0644\u064A\u0637).
3. \u0644\u0627 \u062A\u062E\u062A\u0644\u0642 \u0643\u0644\u0645\u0627\u062A \u063A\u064A\u0631 \u0645\u0642\u0631\u0648\u0621\u0629 \u0623\u0648 \u0645\u0637\u0645\u0648\u0633\u0629 \u0625\u0637\u0644\u0627\u0642\u0627\u064B! \u0625\u0630\u0627 \u0648\u064F\u062C\u062F\u062A \u0643\u0644\u0645\u0629 \u063A\u064A\u0631 \u0648\u0627\u0636\u062D\u0629\u060C \u0636\u0639 \u0639\u0644\u0627\u0645\u0629 [\u063A\u064A\u0631 \u0648\u0627\u0636\u062D] \u0628\u062F\u0644\u0627\u064B \u0645\u0646\u0647\u0627 \u0648\u0623\u0636\u0641 \u0645\u0644\u0627\u062D\u0638\u0629 \u0641\u064A \u0642\u0627\u0626\u0645\u0629 uncertainSections.
4. \u0627\u0633\u062A\u062E\u0631\u062C \u0627\u0644\u0646\u0635\u0648\u0635 \u0628\u0627\u0644\u0643\u0627\u0645\u0644 (extractedText) \u0645\u0639 \u0627\u0644\u062D\u0641\u0627\u0638 \u0639\u0644\u0649 \u0627\u0644\u062A\u0646\u0633\u064A\u0642.
5. \u062A\u0631\u062C\u0645 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0643\u0627\u0645\u0644\u0627\u064B \u0625\u0644\u0649 \u0644\u063A\u0629 \u0639\u0631\u0628\u064A\u0629 \u0641\u0635\u062D\u0649 \u0623\u0643\u0627\u062F\u064A\u0645\u064A\u0629 \u0648\u0627\u0636\u062D\u0629 \u0648\u0645\u062A\u0631\u0627\u0628\u0637\u0629 (arabicTranslation)\u060C \u0645\u0639 \u0627\u0644\u062D\u0641\u0627\u0638 \u0627\u0644\u062A\u0627\u0645 \u0639\u0644\u0649 \u0627\u0644\u0645\u0639\u0646\u0649 \u0627\u0644\u0639\u0644\u0645\u064A \u0648\u0627\u0644\u0627\u0635\u0637\u0644\u0627\u062D\u064A\u060C \u062E\u0635\u0648\u0635\u0627\u064B \u0625\u0630\u0627 \u0643\u0627\u0646\u062A \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u062A\u0631\u0643\u064A\u0629 (\u0623\u0648 \u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629). \u0625\u0630\u0627 \u0643\u0627\u0646\u062A \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0623\u0635\u0644\u0647\u0627 \u0639\u0631\u0628\u064A\u0629\u060C \u0642\u062F\u0645 \u0635\u064A\u0627\u063A\u0629 \u0645\u0646\u0642\u062D\u0629 \u0648\u0645\u0646\u0638\u0645\u0629 \u0645\u0639 \u0625\u064A\u0636\u0627\u062D \u0627\u0644\u0645\u0635\u0637\u0644\u062D\u0627\u062A.
6. \u0627\u0633\u062A\u062E\u0631\u062C \u0642\u0627\u0626\u0645\u0629 \u0628\u0623\u0647\u0645 \u0627\u0644\u0643\u0644\u0645\u0627\u062A \u0648\u0627\u0644\u0645\u0635\u0637\u0644\u062D\u0627\u062A \u0627\u0644\u0645\u0641\u062A\u0627\u062D\u064A\u0629 (vocabulary)\u060C \u062E\u0635\u0648\u0635\u0627\u064B \u0627\u0644\u0643\u0644\u0645\u0627\u062A \u0627\u0644\u062A\u0631\u0643\u064A\u0629/\u0627\u0644\u0623\u062C\u0646\u0628\u064A\u0629 \u0627\u0644\u0647\u0627\u0645\u0629 \u0641\u064A \u0627\u0644\u0645\u062D\u0627\u0636\u0631\u0629 \u0645\u0639 \u0645\u0639\u0646\u0627\u0647\u0627 \u0627\u0644\u0639\u0631\u0628\u064A \u0627\u0644\u062F\u0642\u064A\u0642 \u0648\u0633\u064A\u0627\u0642\u0647\u0627 \u0641\u064A \u0627\u0644\u062F\u0631\u0633 \u0644\u062A\u0633\u0647\u064A\u0644 \u0627\u0644\u062D\u0641\u0638.
7. \u0635\u0645\u0651\u0645 \u0645\u0644\u062E\u0635\u0627\u064B \u062F\u0631\u0627\u0633\u064A\u0627\u064B \u0634\u0627\u0645\u0644\u0627\u064B (summary) \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0639\u0646\u0648\u0627\u0646 \u0648\u0627\u0636\u062D (title)\u060C \u0646\u0628\u0630\u0629 \u0645\u0631\u0643\u0632\u0629 (overview)\u060C \u0646\u0642\u0627\u0637 \u0631\u0626\u064A\u0633\u064A\u0629 (keyPoints)\u060C \u0648\u0646\u0635\u064A\u062D\u0629 \u062F\u0631\u0627\u0633\u064A\u0629/\u0627\u0645\u062A\u062D\u0627\u0646\u064A\u0629 \u0645\u0641\u064A\u062F\u0629 (examTip).
8. \u0623\u0646\u0634\u0626 \u0627\u062E\u062A\u0628\u0627\u0631\u0627\u064B \u062A\u062F\u0631\u064A\u0628\u064A\u0627\u064B \u062A\u0641\u0627\u0639\u0644\u064A\u0627\u064B \u0645\u0646 5 \u0623\u0633\u0626\u0644\u0629 \u0627\u062E\u062A\u064A\u0627\u0631 \u0645\u0646 \u0645\u062A\u0639\u062F\u062F (quiz) \u0645\u0628\u0646\u064A\u0629 \u062D\u0635\u0631\u0627\u064B \u0648\u0645\u0628\u0627\u0634\u0631\u0629 \u0639\u0644\u0649 \u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0641\u064A \u0627\u0644\u0635\u0648\u0631\u0629\u060C \u0645\u0639 4 \u062E\u064A\u0627\u0631\u0627\u062A \u0648\u0627\u0636\u062D\u0629 (options)\u060C \u0648\u0631\u0642\u0645 \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0635\u062D\u064A\u062D\u0629 (correctIndex \u0645\u0646 0 \u0625\u0644\u0649 3)\u060C \u0648\u062A\u0641\u0633\u064A\u0631 \u062A\u0639\u0644\u064A\u0645\u064A \u0639\u0631\u0628\u064A \u062F\u0642\u064A\u0642 (explanation).

\u0623\u0631\u062C\u0639 \u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u062D\u0635\u0631\u0627\u064B \u0628\u0635\u064A\u063A\u0629 JSON \u0645\u0637\u0627\u0628\u0642\u0629 \u062A\u0645\u0627\u0645\u0627\u064B \u0644\u0647\u0630\u0627 \u0627\u0644\u0647\u064A\u0643\u0644:
{
  "detectedLanguage": "\u0627\u0644\u062A\u0631\u0643\u064A\u0629",
  "clarityScore": "\u0648\u0627\u0636\u062D\u0629",
  "topics": ["\u0645\u0648\u0636\u0648\u0639 1", "\u0645\u0648\u0636\u0648\u0639 2"],
  "extractedText": "\u0627\u0644\u0646\u0635 \u0627\u0644\u0645\u0633\u062A\u062E\u0631\u062C \u0628\u0627\u0644\u0643\u0627\u0645\u0644...",
  "arabicTranslation": "\u0627\u0644\u062A\u0631\u062C\u0645\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u0643\u0627\u0645\u0644\u0629...",
  "summary": {
    "title": "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062F\u0631\u0633",
    "overview": "\u0646\u0628\u0630\u0629 \u0639\u0627\u0645\u0629 \u0645\u0646 \u062C\u0645\u0644\u062A\u064A\u0646...",
    "keyPoints": ["\u0646\u0642\u0637\u0629 1", "\u0646\u0642\u0637\u0629 2", "\u0646\u0642\u0637\u0629 3", "\u0646\u0642\u0637\u0629 4"],
    "examTip": "\u0646\u0635\u064A\u062D\u0629 \u0644\u0644\u0627\u0645\u062A\u062D\u0627\u0646..."
  },
  "vocabulary": [
    { "word": "Kelime", "meaning": "\u0627\u0644\u0645\u0639\u0646\u0649 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629", "context": "\u0633\u064A\u0627\u0642 \u0627\u0644\u0643\u0644\u0645\u0629" }
  ],
  "quiz": [
    {
      "id": 1,
      "question": "\u0646\u0635 \u0627\u0644\u0633\u0624\u0627\u0644 \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629\u061F",
      "options": ["\u0627\u0644\u062E\u064A\u0627\u0631 1", "\u0627\u0644\u062E\u064A\u0627\u0631 2", "\u0627\u0644\u062E\u064A\u0627\u0631 3", "\u0627\u0644\u062E\u064A\u0627\u0631 4"],
      "correctIndex": 0,
      "explanation": "\u062A\u0641\u0633\u064A\u0631 \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0635\u062D\u064A\u062D\u0629"
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
          description: "Detected language name in Arabic, e.g. \u0627\u0644\u062A\u0631\u0643\u064A\u0629, \u0627\u0644\u0639\u0631\u0628\u064A\u0629, \u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629, \u062E\u0644\u064A\u0637 \u062A\u0631\u0643\u064A \u0648\u0639\u0631\u0628\u064A"
        },
        clarityScore: {
          type: Type.STRING,
          description: "Assessment of the image/handwriting clarity in Arabic, e.g. \u0645\u0645\u062A\u0627\u0632\u0629, \u0648\u0627\u0636\u062D\u0629, \u0645\u062A\u0648\u0633\u0637\u0629, \u0628\u0647\u0627 \u0623\u062C\u0632\u0627\u0621 \u063A\u064A\u0631 \u0648\u0627\u0636\u062D\u0629"
        },
        topics: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of 2 to 5 relevant topic tags or subject classifications"
        },
        extractedText: {
          type: Type.STRING,
          description: "Exact transcribed text preserving layout, line breaks, headings, bullet points, and tables. Mark smudged or ambiguous words with [\u063A\u064A\u0631 \u0648\u0627\u0636\u062D]."
        },
        arabicTranslation: {
          type: Type.STRING,
          description: "Complete, fluent, and accurate Arabic translation preserving technical meaning and paragraph structures."
        },
        summary: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Subject or lecture title in Arabic" },
            overview: { type: Type.STRING, description: "Executive summary in 2-3 sentences in Arabic" },
            keyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Key principles, facts, formulas, or rules extracted from the note"
            },
            examTip: { type: Type.STRING, description: "Actionable study or exam tip related to this content" }
          },
          required: ["title", "overview", "keyPoints", "examTip"]
        },
        vocabulary: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING, description: "Original word or term (e.g., Turkish keyword or technical term)" },
              meaning: { type: Type.STRING, description: "Exact Arabic meaning and definition" },
              context: { type: Type.STRING, description: "Brief context or example sentence showing usage" }
            },
            required: ["word", "meaning"]
          },
          description: "Key academic words and technical terms extracted from the text"
        },
        quiz: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER, description: "Question index 1 to 5" },
              question: { type: Type.STRING, description: "Question stem in Arabic strictly testing material from the image" },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Four plausible answer choices in Arabic"
              },
              correctIndex: { type: Type.INTEGER, description: "0-based index of the correct choice (0, 1, 2, or 3)" },
              explanation: { type: Type.STRING, description: "Arabic educational explanation of the correct answer" }
            },
            required: ["id", "question", "options", "correctIndex", "explanation"]
          },
          description: "Exactly 5 multiple-choice questions based strictly on the uploaded note"
        },
        uncertainSections: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Any ambiguous or smudged sections noted during transcription"
        }
      },
      required: [
        "detectedLanguage",
        "clarityScore",
        "topics",
        "extractedText",
        "arabicTranslation",
        "summary",
        "vocabulary",
        "quiz"
      ]
    };
    const imagePart = {
      inlineData: {
        mimeType: actualMime,
        data: cleanBase64
      }
    };
    const textPart = {
      text: promptText
    };
    const { response, modelUsed } = await executeGeminiWithResilience(
      ai,
      { parts: [imagePart, textPart] },
      responseSchema
    );
    const rawText = response.text || "";
    const rawParsed = safeParseJson(rawText);
    const normalizedData = {
      detectedLanguage: rawParsed?.detectedLanguage || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F",
      clarityScore: rawParsed?.clarityScore || "\u0648\u0627\u0636\u062D\u0629",
      topics: Array.isArray(rawParsed?.topics) ? rawParsed.topics.map(String) : [],
      extractedText: rawParsed?.extractedText || "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0646\u0635 \u0648\u0627\u0636\u062D \u0641\u064A \u0627\u0644\u0635\u0648\u0631\u0629.",
      arabicTranslation: rawParsed?.arabicTranslation || rawParsed?.extractedText || "",
      summary: {
        title: rawParsed?.summary?.title || "\u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u062D\u0627\u0636\u0631\u0629 \u0627\u0644\u062F\u0631\u0627\u0633\u064A\u0629",
        overview: rawParsed?.summary?.overview || "\u062A\u0645 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0648\u062A\u062D\u0644\u064A\u0644 \u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0645\u062D\u0627\u0636\u0631\u0629 \u0628\u0646\u062C\u0627\u062D.",
        keyPoints: Array.isArray(rawParsed?.summary?.keyPoints) ? rawParsed.summary.keyPoints.map(String) : [],
        examTip: rawParsed?.summary?.examTip || "\u0631\u0627\u062C\u0639 \u0627\u0644\u0645\u0635\u0637\u0644\u062D\u0627\u062A \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 \u0648\u0627\u0644\u0646\u0642\u0627\u0637 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629 \u0642\u0628\u0644 \u0627\u0644\u0627\u062E\u062A\u0628\u0627\u0631."
      },
      vocabulary: Array.isArray(rawParsed?.vocabulary) ? rawParsed.vocabulary.map((v) => ({
        word: String(v?.word || ""),
        meaning: String(v?.meaning || ""),
        context: v?.context ? String(v.context) : void 0
      })) : [],
      quiz: Array.isArray(rawParsed?.quiz) ? rawParsed.quiz.slice(0, 5).map((q, idx) => ({
        id: idx + 1,
        question: String(q?.question || `\u0633\u0624\u0627\u0644 ${idx + 1}`),
        options: Array.isArray(q?.options) && q.options.length >= 2 ? q.options.slice(0, 4).map(String) : ["\u0627\u0644\u062E\u064A\u0627\u0631 \u0627\u0644\u0623\u0648\u0644", "\u0627\u0644\u062E\u064A\u0627\u0631 \u0627\u0644\u062B\u0627\u0646\u064A", "\u0627\u0644\u062E\u064A\u0627\u0631 \u0627\u0644\u062B\u0627\u0644\u062B", "\u0627\u0644\u062E\u064A\u0627\u0631 \u0627\u0644\u0631\u0627\u0628\u0639"],
        correctIndex: typeof q?.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex <= 3 ? q.correctIndex : 0,
        explanation: String(q?.explanation || "\u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0645\u0633\u062A\u062E\u0631\u062C\u0629 \u0645\u0646 \u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0645\u062D\u0627\u0636\u0631\u0629.")
      })) : [],
      uncertainSections: Array.isArray(rawParsed?.uncertainSections) ? rawParsed.uncertainSections.map(String) : []
    };
    return res.json({
      success: true,
      modelUsed,
      data: normalizedData
    });
  } catch (error) {
    console.error("Error analyzing image note:", error);
    const translated = translateErrorToArabic(error);
    return res.status(translated.status).json({
      success: false,
      code: translated.code,
      retryable: translated.retryable,
      error: translated.message
    });
  }
});
app.post("/api/generate-quiz", async (req, res) => {
  try {
    const { lectureText, lectureTitle, summary } = req.body || {};
    if (!lectureText && !summary) {
      return res.status(400).json({
        success: false,
        code: "MISSING_LECTURE_CONTENT",
        error: "\u0646\u0635 \u0627\u0644\u0645\u062D\u0627\u0636\u0631\u0629 \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631 \u0644\u062A\u0648\u0644\u064A\u062F \u0627\u0644\u0623\u0633\u0626\u0644\u0629."
      });
    }
    const ai = getGenAI();
    const prompt = `
\u0623\u0646\u062A \u062E\u0628\u064A\u0631 \u0623\u0643\u0627\u062F\u064A\u0645\u064A \u0648\u0648\u0627\u0636\u0639 \u0627\u0645\u062A\u062D\u0627\u0646\u0627\u062A \u062C\u0627\u0645\u0639\u064A\u0629 \u0641\u064A \u062A\u0637\u0628\u064A\u0642 "\u0648\u0631\u0642\u062A\u064A \u2013 Wara2ty".
\u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u0645\u0646\u0643:
\u0628\u0646\u0627\u0621\u064B \u062D\u0635\u0631\u064A\u0627\u064B \u0648\u0645\u0628\u0627\u0634\u0631\u0629 \u0639\u0644\u0649 \u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0645\u062D\u0627\u0636\u0631\u0629 \u0648\u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0627\u0644\u062F\u0631\u0627\u0633\u064A\u0629 \u0627\u0644\u0645\u0631\u0641\u0642\u0629 \u0623\u062F\u0646\u0627\u0647\u060C \u0642\u0645 \u0628\u0635\u064A\u0627\u063A\u0629 5 \u0623\u0633\u0626\u0644\u0629 \u0627\u062E\u062A\u064A\u0627\u0631 \u0645\u0646 \u0645\u062A\u0639\u062F\u062F (MCQ) \u062C\u062F\u064A\u062F\u0629 \u0648\u0645\u062E\u062A\u0644\u0641\u0629 \u0644\u0642\u064A\u0627\u0633 \u0627\u0633\u062A\u064A\u0639\u0627\u0628 \u0627\u0644\u0637\u0627\u0644\u0628 \u0628\u062F\u0642\u0629.

\u0627\u0644\u0634\u0631\u0648\u0637 \u0627\u0644\u0625\u0644\u0632\u0627\u0645\u064A\u0629:
1. \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0645\u0628\u0646\u064A\u0629 100% \u0639\u0644\u0649 \u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0645\u062D\u0627\u0636\u0631\u0629 \u0648\u0644\u0627 \u062A\u0639\u062A\u0645\u062F \u0639\u0644\u0649 \u0623\u064A \u0627\u0641\u062A\u0631\u0627\u0636\u0627\u062A \u062E\u0627\u0631\u062C\u064A\u0629.
2. \u0644\u0643\u0644 \u0633\u0624\u0627\u0644 4 \u062E\u064A\u0627\u0631\u0627\u062A \u062D\u0635\u0631\u064A\u0629 \u0648\u0648\u0627\u0636\u062D\u0629 (\u0623\u060C \u0628\u060C \u062C\u060C \u062F).
3. \u062E\u064A\u0627\u0631 \u0648\u0627\u062D\u062F \u0641\u0642\u0637 \u0635\u062D\u064A\u062D \u0628\u062F\u0642\u0629 (\u0631\u0642\u0645 \u0627\u0644\u0641\u0647\u0631\u0633 correctIndex \u0645\u0646 0 \u0625\u0644\u0649 3).
4. \u0627\u0643\u062A\u0628 \u0634\u0631\u062D\u0627\u064B \u0648\u062A\u0641\u0633\u064A\u0631\u0627\u064B \u062A\u0639\u0644\u064A\u0645\u064A\u0627\u064B \u0648\u0627\u0636\u062D\u0627\u064B \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0644\u0643\u0644 \u0633\u0624\u0627\u0644 \u064A\u0648\u0636\u062D \u0644\u0645\u0627\u0630\u0627 \u0647\u0630\u0627 \u0627\u0644\u062E\u064A\u0627\u0631 \u0647\u0648 \u0627\u0644\u0635\u062D\u064A\u062D.
5. \u0625\u0630\u0627 \u0643\u0627\u0646\u062A \u0627\u0644\u0645\u062D\u0627\u0636\u0631\u0629 \u062A\u0631\u0643\u064A\u0629\u060C \u064A\u0645\u0643\u0646\u0643 \u0635\u064A\u0627\u063A\u0629 \u0623\u0633\u0626\u0644\u0629 \u062A\u062E\u062A\u0628\u0631 \u0641\u0647\u0645 \u0627\u0644\u0642\u0648\u0627\u0639\u062F \u0623\u0648 \u0645\u0639\u0627\u0646\u064A \u0627\u0644\u0643\u0644\u0645\u0627\u062A \u0623\u0648 \u0627\u0644\u0645\u0641\u0627\u0647\u064A\u0645 \u0627\u0644\u0639\u0644\u0645\u064A\u0629 \u0627\u0644\u0648\u0627\u0631\u062F\u0629 \u0641\u064A\u0647\u0627.

\u0623\u0631\u062C\u0639 \u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u062D\u0635\u0631\u0627\u064B \u0643\u0645\u0635\u0641\u0648\u0641\u0629 JSON (Array of 5 objects) \u0628\u0647\u0630\u0627 \u0627\u0644\u0634\u0643\u0644:
[
  {
    "id": 1,
    "question": "\u0646\u0635 \u0627\u0644\u0633\u0624\u0627\u0644 \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629\u061F",
    "options": ["\u0627\u0644\u062E\u064A\u0627\u0631 1", "\u0627\u0644\u062E\u064A\u0627\u0631 2", "\u0627\u0644\u062E\u064A\u0627\u0631 3", "\u0627\u0644\u062E\u064A\u0627\u0631 4"],
    "correctIndex": 0,
    "explanation": "\u062A\u0641\u0633\u064A\u0631 \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0635\u062D\u064A\u062D\u0629"
  }
]

\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0645\u062D\u0627\u0636\u0631\u0629: ${lectureTitle || ""}
\u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u062D\u0627\u0636\u0631\u0629: ${typeof summary === "object" ? JSON.stringify(summary) : summary || ""}

\u0646\u0635 \u0627\u0644\u0645\u062D\u0627\u0636\u0631\u0629:
${String(lectureText || "").substring(0, 15e3)}
`;
    const quizSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER, description: "Question index from 1 to 5" },
          question: { type: Type.STRING, description: "Question text in Arabic" },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Exactly 4 distinct choices in Arabic"
          },
          correctIndex: { type: Type.INTEGER, description: "0-based index of correct option (0, 1, 2, or 3)" },
          explanation: { type: Type.STRING, description: "Clear pedagogical explanation in Arabic" }
        },
        required: ["id", "question", "options", "correctIndex", "explanation"]
      }
    };
    const { response, modelUsed } = await executeGeminiWithResilience(ai, prompt, quizSchema);
    const rawText = response.text || "[]";
    const parsedPayload = safeParseJson(rawText);
    const rawQuestions = Array.isArray(parsedPayload) ? parsedPayload : Array.isArray(parsedPayload?.questions) ? parsedPayload.questions : Array.isArray(parsedPayload?.quiz) ? parsedPayload.quiz : [];
    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      throw new Error("\u0644\u0645 \u064A\u0631\u062C\u0639 \u0627\u0644\u0646\u0645\u0648\u0630\u062C \u0642\u0627\u0626\u0645\u0629 \u0623\u0633\u0626\u0644\u0629 \u0635\u0627\u0644\u062D\u0629.");
    }
    const normalizedQuestions = rawQuestions.slice(0, 5).map((q, idx) => ({
      id: idx + 1,
      question: String(q?.question || `\u0633\u0624\u0627\u0644 ${idx + 1}`),
      options: Array.isArray(q?.options) && q.options.length >= 2 ? q.options.slice(0, 4).map(String) : ["\u0627\u0644\u062E\u064A\u0627\u0631 \u0627\u0644\u0623\u0648\u0644", "\u0627\u0644\u062E\u064A\u0627\u0631 \u0627\u0644\u062B\u0627\u0646\u064A", "\u0627\u0644\u062E\u064A\u0627\u0631 \u0627\u0644\u062B\u0627\u0644\u062B", "\u0627\u0644\u062E\u064A\u0627\u0631 \u0627\u0644\u0631\u0627\u0628\u0639"],
      correctIndex: typeof q?.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex <= 3 ? q.correctIndex : 0,
      explanation: String(q?.explanation || "\u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0635\u062D\u064A\u062D\u0629 \u0645\u0633\u062A\u0645\u062F\u0629 \u0645\u0646 \u0634\u0631\u062D \u0627\u0644\u0645\u062D\u0627\u0636\u0631\u0629.")
    }));
    return res.json({
      success: true,
      modelUsed,
      questions: normalizedQuestions
    });
  } catch (error) {
    console.error("Error generating quiz questions:", error);
    const translated = translateErrorToArabic(error);
    return res.status(translated.status).json({
      success: false,
      code: translated.code,
      retryable: translated.retryable,
      error: translated.message
    });
  }
});
async function startServer() {
  const distPath = path.resolve(__dirname, "dist");
  const indexHtmlPath = path.resolve(distPath, "index.html");
  const hasDist = fs.existsSync(indexHtmlPath);
  const isCloudRun = Boolean(process.env.K_SERVICE || process.env.K_REVISION);
  const isExplicitProduction = process.env.NODE_ENV === "production";
  const isProduction = isCloudRun || isExplicitProduction || hasDist && process.env.NODE_ENV !== "development";
  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
      console.log("Vite middleware mounted in development mode");
    } catch (viteErr) {
      console.warn("Could not initialize Vite middleware, falling back to static files:", viteErr);
      if (hasDist) {
        app.use(express.static(distPath));
        app.get("*", (req, res) => res.sendFile(indexHtmlPath));
      }
    }
  } else {
    if (hasDist) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(indexHtmlPath);
      });
      console.log(`Serving static production files from: ${distPath}`);
    } else {
      console.warn("Warning: dist/index.html was not found. Serving fallback page.");
      app.get("*", (req, res) => {
        res.status(200).send(`
          <!DOCTYPE html>
          <html lang="ar" dir="rtl">
            <head><meta charset="UTF-8"><title>Wara2ty \u2013 \u0648\u0631\u0642\u062A\u064A</title></head>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
              <h2>\u062A\u0637\u0628\u064A\u0642 \u0648\u0631\u0642\u062A\u064A \u2013 Wara2ty</h2>
              <p>\u0627\u0644\u062E\u0627\u062F\u0645 \u064A\u0639\u0645\u0644 \u0628\u0646\u062C\u0627\u062D \u0639\u0644\u0649 \u0627\u0644\u0645\u0646\u0641\u0630 ${PORT}. \u064A\u0631\u062C\u0649 \u062A\u0634\u063A\u064A\u0644 \u0628\u0646\u0627\u0621 \u0648\u0627\u062C\u0647\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 (npm run build).</p>
            </body>
          </html>
        `);
      });
    }
  }
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Wara2ty server is running at http://0.0.0.0:${PORT} [mode: ${isProduction ? "production" : "development"}]`);
  });
  server.keepAliveTimeout = 12e4;
  server.headersTimeout = 125e3;
  process.on("SIGTERM", () => {
    console.log("SIGTERM signal received: closing HTTP server gracefully");
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });
  });
  process.on("SIGINT", () => {
    console.log("SIGINT signal received: closing HTTP server gracefully");
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
