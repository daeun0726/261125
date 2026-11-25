import Link from "next/link";
import type { Report } from "@/lib/data";
import { fmtHours } from "@/lib/data";

export type SheetData = Pick<Report, "report_no" | "occurred_at" | "found_place" | "found_stage" | "writer" | "device" | "title" | "symptom" | "symptom_std" | "cause" | "action" | "work_hours" | "test_result" | "service_impact" | "prevention" | "note" | "status"> & {
  deptName?: string;
  carNo?: string;
  vehicleType?: string;
  vehicleId?: number;
  deptId?: number;
  parts?: { id?: number; name: string; qty: number }[];
};

export function sheetText(d: SheetData) {
  const parts = d.parts?.length ? d.parts.map((p) => `${p.name} ${p.qty}개`).join(", ") : "없음";
  return [
    "[차량 고장 조치 보고서]",
    `보고서 번호: ${d.report_no}   상태: ${d.status}`,
    `제목: ${d.title}`,
    `작성 부서: ${d.deptName ?? "-"}   작성자: ${d.writer ?? "-"}`,
    `차종/차량번호: ${d.vehicleType ?? "-"} / ${d.carNo ?? "-"}`,
    `발생일: ${d.occurred_at}   발견 장소: ${d.found_place ?? "-"}   발견 경위: ${d.found_stage ?? "-"}`,
    `장치 분류: ${d.device}   운행 영향: ${d.service_impact ?? "-"}`,
    "",
    `1. 고장 현상\n${d.symptom}${d.symptom_std ? ` (요약: ${d.symptom_std})` : ""}`,
    `2. 원인 분석\n${d.cause ?? "-"}`,
    `3. 조치 내용\n${d.action ?? "-"}\n교체 부품: ${parts}\n작업 시간: ${fmtHours(d.work_hours)}\n조치 후 시험 결과: ${d.test_result ?? "-"}`,
    `4. 재발 방지 대책\n${d.prevention ?? "-"}`,
    `5. 비고\n${d.note ?? "-"}`,
  ].join("\n");
}

export default function ReportSheet({ d }: { d: SheetData }) {
  const parts = d.parts?.length ? d.parts : [];
  const cell = "border border-slate-200 px-3 py-2";
  const th = `${cell} w-28 bg-slate-50 text-xs font-medium text-slate-500`;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
      <div className="border-b border-slate-300 bg-slate-50 py-3 text-center text-lg font-bold tracking-[0.3em]">차량 고장 조치 보고서</div>
      <div className="px-4 py-3 text-base font-semibold">{d.title}</div>
      <table className="w-full border-collapse text-sm">
        <tbody>
          <tr>
            <th className={th}>보고서 번호</th><td className={cell}>{d.report_no} {d.status === "초안" && <span className="chip ml-1 bg-amber-100 text-amber-800">초안</span>}</td>
            <th className={th}>발생일</th><td className={cell}>{d.occurred_at}</td>
          </tr>
          <tr>
            <th className={th}>작성 부서</th><td className={cell}>{d.deptId ? <Link className="link" href={`/departments/${d.deptId}`}>{d.deptName}</Link> : d.deptName ?? "-"}</td>
            <th className={th}>작성자</th><td className={cell}>{d.writer ?? "-"}</td>
          </tr>
          <tr>
            <th className={th}>차종</th><td className={cell}>{d.vehicleType ?? "-"}</td>
            <th className={th}>차량번호</th><td className={cell}>{d.vehicleId ? <Link className="link" href={`/vehicles/${d.vehicleId}`}>{d.carNo}</Link> : d.carNo ?? "-"}</td>
          </tr>
          <tr>
            <th className={th}>발견 장소</th><td className={cell}>{d.found_place ?? "-"}</td>
            <th className={th}>발견 경위</th><td className={cell}>{d.found_stage ?? "-"}</td>
          </tr>
          <tr>
            <th className={th}>장치 분류</th><td className={cell}>{d.device}</td>
            <th className={th}>운행 영향</th><td className={cell}>{d.service_impact ?? "-"}</td>
          </tr>
        </tbody>
      </table>
      {[
        ["1. 고장 현상", `${d.symptom}${d.symptom_std ? `\n(증상 요약: ${d.symptom_std})` : ""}`],
        ["2. 원인 분석", d.cause],
        ["3. 조치 내용", d.action],
      ].map(([k, v]) => (
        <div key={k} className="border-t border-slate-200 px-4 py-3">
          <div className="mb-1 text-sm font-semibold text-[#0b3d91]">{k}</div>
          <div className="whitespace-pre-wrap text-sm">{v || "-"}</div>
        </div>
      ))}
      <div className="grid gap-2 border-t border-slate-200 px-4 py-3 text-sm md:grid-cols-3">
        <div><span className="text-slate-500">교체 부품: </span>{parts.length ? parts.map((p, i) => <span key={i}>{i > 0 && ", "}{p.id ? <Link className="link" href={`/parts/${p.id}`}>{p.name}</Link> : p.name} {p.qty}개</span>) : "없음"}</div>
        <div><span className="text-slate-500">작업 시간: </span>{fmtHours(d.work_hours)}</div>
        <div><span className="text-slate-500">조치 후 시험: </span>{d.test_result ?? "-"}</div>
      </div>
      {[
        ["4. 재발 방지 대책", d.prevention],
        ["5. 비고", d.note],
      ].map(([k, v]) => (
        <div key={k} className="border-t border-slate-200 px-4 py-3">
          <div className="mb-1 text-sm font-semibold text-[#0b3d91]">{k}</div>
          <div className="whitespace-pre-wrap text-sm">{v || "-"}</div>
        </div>
      ))}
    </div>
  );
}
