import { db } from "@/lib/supabase";
import { embed, hasAI } from "@/lib/gemini";
import { reportText } from "@/lib/data";

export const maxDuration = 60;

export async function POST() {
  if (!hasAI()) return Response.json({ error: "GEMINI_API_KEY가 없습니다." }, { status: 400 });
  const { data, error } = await db().from("reports").select("id, title, symptom, symptom_std, cause, action, device").is("embedding", null).limit(100);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  let updated = 0;
  try {
    for (let i = 0; i < data.length; i += 20) {
      const batch = data.slice(i, i + 20);
      const vecs = await embed(batch.map(reportText), "RETRIEVAL_DOCUMENT");
      for (let j = 0; j < batch.length; j++) {
        if (!vecs[j]?.length) continue;
        const { error: e } = await db().from("reports").update({ embedding: JSON.stringify(vecs[j]) }).eq("id", batch[j].id);
        if (!e) updated++;
      }
    }
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e), updated }, { status: 500 });
  }
  const { count } = await db().from("reports").select("id", { count: "exact", head: true }).is("embedding", null);
  return Response.json({ updated, remaining: count ?? 0 });
}
