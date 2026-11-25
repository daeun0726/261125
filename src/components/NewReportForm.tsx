"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Dept = { id: number; name: string };
type Veh = { id: number; car_no: string; vehicle_type: string; department_id: number };
type Part = { id: number; name: string; device: string };
const DEVICES = ["제동", "대차", "출입문", "냉난방", "전기", "기관", "연결기", "차체"];
const STAGES = ["입고 검사", "중정비 작업 중", "출고 전 시운전", "운행 중 고장 입고"];

const EMPTY = { title: "", device: "제동", symptom: "", symptom_std: "", cause: "", action: "", work_hours: "", test_result: "", service_impact: "", prevention: "", note: "" };

export default function NewReportForm({ departments, vehicles, parts, aiEnabled }: { departments: Dept[]; vehicles: Veh[]; parts: Part[]; aiEnabled: boolean }) {
  const router = useRouter();
  const [vehicleId, setVehicleId] = useState(String(vehicles[0]?.id ?? ""));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [place, setPlace] = useState("");
  const [stage, setStage] = useState(STAGES[0]);
  const [writer, setWriter] = useState("");
  const [memo, setMemo] = useState("객실 4번 문이 닫히다가 다시 열리는 게 반복됨. 레일 보니까 모래 같은 이물질 껴 있었고 닫힘 센서 위치도 좀 틀어져 있었음. 레일 청소하고 센서 위치 다시 맞춤. 1시간 반 정도 걸림. 부품 교체는 없음.");
  const [f, setF] = useState(EMPTY);
  const [sel, setSel] = useState<{ name: string; qty: number }[]>([]);
  const [refs, setRefs] = useState<{ id: number; report_no: string; title: string }[]>([]);
  const [busy, setBusy] = useState<"" | "draft" | "save">("");
  const [msg, setMsg] = useState("");
  const [showForm, setShowForm] = useState(!aiEnabled);

  const vehicle = vehicles.find((v) => String(v.id) === vehicleId);
  const dept = departments.find((d) => d.id === vehicle?.department_id);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const partOptions = useMemo(() => parts.filter((p) => !sel.some((s) => s.name === p.name)), [parts, sel]);

  async function draft() {
    setBusy("draft");
    setMsg("AI가 과거 보고서를 참고해 초안을 쓰는 중…");
    try {
      const r = await fetch("/api/draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ memo, vehicle_id: vehicleId, occurred_at: date, found_place: place }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      const d = j.draft;
      setF({
        title: d.title || "", device: DEVICES.includes(d.device) ? d.device : "차체", symptom: d.symptom || "", symptom_std: d.symptom_std || "", cause: d.cause || "", action: d.action || "",
        work_hours: d.work_hours == null ? "" : String(d.work_hours), test_result: d.test_result || "", service_impact: d.service_impact || "", prevention: d.prevention || "", note: d.note || "",
      });
      setSel((d.parts || []).filter((p: { name: string }) => p?.name && parts.some((x) => x.name === p.name)).map((p: { name: string; qty: number }) => ({ name: p.name, qty: Number(p.qty) || 1 })));
      setRefs(j.refs || []);
      setShowForm(true);
      setMsg("초안을 만들었습니다. \"(확인 필요)\" 칸을 채우고 저장하세요.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "초안 작성 실패");
    }
    setBusy("");
  }

  async function save(status: "확정" | "초안") {
    setBusy("save");
    setMsg("저장 중…");
    try {
      const r = await fetch("/api/reports", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...f, parts: sel, vehicle_id: vehicleId, occurred_at: date, found_place: place, found_stage: stage, writer: writer || (dept ? `${dept.name}` : ""), status }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      router.push(`/reports/${j.id}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "저장 실패");
      setBusy("");
    }
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-4">
        <h2 className="font-semibold">1. 기본 정보와 정비 메모</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="label">차량</label>
            <select className="input" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.car_no} ({v.vehicle_type})</option>)}
            </select>
          </div>
          <div>
            <label className="label">작성 부서 (차량 기준 자동)</label>
            <input className="input bg-slate-50" value={dept?.name ?? ""} readOnly />
          </div>
          <div>
            <label className="label">발생일</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label">발견 장소</label>
            <input className="input" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="예) 객차 검수고" />
          </div>
          <div>
            <label className="label">발견 경위</label>
            <select className="input" value={stage} onChange={(e) => setStage(e.target.value)}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select>
          </div>
          <div>
            <label className="label">작성자</label>
            <input className="input" value={writer} onChange={(e) => setWriter(e.target.value)} placeholder="예) 정비1팀 홍길동" />
          </div>
          <div className="md:col-span-3">
            <label className="label">정비 메모 (평소 말투로 자유롭게)</label>
            <textarea className="input min-h-28" value={memo} onChange={(e) => setMemo(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {aiEnabled && <button className="btn" disabled={!!busy} onClick={draft}>{busy === "draft" ? "작성 중…" : "AI로 보고서 초안 만들기"}</button>}
          {!showForm && <button className="btn-ghost" onClick={() => setShowForm(true)}>직접 작성하기</button>}
          {msg && <span className="text-sm text-slate-600">{msg}</span>}
        </div>
        <p className="text-xs text-slate-500">AI는 메모에 없는 원인·조치를 지어내지 않고 &quot;(확인 필요)&quot;로 남깁니다.</p>
      </div>

      {showForm && (
        <div className="card space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">2. 보고서 내용 확인·수정</h2>
            {refs.length > 0 && (
              <div className="text-xs text-slate-500">
                참고한 과거 보고서: {refs.map((r, i) => <span key={r.id}>{i > 0 && ", "}<Link className="link" href={`/reports/${r.id}`} target="_blank">{r.report_no}</Link></span>)}
              </div>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2"><label className="label">제목</label><input className="input" value={f.title} onChange={set("title")} /></div>
            <div><label className="label">장치 분류</label><select className="input" value={f.device} onChange={set("device")}>{DEVICES.map((d) => <option key={d}>{d}</option>)}</select></div>
            <div className="md:col-span-3"><label className="label">1. 고장 현상</label><textarea className="input min-h-16" value={f.symptom} onChange={set("symptom")} /></div>
            <div><label className="label">증상 요약 (표준 표현)</label><input className="input" value={f.symptom_std} onChange={set("symptom_std")} /></div>
            <div><label className="label">운행 영향</label><input className="input" value={f.service_impact} onChange={set("service_impact")} placeholder="예) 발차 지연, 없음" /></div>
            <div><label className="label">작업 시간 (시간)</label><input className="input" type="number" step="0.5" min="0" value={f.work_hours} onChange={set("work_hours")} /></div>
            <div className="md:col-span-3"><label className="label">2. 원인 분석</label><textarea className="input min-h-16" value={f.cause} onChange={set("cause")} /></div>
            <div className="md:col-span-3"><label className="label">3. 조치 내용</label><textarea className="input min-h-16" value={f.action} onChange={set("action")} /></div>
            <div className="md:col-span-2">
              <label className="label">교체 부품</label>
              <div className="flex flex-wrap items-center gap-2">
                {sel.map((p, i) => (
                  <span key={p.name} className="chip gap-1 py-1">
                    {p.name}
                    <input className="w-10 rounded border border-slate-300 px-1 text-xs" type="number" min={1} value={p.qty} onChange={(e) => setSel(sel.map((s, j) => (j === i ? { ...s, qty: Number(e.target.value) || 1 } : s)))} />개
                    <button className="ml-1 text-slate-400 hover:text-red-600" onClick={() => setSel(sel.filter((_, j) => j !== i))}>✕</button>
                  </span>
                ))}
                <select className="input w-auto" value="" onChange={(e) => e.target.value && setSel([...sel, { name: e.target.value, qty: 1 }])}>
                  <option value="">+ 부품 추가</option>
                  {partOptions.map((p) => <option key={p.id} value={p.name}>[{p.device}] {p.name}</option>)}
                </select>
              </div>
            </div>
            <div><label className="label">조치 후 시험 결과</label><input className="input" value={f.test_result} onChange={set("test_result")} placeholder="예) 동작 시험 정상" /></div>
            <div className="md:col-span-3"><label className="label">4. 재발 방지 대책</label><textarea className="input min-h-16" value={f.prevention} onChange={set("prevention")} /></div>
            <div className="md:col-span-3"><label className="label">5. 비고</label><textarea className="input min-h-12" value={f.note} onChange={set("note")} /></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn" disabled={!!busy} onClick={() => save("확정")}>{busy === "save" ? "저장 중…" : "보고서 저장"}</button>
            <button className="btn-ghost" disabled={!!busy} onClick={() => save("초안")}>초안으로 저장</button>
            {msg && <span className="text-sm text-slate-600">{msg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
