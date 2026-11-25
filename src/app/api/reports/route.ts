import { db, hasDb } from "@/lib/supabase";
import { embed, hasAI } from "@/lib/gemini";
import { reportText, DEVICES } from "@/lib/data";

export async function POST(req: Request) {
  if (!hasDb()) return Response.json({ error: "DB 환경 변수가 없습니다." }, { status: 500 });
  const b = await req.json().catch(() => null);
  if (!b) return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  if (!str(b.title) || !str(b.symptom) || !b.vehicle_id || !b.occurred_at) return Response.json({ error: "제목, 차량, 발생일, 고장 현상은 꼭 입력해 주세요." }, { status: 400 });
  const device = DEVICES.includes(b.device) ? b.device : "차체";

  const { data: v, error: ve } = await db().from("vehicles").select("id, department_id").eq("id", Number(b.vehicle_id)).maybeSingle();
  if (ve || !v) return Response.json({ error: "차량을 찾을 수 없습니다." }, { status: 400 });

  const year = String(b.occurred_at).slice(0, 4);
  const { data: last } = await db().from("reports").select("report_no").like("report_no", `R-${year}-%`).order("report_no", { ascending: false }).limit(1);
  const next = (last?.[0] ? Number(last[0].report_no.slice(7)) : 0) + 1;
  const report_no = `R-${year}-${String(next).padStart(3, "0")}`;

  const row = {
    report_no,
    department_id: v.department_id,
    vehicle_id: v.id,
    occurred_at: str(b.occurred_at, 10),
    found_place: str(b.found_place, 100) || null,
    found_stage: str(b.found_stage, 100) || null,
    writer: str(b.writer, 100) || null,
    device,
    title: str(b.title, 200),
    symptom: str(b.symptom),
    symptom_std: str(b.symptom_std, 200) || null,
    cause: str(b.cause) || null,
    action: str(b.action) || null,
    work_hours: b.work_hours === "" || b.work_hours == null || isNaN(Number(b.work_hours)) ? null : Number(b.work_hours),
    test_result: str(b.test_result, 200) || null,
    service_impact: str(b.service_impact, 200) || null,
    prevention: str(b.prevention) || null,
    note: str(b.note) || null,
    status: b.status === "초안" ? "초안" : "확정",
  };
  const { data: ins, error } = await db().from("reports").insert(row).select("id").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // parts: match by name to the parts table
  const parts: { name: string; qty: number }[] = Array.isArray(b.parts) ? b.parts : [];
  if (parts.length) {
    const { data: plist } = await db().from("parts").select("id, name");
    const rows = parts
      .map((p) => ({ part: plist?.find((x) => x.name === String(p.name).trim()), qty: Math.max(1, Number(p.qty) || 1) }))
      .filter((x) => x.part)
      .map((x) => ({ report_id: ins.id, part_id: x.part!.id, qty: x.qty }));
    const uniq = [...new Map(rows.map((r) => [r.part_id, r])).values()];
    if (uniq.length) await db().from("report_parts").insert(uniq);
  }

  // search vector (best effort)
  if (hasAI()) {
    try {
      const [vec] = await embed([reportText(row)], "RETRIEVAL_DOCUMENT");
      if (vec?.length) await db().from("reports").update({ embedding: JSON.stringify(vec) }).eq("id", ins.id);
    } catch (e) {
      console.error("embedding failed", e);
    }
  }
  return Response.json({ id: ins.id, report_no });
}
