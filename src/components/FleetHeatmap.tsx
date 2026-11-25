"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Train3D from "./Train3D";

const TYPES = ["전기기관차", "디젤기관차", "객차", "화차"];

/** Dashboard: 3D vehicle per type, parts coloured by how many reports hit them. Click a part to open its reports. */
export default function FleetHeatmap({ counts }: { counts: Record<string, Record<string, number>> }) {
  const [vt, setVt] = useState(TYPES[0]);
  const router = useRouter();
  const c = useMemo(() => counts[vt] || {}, [counts, vt]);
  const top = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="font-semibold">차종별 고장 부위 3D 열지도</h2>
        <div className="ml-auto flex gap-1">
          {TYPES.map((t) => (
            <button key={t} onClick={() => setVt(t)} className={`rounded-full px-3 py-1 text-xs ${vt === t ? "bg-[#0b3d91] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{t}</button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <Train3D vehicleType={vt} counts={c} height={340} label={`${vt} · 부위별 고장 보고서 수`} onPick={(d) => router.push(`/reports?vtype=${encodeURIComponent(vt)}&device=${encodeURIComponent(d)}`)} />
        <div className="text-sm">
          <div className="mb-2 text-xs font-medium text-slate-500">{vt} 고장이 많은 부위</div>
          <ol className="space-y-2">
            {top.length ? top.map(([d, n], i) => (
              <li key={d}>
                <button className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 hover:border-[#0b3d91]" onClick={() => router.push(`/reports?vtype=${encodeURIComponent(vt)}&device=${encodeURIComponent(d)}`)}>
                  <span>{i + 1}. {d}</span><span className="chip bg-red-50 text-red-700">{n}건</span>
                </button>
              </li>
            )) : <li className="text-slate-500">보고서가 없습니다.</li>}
          </ol>
          <p className="mt-3 text-xs text-slate-500">모델의 부위를 누르면 해당 보고서 목록으로 이동합니다.</p>
        </div>
      </div>
    </div>
  );
}
