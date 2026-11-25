"use client";
import { useState } from "react";

export default function VehicleSummary({ vehicleId }: { vehicleId: number }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      const r = await fetch("/api/vehicle-summary", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ vehicleId }) });
      const j = await r.json();
      setText(r.ok ? j.summary : j.error);
    } catch {
      setText("요약에 실패했습니다.");
    }
    setBusy(false);
  }
  return (
    <div className="card border-blue-200 bg-blue-50/50">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <b>AI 이력 요약</b>
          <p className="text-sm text-slate-500">이 차량의 보고서를 읽고 반복 고장과 주의할 점을 정리합니다.</p>
        </div>
        <button className="btn" onClick={run} disabled={busy}>{busy ? "요약 중…" : "이력 요약하기"}</button>
      </div>
      {text && <div className="mt-3 whitespace-pre-wrap text-sm">{text}</div>}
    </div>
  );
}
