import Link from "next/link";
import { notFound } from "next/navigation";
import { getReport } from "@/lib/data";
import { hasDb } from "@/lib/supabase";
import { similarToReport } from "@/lib/similar";
import ReportSheet, { sheetText, type SheetData } from "@/components/ReportSheet";
import CopyButton from "@/components/CopyButton";
import { SetupNotice } from "@/components/ui";
import Train3D from "@/components/Train3D";

export const dynamic = "force-dynamic";

export default async function ReportDetail({ params }: PageProps<"/reports/[id]">) {
  if (!hasDb()) return <SetupNotice what="db" />;
  const { id } = await params;
  const r = await getReport(Number(id));
  if (!r) notFound();
  const similar = await similarToReport(r, 3);
  const d: SheetData = {
    ...r,
    deptName: r.departments?.name,
    deptId: r.departments?.id,
    carNo: r.vehicles?.car_no,
    vehicleId: r.vehicles?.id,
    vehicleType: r.vehicles?.vehicle_type,
    parts: r.report_parts.filter((p) => p.parts).map((p) => ({ id: p.parts!.id, name: p.parts!.name, qty: p.qty })),
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Link href="/reports" className="link text-sm">← 보고서 목록</Link>
          <div className="ml-auto"><CopyButton text={sheetText(d)} /></div>
        </div>
        <div className="mb-4">
          <Train3D vehicleType={r.vehicles?.vehicle_type} highlight={r.device} height={300} label={`${r.vehicles?.car_no ?? ""} ${r.vehicles?.vehicle_type ?? ""} · 고장 부위 표시`} />
        </div>
        <ReportSheet d={d} />
      </div>
      <aside>
        <h2 className="mb-2 font-semibold">비슷한 과거 보고서</h2>
        <div className="space-y-3">
          {similar.length ? similar.map((m) => (
            <Link key={m.report.id} href={`/reports/${m.report.id}`} className="card block p-4 hover:border-[#0b3d91]">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-semibold text-[#0b3d91]">{m.report.report_no}</span>
                <span className="text-xs text-slate-500">유사도 {m.score}%</span>
              </div>
              <div className="mt-1 text-sm">{m.report.title}</div>
              <div className="mt-1 text-xs text-slate-500">{m.report.vehicles?.car_no} · {m.report.occurred_at}</div>
              <div className="mt-2 rounded bg-blue-50 px-2 py-1 text-xs text-slate-700">{m.reason}</div>
            </Link>
          )) : <p className="text-sm text-slate-500">비슷한 보고서가 없습니다.</p>}
        </div>
      </aside>
    </div>
  );
}
