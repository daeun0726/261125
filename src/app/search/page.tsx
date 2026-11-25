"use client";
import Link from "next/link";
import { useState } from "react";

type M = { id: number; report_no: string; title: string; symptom: string; cause: string; action: string; car_no?: string; vehicle_type?: string; dept?: string; occurred_at: string; score: number; reason: string };
type Res = { mode: "ai" | "keyword"; note?: string; checklist: string[]; matches: M[] };

const EXAMPLES = [
  "멈출 때 정지선을 자꾸 지나쳐요",
  "출발할 때 차 밑에서 덜컹거리는 소리가 나요",
  "문이 끝까지 안 닫히고 다시 열려요",
  "객실이 덥다고 민원이 들어왔어요",
  "엔진 온도 경고등이 켜졌어요",
  "노치 올리면 차단기가 떨어져요",
];

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [vtype, setVtype] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Res | null>(null);
  const [err, setErr] = useState("");

  async function run(text = q) {
    if (!text.trim()) return setErr("증상을 입력해 주세요.");
    setQ(text);
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ q: text, vtype }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "검색 실패");
      setRes(j);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "검색 실패");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">유사 사례 검색</h1>
        <p className="mt-1 text-sm text-slate-500">고장 증상을 평소 말투로 적으면, 표현이 달라도 뜻이 비슷한 과거 보고서 3건과 점검 순서를 찾아 줍니다.</p>
      </div>
      <div className="card space-y-3">
        <textarea className="input min-h-24" value={q} onChange={(e) => setQ(e.target.value)} placeholder="예) 출발할 때 차 밑에서 덜컹거리는 소리가 나고 속도가 잘 안 붙어요" />
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <button key={e} type="button" className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600 hover:border-[#0b3d91]" onClick={() => run(e)}>{e}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="input w-auto" value={vtype} onChange={(e) => setVtype(e.target.value)}>
            <option value="">차종 전체</option>
            <option>전기기관차</option><option>디젤기관차</option><option>객차</option><option>화차</option>
          </select>
          <button className="btn" disabled={busy} onClick={() => run()}>{busy ? "찾는 중…" : "유사 사례 찾기"}</button>
          {err && <span className="text-sm text-red-600">{err}</span>}
        </div>
      </div>

      {res && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span className={`chip ${res.mode === "ai" ? "bg-blue-100 text-[#0b3d91]" : ""}`}>{res.mode === "ai" ? "AI 추천" : "키워드 추천"}</span>
            {res.note && <span className="text-slate-500">{res.note}</span>}
          </div>
          {res.matches.length ? (
            <div className="grid gap-3 md:grid-cols-3">
              {res.matches.map((m) => (
                <Link key={m.id} href={`/reports/${m.id}`} className="card block p-4 hover:border-[#0b3d91]">
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold text-[#0b3d91]">{m.report_no}</span>
                    <span className="text-xs font-semibold">유사도 {m.score}%</span>
                  </div>
                  <div className="my-2 h-1.5 overflow-hidden rounded bg-slate-200"><div className="h-full bg-[#0b3d91]" style={{ width: `${m.score}%` }} /></div>
                  <div className="text-sm font-medium">{m.title}</div>
                  <div className="mt-1 text-xs text-slate-500">{m.vehicle_type} {m.car_no} · {m.occurred_at}</div>
                  <div className="mt-2 text-sm text-slate-600">&ldquo;{m.symptom}&rdquo;</div>
                  <div className="mt-2 text-sm"><b>원인</b> {m.cause}</div>
                  <div className="text-sm"><b>조치</b> {m.action}</div>
                  <div className="mt-2 rounded bg-blue-50 px-2 py-1 text-xs text-slate-700">💡 {m.reason}</div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">비슷한 사례가 없습니다. 언제, 어디서, 어떤 소리·냄새·표시가 있었는지 더 적어 주세요.</div>
          )}
          {res.checklist.length > 0 && (
            <div className="card border-amber-200 bg-amber-50">
              <h2 className="mb-2 font-semibold">🔧 먼저 확인할 점검 순서 (AI 제안)</h2>
              <ol className="list-decimal space-y-1 pl-5 text-sm">{res.checklist.map((c, i) => <li key={i}>{c}</li>)}</ol>
            </div>
          )}
          <p className="text-xs text-slate-500">추천 결과는 참고용이며, 최종 판단은 정비 규정과 담당자 확인을 따릅니다.</p>
        </div>
      )}
    </div>
  );
}
