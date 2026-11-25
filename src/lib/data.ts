import "server-only";
import { db } from "./supabase";

export type Department = { id: number; name: string; vehicle_type: string; description: string | null };
export type Vehicle = { id: number; car_no: string; vehicle_type: string; model: string | null; built_year: number | null; department_id: number };
export type Part = { id: number; name: string; device: string; replace_cycle_months: number | null };
export type ReportPart = { qty: number; parts: { id: number; name: string } | null };
export type Report = {
  id: number;
  report_no: string;
  department_id: number;
  vehicle_id: number;
  occurred_at: string;
  found_place: string | null;
  found_stage: string | null;
  writer: string | null;
  device: string;
  title: string;
  symptom: string;
  symptom_std: string | null;
  cause: string | null;
  action: string | null;
  work_hours: number | null;
  test_result: string | null;
  service_impact: string | null;
  prevention: string | null;
  note: string | null;
  status: string;
  created_at: string;
  departments: { id: number; name: string } | null;
  vehicles: { id: number; car_no: string; vehicle_type: string } | null;
  report_parts: ReportPart[];
};

export const DEVICES = ["제동", "대차", "출입문", "냉난방", "전기", "기관", "연결기", "차체"];
export const VEHICLE_TYPES = ["전기기관차", "디젤기관차", "객차", "화차"];

const SELECT =
  "id, report_no, department_id, vehicle_id, occurred_at, found_place, found_stage, writer, device, title, symptom, symptom_std, cause, action, work_hours, test_result, service_impact, prevention, note, status, created_at, departments(id, name), vehicles(id, car_no, vehicle_type), report_parts(qty, parts(id, name))";

export async function getRefs() {
  const [d, v, p] = await Promise.all([
    db().from("departments").select("*").order("id"),
    db().from("vehicles").select("*").order("car_no"),
    db().from("parts").select("*").order("device").order("name"),
  ]);
  if (d.error) throw d.error;
  if (v.error) throw v.error;
  if (p.error) throw p.error;
  return { departments: d.data as Department[], vehicles: v.data as Vehicle[], parts: p.data as Part[] };
}

export async function getAllReports(): Promise<Report[]> {
  const { data, error } = await db().from("reports").select(SELECT).order("occurred_at", { ascending: false });
  if (error) throw error;
  return data as unknown as Report[];
}

export async function getReport(id: number): Promise<Report | null> {
  const { data, error } = await db().from("reports").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data as unknown as Report | null;
}

export type Filters = { dept?: string; vtype?: string; vehicle?: string; device?: string; part?: string; q?: string; from?: string; to?: string };

export function applyFilters(reports: Report[], f: Filters) {
  const q = (f.q || "").trim();
  return reports.filter((r) => {
    if (f.dept && String(r.department_id) !== f.dept) return false;
    if (f.vtype && r.vehicles?.vehicle_type !== f.vtype) return false;
    if (f.vehicle && String(r.vehicle_id) !== f.vehicle) return false;
    if (f.device && r.device !== f.device) return false;
    if (f.part && !r.report_parts.some((rp) => String(rp.parts?.id) === f.part)) return false;
    if (f.from && r.occurred_at < f.from) return false;
    if (f.to && r.occurred_at > f.to) return false;
    if (q) {
      const hay = [r.report_no, r.title, r.symptom, r.symptom_std, r.cause, r.action, r.vehicles?.car_no].join(" ");
      if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  });
}

/** Text used for embeddings: what the failure looked like and what fixed it. */
export function reportText(r: Pick<Report, "title" | "symptom" | "symptom_std" | "cause" | "action" | "device">) {
  return [`장치: ${r.device}`, `제목: ${r.title}`, `고장 현상: ${r.symptom}`, `증상 요약: ${r.symptom_std ?? ""}`, `원인: ${r.cause ?? ""}`, `조치: ${r.action ?? ""}`].join("\n");
}

// ---- keyword fallback (no AI key) ----
const SYN: string[][] = [
  ["제동", "브레이크", "정지", "멈출", "멈춤", "정차", "서지", "완해"],
  ["밀림", "지나", "넘어", "길어", "안 서", "저하", "약해", "약함"],
  ["소음", "소리", "덜컹", "쿵", "끼익", "쉭", "쇳소리", "고음", "충격"],
  ["진동", "흔들", "떨림", "요동"],
  ["가속", "속도", "출력", "힘", "견인", "역행", "노치"],
  ["출입문", "문", "도어"],
  ["닫힘", "닫히", "닫혀", "재개방", "다시 열", "열림", "안 열"],
  ["냉방", "에어컨", "시원", "덥", "더워", "더운", "냉매"],
  ["난방", "히터", "춥", "추워", "차가"],
  ["과열", "온도", "뜨거", "고온", "발열", "경고", "경보"],
  ["엔진", "기관", "시동", "크랭킹", "매연", "연기", "터보"],
  ["전원", "조명", "실내등", "깜빡", "전기", "차단", "트립", "팬터", "아크", "VCB"],
  ["냄새", "타는", "탄 냄새"],
  ["대차", "차체", "바퀴", "차륜", "밑", "아래", "하부", "축상", "베어링", "댐퍼", "스프링"],
  ["연결", "연결기", "유격", "완충", "입환", "해방"],
  ["누수", "빗물", "물이", "해치", "누설", "새는", "공기"],
  ["오일", "윤활", "압력"],
];
const concepts = (t: string) => {
  const s = new Set<number>();
  SYN.forEach((g, i) => g.some((w) => t.includes(w)) && s.add(i));
  return s;
};
const bigrams = (t: string) => {
  t = t.replace(/\s/g, "");
  const s = new Set<string>();
  for (let i = 0; i < t.length - 1; i++) s.add(t.slice(i, i + 2));
  return s;
};
export function keywordRank(q: string, pool: Report[], n = 10) {
  const qc = concepts(q), qb = bigrams(q);
  return pool
    .map((r) => {
      const t = [r.title, r.symptom, r.symptom_std, r.device].join(" ");
      const cc = concepts(t), cb = bigrams(t);
      const ci = [...qc].filter((x) => cc.has(x)).length, cu = new Set([...qc, ...cc]).size || 1;
      const bi = [...qb].filter((x) => cb.has(x)).length, bu = new Set([...qb, ...cb]).size || 1;
      const shared = [...qc].filter((x) => cc.has(x)).map((i) => SYN[i][0]);
      return { report: r, score: Math.round((0.7 * ci) / cu * 100 + (0.3 * bi) / bu * 100), reason: shared.length ? `'${shared.join("', '")}' 관련 증상이 겹침` : "표현 일부가 비슷함" };
    })
    .filter((x) => x.score > 8)
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

export function fmtHours(h: number | null) {
  return h == null ? "-" : `${Number(h)}시간`;
}
