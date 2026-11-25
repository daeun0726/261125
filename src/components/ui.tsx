import Link from "next/link";
import type { Report } from "@/lib/data";
import { fmtHours } from "@/lib/data";

export function SetupNotice({ what }: { what: "db" | "ai" }) {
  return (
    <div className="card border-amber-300 bg-amber-50 text-sm text-amber-900">
      {what === "db" ? (
        <>
          <b>데이터베이스 설정 필요:</b> 환경 변수 <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>SUPABASE_SERVICE_ROLE_KEY</code>를 설정한 뒤 다시 배포하세요.
        </>
      ) : (
        <>
          <b>AI 키 설정 필요:</b> 환경 변수 <code>GEMINI_API_KEY</code>를 설정하면 AI 기능이 켜집니다. 지금은 키워드 기반으로 동작합니다.
        </>
      )}
    </div>
  );
}

export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
    </div>
  );
}

export function ReportTable({ reports, empty = "조건에 맞는 보고서가 없습니다." }: { reports: Report[]; empty?: string }) {
  if (!reports.length) return <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{empty}</div>;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs text-slate-500">
          <tr>
            <th className="px-3 py-2 font-medium">보고서 번호</th>
            <th className="px-3 py-2 font-medium">발생일</th>
            <th className="px-3 py-2 font-medium">부서</th>
            <th className="px-3 py-2 font-medium">차량</th>
            <th className="px-3 py-2 font-medium">장치</th>
            <th className="px-3 py-2 font-medium">제목</th>
            <th className="px-3 py-2 font-medium text-right">작업 시간</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
              <td className="whitespace-nowrap px-3 py-2">
                <Link className="link font-medium" href={`/reports/${r.id}`}>{r.report_no}</Link>
                {r.status === "초안" && <span className="chip ml-1 bg-amber-100 text-amber-800">초안</span>}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-slate-600">{r.occurred_at}</td>
              <td className="whitespace-nowrap px-3 py-2">{r.departments?.name.replace("차량정비센터", "")}</td>
              <td className="whitespace-nowrap px-3 py-2">
                {r.vehicles && <Link className="link" href={`/vehicles/${r.vehicles.id}`}>{r.vehicles.car_no}</Link>}
              </td>
              <td className="px-3 py-2"><span className="chip">{r.device}</span></td>
              <td className="px-3 py-2">
                <Link href={`/reports/${r.id}`} className="hover:underline">{r.title}</Link>
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right text-slate-600">{fmtHours(r.work_hours)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
