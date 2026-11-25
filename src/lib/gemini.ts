import "server-only";
import { GoogleGenAI } from "@google/genai";

export const MODELS = {
  draft: process.env.GEMINI_MODEL_DRAFT || "gemini-3.5-flash",
  fast: process.env.GEMINI_MODEL_FAST || "gemini-3.1-flash-lite",
  embed: process.env.GEMINI_MODEL_EMBED || "gemini-embedding-001",
};
export const EMBED_DIM = 768;

let ai: GoogleGenAI | null = null;

export function hasAI() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function client() {
  if (!hasAI()) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  if (!ai) ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  return ai;
}

/** Text -> 768-dim vector. taskType: RETRIEVAL_DOCUMENT for stored reports, RETRIEVAL_QUERY for searches. */
export async function embed(texts: string[], taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY") {
  const res = await client().models.embedContent({
    model: MODELS.embed,
    contents: texts,
    config: { outputDimensionality: EMBED_DIM, taskType },
  });
  return (res.embeddings || []).map((e) => e.values || []);
}

/** Ask Gemini for JSON and parse it. */
export async function generateJSON<T>(prompt: string, model: string = MODELS.fast): Promise<T> {
  const res = await client().models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: "application/json", temperature: 0.2 },
  });
  const text = res.text || "";
  const m = text.match(/[\[{][\s\S]*[\]}]/);
  return JSON.parse(m ? m[0] : text) as T;
}
