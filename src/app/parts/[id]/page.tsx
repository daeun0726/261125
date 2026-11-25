import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllReports, getRefs } from "@/lib/data";
import { hasDb } from "@/lib/supabase";
import { PageTitle, ReportTable, SetupNotice, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PartPage({ params }: PageProps<"/parts/[id]">) {
  if (!hasDb()) return <SetupNotice what="db" />;
  const { id } = await params;
  const [all, refs] = await Promise.all([getAllReports(), getRefs()]);
  const p = refs.parts.find((x) => String(x.id) === id);
  if (!p) notFound();
  const reports = all.filter((r) => r.report_parts.some((rp) => rp.parts?.id === p.id));
  const qty = reports.reduce((s, r) => s + r.report_parts.filter((rp) => rp.parts?.id === p.id).reduce((a, rp) => a + rp.qty, 0), 0);
  const dates = reports.map((r) => r.occurred_at).sort();
  let avgGap = "-";
  if (dates.length > 1) {
    const days = (Date.parse(dates[dates.length - 1]) - Date.parse(dates[0])) / 86400000 / (dates.length - 1);
    avgGap = `${Math.round(days)}일`;
  }
  const byVehicle = new Map<string, number>();
  reports.forEach((r) => r.vehicles && byVehicle.set(r.vehicles.car_no, (byVehicle.get(r.vehicles.car_no) || 0) + 1));

  return (
    <div className="space-y-6">
      <Link href="/departments" className="link text-sm">← 부서·차량·부품</Link>
      <PageTitle title={`${p.name} 교체 이력`} sub={`장치 분류 ${p.device}${p.replace_cycle_months ? ` · 표준 교체 주기 ${p.replace_cycle_months}개월 (가상)` : ""}`} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="관련 보고서" value={`${reports.length}건`} />
        <Stat label="교체 수량" value={`${qty}개`} />
        <Stat label="평균 교체 간격" value={avgGap} sub="전체 차량 기준" />
        <Stat label="교체 차량" value={`${byVehicle.size}대`} sub={[...byVehicle].map(([k, n]) => `${k}(${n})`).join(", ")} />
      </div>
      <ReportTable reports={reports} empty="이 부품을 교체한 보고서가 없습니다." />
    </div>
  );
}
