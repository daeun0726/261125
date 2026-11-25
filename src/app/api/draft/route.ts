import { generateJSON, hasAI, MODELS } from "@/lib/gemini";
import { getAllReports, getRefs, keywordRank } from "@/lib/data";

export const maxDuration = 60;

type Draft = {
  title: string; device: string; symptom: string; symptom_std: string; cause: string; action: string;
  parts: { name: string; qty: number }[]; work_hours: number | null; test_result: string; service_impact: string; prevention: string; note: string;
};

export async function POST(req: Request) {
  if (!hasAI()) return Response.json({ error: "AI 키(GEMINI_API_KEY)가 설정되지 않아 초안을 만들 수 없습니다. 양식에 직접 입력해 주세요." }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const memo = String(body.memo || "").trim().slice(0, 3000);
  if (!memo) return Response.json({ error: "정비 메모를 입력해 주세요." }, { status: 400 });

  const [all, refs] = await Promise.all([getAllReports(), getRefs()]);
  const vehicle = refs.vehicles.find((v) => String(v.id) === String(body.vehicle_id));
  const pool = vehicle ? all.filter((r) => r.vehicles?.vehicle_type === vehicle.vehicle_type) : all;
  const refsUsed = keywordRank(memo, pool.length ? pool : all, 3).map((m) => m.report);
  const examples = refsUsed.map((r) => JSON.stringify({ report_no: r.report_no, title: r.title, device: r.device, symptom: r.symptom, symptom_std: r.symptom_std, cause: r.cause, action: r.action, parts: r.report_parts.map((p) => ({ name: p.parts?.name, qty: p.qty })), work_hours: r.work_hours, prevention: r.prevention })).join("\n");
  const partNames = refs.parts.map((p) => p.name).join(", ");

  const prompt = `너는 대전철도차량정비단의 '차량 고장 조치 보고서' 작성을 돕는 AI다. 정비원의 메모를 과거 보고서와 같은 항목·문체(간결한 개조식, '~함/~확인' 종결)로 정리해 보고서 초안을 만든다.
규칙:
- 메모에 없는 사실(원인, 조치, 부품, 시간)은 지어내지 않는다. 메모에 없으면 그 칸에 "(확인 필요)"라고 쓴다. work_hours를 모르면 null.
- device는 다음 중 하나: 제동, 대차, 출입문, 냉난방, 전기, 기관, 연결기, 차체.
- parts는 메모에 나온 교체 부품만. 이름은 가능하면 이 목록에서 고른다: ${partNames}
- symptom은 메모의 현상을 정리한 문장, symptom_std는 짧은 표준 증상 명사구.
- prevention은 메모와 과거 사례를 근거로 현실적인 점검 주기·확인 항목을 1~2줄 제안하고 끝에 "(제안)"을 붙인다.
- note에는 비슷한 과거 사례가 있으면 "유사 사례 R-0000-000 참고: ..." 형태로 한 줄 적는다.
- title은 "차종 장치 원인/증상 조치" 형태의 한 줄.

[기본 정보] 차량: ${vehicle ? `${vehicle.car_no} (${vehicle.vehicle_type})` : "미선택"}, 발생일: ${body.occurred_at || "미기재"}, 발견 장소: ${body.found_place || "미기재"}

[정비 메모]
${memo}

[참고용 과거 보고서]
${examples}

JSON 형식: {"title":"","device":"","symptom":"","symptom_std":"","cause":"","action":"","parts":[{"name":"","qty":1}],"work_hours":null,"test_result":"","service_impact":"","prevention":"","note":""}`;

  try {
    const d = await generateJSON<Draft>(prompt, MODELS.draft);
    return Response.json({ draft: d, refs: refsUsed.map((r) => ({ id: r.id, report_no: r.report_no, title: r.title })) });
  } catch (e) {
    return Response.json({ error: `초안 작성 실패: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
  }
}
