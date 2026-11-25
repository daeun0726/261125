"use client";
import { useState } from "react";

/** One-time setup: creates search vectors for reports that do not have one yet. */
export default function EmbedButton() {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    setMsg("검색용 벡터를 만드는 중…");
    try {
      const res = await fetch("/api/embed-all", { method: "POST" });
      const j = await res.json();
      setMsg(res.ok ? `완료: ${j.updated}건 생성 (남은 보고서 ${j.remaining}건)` : `실패: ${j.error}`);
    } catch {
      setMsg("실패: 네트워크 오류");
    }
    setBusy(false);
  }
  return (
    <div className="card flex flex-wrap items-center gap-3 text-sm">
      <div className="flex-1">
        <b>AI 검색 준비</b>
        <p className="text-slate-500">보고서를 유사 사례 검색용 벡터로 바꿉니다. 처음 한 번, 그리고 보고서를 일괄 추가한 뒤에 눌러 주세요.</p>
      </div>
      <button className="btn" onClick={run} disabled={busy}>검색용 벡터 만들기</button>
      {msg && <div className="w-full text-slate-600">{msg}</div>}
    </div>
  );
}
