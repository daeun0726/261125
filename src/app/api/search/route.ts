import { searchSymptom } from "@/lib/similar";
import { hasDb } from "@/lib/supabase";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!hasDb()) return Response.json({ error: "DB 환경 변수가 없습니다." }, { status: 500 });
  const { q, vtype } = await req.json().catch(() => ({}));
  if (!q || typeof q !== "string" || !q.trim()) return Response.json({ error: "증상을 입력해 주세요." }, { status: 400 });
  const res = await searchSymptom(q.trim().slice(0, 500), typeof vtype === "string" && vtype ? vtype : undefined);
  return Response.json({
    mode: res.mode,
    note: res.note,
    checklist: res.checklist,
    matches: res.matches.map((m) => ({
      id: m.report.id,
      report_no: m.report.report_no,
      title: m.report.title,
      symptom: m.report.symptom,
      cause: m.report.cause,
      action: m.report.action,
      car_no: m.report.vehicles?.car_no,
      vehicle_type: m.report.vehicles?.vehicle_type,
      dept: m.report.departments?.name,
      occurred_at: m.report.occurred_at,
      score: m.score,
      reason: m.reason,
    })),
  });
}
