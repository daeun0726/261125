import "server-only";
import { db } from "./supabase";
import { embed, generateJSON, hasAI, MODELS } from "./gemini";
import { getAllReports, keywordRank, type Report } from "./data";

export type Match = { report: Report; score: number; reason: string };

/** Reports most similar to a stored report, using its saved vector when there is one. */
export async function similarToReport(r: Report, n = 3): Promise<Match[]> {
  const all = await getAllReports();
  const { data } = await db().from("reports").select("embedding").eq("id", r.id).maybeSingle();
  if (data?.embedding) {
    const { data: m, error } = await db().rpc("match_reports", { query_embedding: data.embedding, match_count: n + 1 });
    if (!error && m) {
      return (m as { id: number; similarity: number }[])
        .filter((x) => x.id !== r.id)
        .slice(0, n)
        .map((x) => ({ report: all.find((a) => a.id === x.id)!, score: Math.round(x.similarity * 100), reason: "증상·원인·조치 내용의 의미가 비슷함 (임베딩)" }))
        .filter((x) => x.report);
    }
  }
  return keywordRank([r.title, r.symptom, r.symptom_std].join(" "), all.filter((a) => a.id !== r.id), n);
}

export type SearchResult = { mode: "ai" | "keyword"; matches: Match[]; checklist: string[]; note?: string };

/** Symptom search: vector candidates -> Gemini picks top 3 with reasons; falls back to keyword ranking. */
export async function searchSymptom(q: string, vtype?: string): Promise<SearchResult> {
  const all = await getAllReports();
  const pool = vtype ? all.filter((r) => r.vehicles?.vehicle_type === vtype) : all;
  if (!hasAI()) return { mode: "keyword", matches: keywordRank(q, pool, 3), checklist: [], note: "AI 키가 없어 키워드 기반으로 찾았습니다." };

  let candidates: Report[] = [];
  let note: string | undefined;
  try {
    const [vec] = await embed([q], "RETRIEVAL_QUERY");
    const { data, error } = await db().rpc("match_reports", { query_embedding: JSON.stringify(vec), match_count: 15 });
    if (error) throw error;
    const ids = (data as { id: number }[]).map((x) => x.id);
    candidates = ids.map((id) => pool.find((r) => r.id === id)).filter(Boolean).slice(0, 10) as Report[];
  } catch (e) {
    note = "임베딩 검색에 실패해 키워드로 후보를 골랐습니다.";
    console.error(e);
  }
  if (candidates.length < 3) {
    const extra = keywordRank(q, pool, 10).map((m) => m.report).filter((r) => !candidates.includes(r));
    candidates = [...candidates, ...extra].slice(0, 10);
    if (!note && !candidates.length) note = "검색용 벡터가 아직 없습니다. 대시보드에서 '검색용 벡터 만들기'를 눌러 주세요.";
  }
  if (!candidates.length) return { mode: "ai", matches: [], checklist: [], note };

  const list = candidates.map((r) => `${r.report_no} | ${r.vehicles?.vehicle_type} | ${r.device} | 현상: ${r.symptom} | 요약: ${r.symptom_std} | 원인: ${r.cause} | 조치: ${r.action}`).join("\n");
  try {
    const out = await generateJSON<{ matches: { report_no: string; score: number; reason: string }[]; checklist: string[] }>(
      `너는 철도 차량 정비 보조 AI다. 아래 '후보 보고서'만 근거로, 정비원이 입력한 증상과 뜻이 가장 비슷한 보고서를 최대 3건 고른다.
표현이 달라도 같은 현상이면 비슷한 것으로 본다. 후보에 없는 보고서 번호는 절대 만들지 않는다. 비슷한 것이 없으면 빈 배열.
고른 보고서를 근거로 정비원이 먼저 확인할 점검 순서 3~5단계를 짧게 제안한다.

[입력 증상]
${q}

[후보 보고서]
${list}

JSON 형식: {"matches":[{"report_no":"R-0000-000","score":0~100 정수,"reason":"비슷한 이유 한 문장"}],"checklist":["단계"]}`,
      MODELS.fast,
    );
    const matches = (out.matches || [])
      .map((m) => ({ report: candidates.find((r) => r.report_no === m.report_no)!, score: Math.max(0, Math.min(100, Math.round(m.score))), reason: m.reason }))
      .filter((m) => m.report)
      .slice(0, 3);
    return { mode: "ai", matches, checklist: (out.checklist || []).slice(0, 5), note };
  } catch (e) {
    console.error(e);
    return { mode: "keyword", matches: keywordRank(q, pool, 3), checklist: [], note: "AI 응답에 실패해 키워드 기반으로 찾았습니다." };
  }
}
