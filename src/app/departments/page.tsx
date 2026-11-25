import Link from "next/link";
import { getAllReports, getRefs } from "@/lib/data";
import { hasDb } from "@/lib/supabase";
import { PageTitle, SetupNotice } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Overview() {
  if (!hasDb()) return <SetupNotice what="db" />;
  const [reports, refs] = await Promise.all([getAllReports(), getRefs()]);
  const partCount = (id: number) => reports.reduce((s, r) => s + r.report_parts.filter((p) => p.parts?.id === id).reduce((a, p) => a + p.qty, 0), 0);

  return (
    <div className="space-y-8">
      <PageTitle title="부서 · 차량 · 부품" sub="대전철도차량정비단의 정비센터 구성을 참고한 가상 데이터입니다." />
      <section>
        <h2 className="mb-3 font-semibold">정비센터</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {refs.departments.map((d) => {
            const n = reports.filter((r) => r.department_id === d.id).length;
            const cars = refs.vehicles.filter((v) => v.department_id === d.id);
            return (
              <Link key={d.id} href={`/departments/${d.id}`} className="card block hover:border-[#0b3d91]">
                <div className="font-semibold">{d.name}</div>
                <div className="mt-1 text-xs text-slate-500">담당 차종: {d.vehicle_type}</div>
                <div className="mt-3 text-2xl font-bold">{n}<span className="ml-1 text-sm font-normal text-slate-500">건</span></div>
                <div className="text-xs text-slate-500">차량 {cars.length}대</div>
              </Link>
            );
          })}
        </div>
      </section>
      <section>
        <h2 className="mb-3 font-semibold">차량</h2>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
          {refs.vehicles.map((v) => (
            <Link key={v.id} href={`/vehicles/${v.id}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:border-[#0b3d91]">
              <span><b>{v.car_no}</b> <span className="text-slate-500">{v.vehicle_type}</span></span>
              <span className="chip">{reports.filter((r) => r.vehicle_id === v.id).length}건</span>
            </Link>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-3 font-semibold">부품</h2>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {refs.parts.map((p) => (
            <Link key={p.id} href={`/parts/${p.id}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:border-[#0b3d91]">
              <span>{p.name} <span className="text-xs text-slate-500">[{p.device}]</span></span>
              <span className="chip">교체 {partCount(p.id)}개</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
