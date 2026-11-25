import { generateJSON, hasAI, MODELS } from "@/lib/gemini";
import { getAllReports } from "@/lib/data";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!hasAI()) return Response.json({ error: "AI 키가 설정되지 않았습니다." }, { status: 400 });
  const { vehicleId } = await req.json().catch(() => ({}));
  const reports = (await getAllReports()).filter((r) => r.vehicle_id === Number(vehicleId));
  if (!reports.length) return Response.json({ error: "보고서가 없습니다." }, { status: 404 });
  const list = reports.map((r) => `${r.occurred_at} ${r.report_no} | ${r.device} | ${r.symptom_std} | 원인: ${r.cause} | 조치: ${r.action} | ${r.work_hours}시간`).join("\n");
  try {
    const out = await generateJSON<{ summary: string }>(
      `너는 철도 차량 정비 보조 AI다. 차량 ${reports[0].vehicles?.car_no}(${reports[0].vehicles?.vehicle_type})의 고장 조치 보고서 목록만 근거로 이력을 요약한다.
3~5줄 개조식: 주요 고장 장치, 반복된 고장(있으면 날짜와 함께), 다음 검수 때 우선 확인할 점(제안). 목록에 없는 사실은 쓰지 않는다.

${list}

JSON 형식: {"summary":"- 줄1\\n- 줄2"}`,
      MODELS.draft,
    );
    return Response.json({ summary: out.summary });
  } catch (e) {
    return Response.json({ error: `요약 실패: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
  }
}
