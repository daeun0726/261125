import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllReports, getRefs, fmtHours } from "@/lib/data";
import { hasDb } from "@/lib/supabase";
import { hasAI } from "@/lib/gemini";
import { PageTitle, SetupNotice, Stat } from "@/components/ui";
import VehicleSummary from "@/components/VehicleSummary";

export const dynamic = "force-dynamic";

export default async function VehiclePage({ params }: PageProps<"/vehicles/[id]">) {
  if (!hasDb()) return <SetupNotice what="db" />;
  const { id } = await params;
  const [all, refs] = await Promise.all([getAllReports(), getRefs()]);
  const v = refs.vehicles.find((x) => String(x.id) === id);
  if (!v) notFound();
  const dept = refs.departments.find((d) => d.id === v.department_id);
  const reports = all.filter((r) => r.vehicle_id === v.id);
  const hours = reports.reduce((s, r) => s + Number(r.work_hours || 0), 0);
  const devices = new Set(reports.map((r) => r.device));

  return (
    <div className="space-y-6">
      <Link href="/departments" className="link text-sm">← 부서·차량·부품</Link>
      <PageTitle title={`${v.car_no} 정비 이력`} sub={`${v.vehicle_type} · ${v.model} · ${v.built_year}년 제작 · 담당 ${dept?.name ?? "-"}`} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Stat label="고장 조치 보고서" value={`${reports.length}건`} />
        <Stat label="총 작업 시간" value={fmtHours(hours)} />
        <Stat label="고장 장치 종류" value={`${devices.size}종`} sub={[...devices].join(", ")} />
      </div>
      {hasAI() && reports.length > 0 && <VehicleSummary vehicleId={v.id} />}
      <div className="card">
        <h2 className="mb-4 font-semibold">이력 타임라인 (최신순)</h2>
        {reports.length ? (
          <ol className="relative ml-2 border-l-2 border-slate-200">
            {reports.map((r) => (
              <li key={r.id} className="mb-5 ml-5">
                <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-[#0b3d91]" />
                <div className="text-xs text-slate-500">{r.occurred_at} · {r.found_stage}</div>
                <Link href={`/reports/${r.id}`} className="font-medium hover:underline">{r.report_no} {r.title}</Link>
                <div className="text-sm text-slate-600">원인: {r.cause} · 조치: {r.action} · {fmtHours(r.work_hours)}</div>
              </li>
            ))}
          </ol>
        ) : <p className="text-sm text-slate-500">보고서가 없습니다.</p>}
      </div>
    </div>
  );
}
