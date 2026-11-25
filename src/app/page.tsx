import Link from "next/link";
import { getAllReports, getRefs } from "@/lib/data";
import { hasDb } from "@/lib/supabase";
import { hasAI } from "@/lib/gemini";
import { BarCount, MonthLine } from "@/components/Charts";
import { PageTitle, ReportTable, SetupNotice, Stat } from "@/components/ui";
import EmbedButton from "@/components/EmbedButton";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  if (!hasDb()) return <SetupNotice what="db" />;
  const [reports, refs] = await Promise.all([getAllReports(), getRefs()]);

  const latest = reports[0]?.occurred_at ?? new Date().toISOString().slice(0, 10);
  const yearStart = latest.slice(0, 4) + "-01-01";
  const thisYear = reports.filter((r) => r.occurred_at >= yearStart);
  const avgHours = reports.length ? reports.reduce((s, r) => s + Number(r.work_hours || 0), 0) / reports.length : 0;

  const byDept = refs.departments.map((d) => ({ name: d.name.replace("차량정비센터", " 센터"), count: reports.filter((r) => r.department_id === d.id).length }));
  const deviceMap = new Map<string, number>();
  reports.forEach((r) => deviceMap.set(r.device, (deviceMap.get(r.device) || 0) + 1));
  const byDevice = [...deviceMap].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  const partMap = new Map<string, { id: number; count: number }>();
  reports.forEach((r) => r.report_parts.forEach((rp) => {
    if (!rp.parts) return;
    const cur = partMap.get(rp.parts.name) || { id: rp.parts.id, count: 0 };
    cur.count += rp.qty;
    partMap.set(rp.parts.name, cur);
  }));
  const topParts = [...partMap].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.count - a.count).slice(0, 6);

  // repeated failures: same vehicle + same standard symptom more than once
  const repeatMap = new Map<string, { car: string; vid: number; std: string; count: number }>();
  reports.forEach((r) => {
    if (!r.vehicles || !r.symptom_std) return;
    const k = `${r.vehicle_id}|${r.symptom_std}`;
    const cur = repeatMap.get(k) || { car: r.vehicles.car_no, vid: r.vehicles.id, std: r.symptom_std, count: 0 };
    cur.count++;
    repeatMap.set(k, cur);
  });
  const repeats = [...repeatMap.values()].filter((x) => x.count > 1).sort((a, b) => b.count - a.count).slice(0, 5);

  // monthly trend over the last 24 months
  const months: { month: string; count: number }[] = [];
  const end = new Date(latest + "T00:00:00Z");
  for (let i = 23; i >= 0; i--) {
    const d = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - i, 1));
    const key = d.toISOString().slice(0, 7);
    months.push({ month: key.slice(2).replace("-", "."), count: reports.filter((r) => r.occurred_at.startsWith(key)).length });
  }

  return (
    <div className="space-y-6">
      <PageTitle title="정비 현황 대시보드" sub={`고장 조치 보고서 ${reports.length}건 기준 · 최근 발생일 ${latest}`} />
      {!hasAI() && <SetupNotice what="ai" />}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="전체 보고서" value={`${reports.length}건`} sub={`${refs.departments.length}개 정비센터 · 차량 ${refs.vehicles.length}대`} />
        <Stat label={`${latest.slice(0, 4)}년 보고서`} value={`${thisYear.length}건`} />
        <Stat label="평균 작업 시간" value={`${avgHours.toFixed(1)}시간`} sub="보고서 1건당" />
        <Stat label="반복 고장 (같은 차량·같은 증상)" value={`${repeats.length}건`} sub="2회 이상 발생" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 font-semibold">부서별 보고서</h2>
          <BarCount data={byDept} height={200} />
        </div>
        <div className="card">
          <h2 className="mb-2 font-semibold">장치별 보고서</h2>
          <BarCount data={byDevice} height={200} />
        </div>
        <div className="card md:col-span-2">
          <h2 className="mb-2 font-semibold">월별 보고서 추이 (최근 24개월)</h2>
          <MonthLine data={months} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold">반복 고장 TOP 5</h2>
          {repeats.length ? (
            <ol className="space-y-2 text-sm">
              {repeats.map((x) => (
                <li key={`${x.vid}-${x.std}`} className="flex items-center justify-between">
                  <span><Link className="link font-medium" href={`/vehicles/${x.vid}`}>{x.car}</Link> · {x.std}</span>
                  <span className="chip bg-red-50 text-red-700">{x.count}회</span>
                </li>
              ))}
            </ol>
          ) : <p className="text-sm text-slate-500">반복 고장이 없습니다.</p>}
        </div>
        <div className="card">
          <h2 className="mb-3 font-semibold">교체가 많은 부품 TOP 6</h2>
          <ol className="space-y-2 text-sm">
            {topParts.map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <Link className="link" href={`/parts/${p.id}`}>{p.name}</Link>
                <span className="chip">{p.count}개</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">최근 보고서</h2>
          <Link href="/reports" className="link text-sm">전체 보기 →</Link>
        </div>
        <ReportTable reports={reports.slice(0, 8)} />
      </div>

      {hasAI() && <EmbedButton />}
    </div>
  );
}
