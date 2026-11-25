import Link from "next/link";
import { applyFilters, DEVICES, getAllReports, getRefs, VEHICLE_TYPES, type Filters } from "@/lib/data";
import { hasDb } from "@/lib/supabase";
import { PageTitle, ReportTable, SetupNotice } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  if (!hasDb()) return <SetupNotice what="db" />;
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const f: Filters = { dept: one("dept"), vtype: one("vtype"), vehicle: one("vehicle"), device: one("device"), part: one("part"), q: one("q"), from: one("from"), to: one("to") };
  const [all, refs] = await Promise.all([getAllReports(), getRefs()]);
  const list = applyFilters(all, f);
  const active = Object.values(f).some(Boolean);

  return (
    <div>
      <PageTitle title="고장 조치 보고서" sub={`${list.length}건 / 전체 ${all.length}건`} />
      <form className="card mb-4 grid gap-3 md:grid-cols-4" method="get">
        <div className="md:col-span-2">
          <label className="label">키워드 (제목·현상·원인·조치·차량번호)</label>
          <input className="input" name="q" defaultValue={f.q} placeholder="예) 출입문, IGBT, EL-8101" />
        </div>
        <div>
          <label className="label">부서</label>
          <select className="input" name="dept" defaultValue={f.dept || ""}>
            <option value="">전체</option>
            {refs.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">차종</label>
          <select className="input" name="vtype" defaultValue={f.vtype || ""}>
            <option value="">전체</option>
            {VEHICLE_TYPES.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="label">차량</label>
          <select className="input" name="vehicle" defaultValue={f.vehicle || ""}>
            <option value="">전체</option>
            {refs.vehicles.map((v) => <option key={v.id} value={v.id}>{v.car_no} ({v.vehicle_type})</option>)}
          </select>
        </div>
        <div>
          <label className="label">장치</label>
          <select className="input" name="device" defaultValue={f.device || ""}>
            <option value="">전체</option>
            {DEVICES.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="label">교체 부품</label>
          <select className="input" name="part" defaultValue={f.part || ""}>
            <option value="">전체</option>
            {refs.parts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">시작일</label>
            <input className="input" type="date" name="from" defaultValue={f.from} />
          </div>
          <div>
            <label className="label">종료일</label>
            <input className="input" type="date" name="to" defaultValue={f.to} />
          </div>
        </div>
        <div className="flex items-end gap-2 md:col-span-4">
          <button className="btn" type="submit">검색</button>
          {active && <Link href="/reports" className="btn-ghost">초기화</Link>}
          <Link href="/reports/new" className="btn-ghost ml-auto">+ 새 보고서 작성</Link>
        </div>
      </form>
      <ReportTable reports={list} />
    </div>
  );
}
