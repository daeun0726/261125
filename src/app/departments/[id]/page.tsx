import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllReports, getRefs, fmtHours } from "@/lib/data";
import { hasDb } from "@/lib/supabase";
import { BarCount } from "@/components/Charts";
import { PageTitle, ReportTable, SetupNotice, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DepartmentPage({ params }: PageProps<"/departments/[id]">) {
  if (!hasDb()) return <SetupNotice what="db" />;
  const { id } = await params;
  const [all, refs] = await Promise.all([getAllReports(), getRefs()]);
  const d = refs.departments.find((x) => String(x.id) === id);
  if (!d) notFound();
  const reports = all.filter((r) => r.department_id === d.id);
  const cars = refs.vehicles.filter((v) => v.department_id === d.id);
  const devMap = new Map<string, number>();
  reports.forEach((r) => devMap.set(r.device, (devMap.get(r.device) || 0) + 1));
  const byDevice = [...devMap].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  const hours = reports.reduce((s, r) => s + Number(r.work_hours || 0), 0);

  return (
    <div className="space-y-6">
      <Link href="/departments" className="link text-sm">← 부서·차량·부품</Link>
      <PageTitle title={d.name} sub={`${d.description ?? ""} · 담당 차종 ${d.vehicle_type}`} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Stat label="보고서" value={`${reports.length}건`} />
        <Stat label="담당 차량" value={`${cars.length}대`} />
        <Stat label="총 작업 시간" value={fmtHours(hours)} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 font-semibold">장치별 보고서</h2>
          <BarCount data={byDevice} height={200} />
        </div>
        <div className="card">
          <h2 className="mb-3 font-semibold">담당 차량</h2>
          <ul className="space-y-2 text-sm">
            {cars.map((v) => (
              <li key={v.id} className="flex justify-between">
                <Link className="link font-medium" href={`/vehicles/${v.id}`}>{v.car_no}</Link>
                <span className="text-slate-500">{v.model} · {v.built_year}년 · 보고서 {reports.filter((r) => r.vehicle_id === v.id).length}건</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div>
        <h2 className="mb-2 font-semibold">부서 보고서</h2>
        <ReportTable reports={reports} />
      </div>
    </div>
  );
}
