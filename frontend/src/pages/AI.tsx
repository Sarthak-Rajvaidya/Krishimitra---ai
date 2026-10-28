import { AlertTriangle, ExternalLink, Send, ThumbsDown, ThumbsUp, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Empty, ErrorBox, Skeleton } from "../components/ui";
import { useCart } from "../hooks/useCart";
import { useFetch } from "../hooks/useFetch";
import { useToast } from "../hooks/useToast";
import { api, rupees } from "../services/api";
import type { Candidate, Citation } from "../types";

export function CropDoctor() {
  const { data: status } = useFetch<{ available: boolean; reason: string | null; version: string | null }>("/crop/model-status");
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ crop: "", crop_stage: "", plant_part: "", symptoms: "" });
  const [busy, setBusy] = useState(false);
  const nav = useNavigate(); const toast = useToast();
  const preview = file ? URL.createObjectURL(file) : null;
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold text-forest-900">AI Crop Doctor</h1>
      {status && !status.available && <div role="status" className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700"><AlertTriangle size={18} aria-hidden />No trained model is active, so no image prediction will be made. {status.reason} You can still save the case with your notes and ask Advisory.</div>}
      <form className="card space-y-3" onSubmit={async (e) => {
        e.preventDefault(); if (!file) return toast("Choose a photo first", "err"); setBusy(true);
        const fd = new FormData(); fd.append("image", file); Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
        try { const d = await api.upload<{ id: number }>("/crop/diagnose", fd); nav(`/diagnoses/${d.id}`); } catch (x: any) { toast(x.message, "err"); } finally { setBusy(false); }
      }}>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-forest-100 p-6 text-sm text-slate-500 focus-within:ring-2">
          {preview ? <img src={preview} alt="Selected crop" className="max-h-48 rounded" /> : <><Upload aria-hidden />Upload a clear photo (JPEG, PNG or WEBP, up to 8 MB)</>}
          <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} aria-label="Crop photo" />
        </label>
        <div className="grid gap-2 sm:grid-cols-3">
          <div><span className="label">Crop</span><input className="input" value={form.crop} onChange={set("crop")} placeholder="e.g. tomato" /></div>
          <div><span className="label">Growth stage</span><input className="input" value={form.crop_stage} onChange={set("crop_stage")} placeholder="e.g. flowering" /></div>
          <div><span className="label">Affected part</span><select className="input" value={form.plant_part} onChange={set("plant_part")}><option value="">Select</option><option>leaf</option><option>stem</option><option>fruit</option><option>root</option></select></div>
        </div>
        <div><span className="label">Symptoms you see</span><textarea className="input" rows={3} maxLength={1000} value={form.symptoms} onChange={set("symptoms")} /></div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Analysing…" : "Analyse photo"}</button>
      </form>
    </div>
  );
}

export function DiagnosisPage() {
  const { id } = useParams();
  const { data: d, loading, error, reload } = useFetch<any>(`/crop/diagnoses/${id}`);
  const [recs, setRecs] = useState<any | null>(null);
  const [note, setNote] = useState(""); const toast = useToast(); const nav = useNavigate(); const { add } = useCart();
  if (loading) return <Skeleton rows={6} />; if (error || !d) return <ErrorBox text={error || "Not found"} />;
  const act = (fn: () => Promise<any>, ok: string) => fn().then(() => { toast(ok); reload(); }).catch((e) => toast(e.message, "err"));
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-3">
        <div className="card"><img src={d.image_url} alt="Uploaded crop" className="max-h-72 w-full rounded object-contain" /></div>
        <div className="card space-y-2 text-sm">
          <h2 className="font-semibold">Preliminary AI assessment</h2>
          {d.status === "MODEL_UNAVAILABLE" ? <p className="text-amber-700">{d.model_note}</p> : <>
            {d.uncertain && <p className="text-amber-700">The model is uncertain about this image. Treat results as a lead only.</p>}
            {d.predictions.map((p: any) => <div key={p.label}><div className="flex justify-between"><span>{p.label.replace(/_+/g, " ")}</span><span>{(p.score * 100).toFixed(1)}%</span></div><div className="h-2 rounded bg-slate-200"><div className="h-2 rounded bg-forest-500" style={{ width: `${p.score * 100}%` }} /></div></div>)}
            <p className="text-xs text-slate-500">{d.score_note}</p></>}
          <p className="text-xs text-slate-500">This is not a diagnosis. Image models trained on lab photos can be wrong on field images.</p>
          <div className="flex flex-wrap gap-2"><span className="text-xs">Does this look right?</span>
            <button className="btn-ghost px-2" aria-label="Looks correct" onClick={() => act(() => api.post(`/crop/diagnoses/${d.id}/feedback`, { agrees: true }), "Thanks")}><ThumbsUp size={14} /></button>
            <button className="btn-ghost px-2" aria-label="Looks wrong" onClick={() => act(() => api.post(`/crop/diagnoses/${d.id}/feedback`, { agrees: false }), "Thanks")}><ThumbsDown size={14} /></button></div>
          <div className="text-xs">Expert review: <b>{d.expert_review.replace("_", " ")}</b> {d.expert_review === "NOT_REQUESTED" && <button className="underline" onClick={() => act(() => api.post(`/crop/diagnoses/${d.id}/expert-review`), "Requested")}>Request</button>}</div>
        </div>
        <div className="card space-y-2 text-sm"><h2 className="font-semibold">Follow-up observations</h2>
          {d.followups.map((f: any, i: number) => <p key={i} className="text-slate-600">{new Date(f.at).toLocaleDateString()}: {f.note} {f.outcome && `(${f.outcome})`}</p>)}
          <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} aria-label="Follow-up note" />
          <div className="flex flex-wrap gap-2">{["improved", "same", "worse"].map((o) => <button key={o} className="btn-ghost" disabled={note.length < 3} onClick={() => act(() => api.post(`/crop/diagnoses/${d.id}/followups`, { note, outcome: o }).then(() => setNote("")), "Saved")}>{o}</button>)}</div></div>
      </div>
      <div className="space-y-3">
        <div className="flex gap-2"><button className="btn-primary" onClick={async () => { const c = await api.post<{ id: number }>("/advisory/conversations", { diagnosis_id: d.id }); nav(`/advisory/${c.id}`); }}>Ask Advisory about this case</button>
          <button className="btn-ghost" onClick={async () => { try { const r = await api.post<any>(`/recommendations/diagnosis/${d.id}`); setRecs(r); r.candidates.forEach((c: Candidate) => api.post(`/recommendations/${c.recommendation_id}/viewed`).catch(() => {})); } catch (e: any) { toast(e.message, "err"); } }}>See options</button></div>
        {recs && <Recs recs={recs} add={add} />}
      </div>
    </div>
  );
}

function Recs({ recs, add }: { recs: any; add: (p: number, q?: number, r?: number) => Promise<void> }) {
  const toast = useToast();
  return (
    <div className="space-y-3">
      {recs.notes.map((n: string) => <p key={n} className="card text-sm text-amber-700">{n}</p>)}
      {recs.follow_up_questions.length > 0 && <div className="card text-sm"><b>To help us be more certain:</b><ul className="ml-5 list-disc">{recs.follow_up_questions.map((q: string) => <li key={q}>{q}</li>)}</ul></div>}
      {recs.candidates.length === 0 && <Empty text="No supported product options for this case. That is expected when evidence or verified label data is missing. Consult an agronomist." />}
      {recs.candidates.map((c: Candidate) => (
        <div key={c.recommendation_id} className="card space-y-1 text-sm">
          <div className="flex justify-between"><b>{c.name}</b><span className={`badge ${c.included ? "bg-forest-100 text-forest-700" : "bg-slate-100 text-slate-600"}`}>{c.included ? "Supported option" : "Not suggested"}</span></div>
          <p className="text-slate-600">{c.why_considered}</p>
          {c.exclusion_reason && <p className="text-slate-700"><b>Why not:</b> {c.exclusion_reason}</p>}
          {c.included && <><p><b>Evidence:</b></p><Cites list={c.evidence} /><p className="text-xs text-amber-700">{c.uncertainty}</p></>}
          <p className="text-xs"><b>Label:</b> {c.label_restrictions}</p><p className="text-xs"><b>Dose:</b> {c.dose_info}</p>
          <div className="flex items-center justify-between"><span>{c.pack.pack_size} · {rupees(c.pack.price_paise)} · {c.pack.in_stock ? "In stock" : "Out of stock"}</span>
            {c.included && <button className="btn-primary" disabled={!c.pack.in_stock} onClick={() => add(c.product_id, 1, c.recommendation_id).then(() => toast("Added to cart")).catch((e) => toast(e.message, "err"))}>Add to cart</button>}</div>
          <p className="text-xs text-slate-500">Expert confirmation recommended before purchase or use.</p>
        </div>))}
      <p className="text-xs text-slate-500">{recs.disclaimer}</p>
    </div>
  );
}

export function Cites({ list }: { list: Citation[] }) {
  return <ul className="space-y-1">{list.map((c) => <li key={c.n} className="rounded bg-forest-50 p-2 text-xs"><b>[{c.n}] {c.title}</b>{c.page ? `, p.${c.page}` : ""}{c.section ? `, ${c.section}` : ""}<div className="mt-1 text-slate-600">“{c.excerpt}…”</div></li>)}</ul>;
}

export function Advisory() {
  const { id } = useParams();
  const nav = useNavigate(); const toast = useToast();
  const { data: convs, reload: reloadList } = useFetch<any[]>("/advisory/conversations");
  const { data: sugg } = useFetch<string[]>("/advisory/suggestions?lang=en");
  const [conv, setConv] = useState<any | null>(null); const [text, setText] = useState(""); const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { if (id) api.get<any>(`/advisory/conversations/${id}`).then(setConv).catch((e) => toast(e.message, "err")); else setConv(null); }, [id]);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [conv]);
  async function send(msg: string) {
    if (!msg.trim() || busy) return; setBusy(true);
    try {
      let cid = id; if (!cid) { const c = await api.post<{ id: number }>("/advisory/conversations", {}); cid = String(c.id); nav(`/advisory/${cid}`, { replace: true }); }
      setConv((c: any) => ({ ...(c || { messages: [] }), messages: [...(c?.messages || []), { id: -1, role: "user", content: msg, citations: [] }] })); setText("");
      await api.post(`/advisory/conversations/${cid}/messages`, { message: msg });
      setConv(await api.get(`/advisory/conversations/${cid}`)); reloadList();
    } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); }
  }
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <aside className="space-y-2 text-sm md:col-span-1"><button className="btn-primary w-full" onClick={() => nav("/advisory")}>New conversation</button>
        {convs?.map((c) => <Link key={c.id} to={`/advisory/${c.id}`} className={`block truncate rounded-lg p-2 ${String(c.id) === id ? "bg-forest-100" : "hover:bg-forest-50"}`}>{c.title}</Link>)}</aside>
      <section className="card flex min-h-[28rem] flex-col md:col-span-3">
        <div className="flex-1 space-y-3 overflow-y-auto text-sm" aria-live="polite">
          {!conv?.messages?.length && <div><p className="text-slate-600">Ask about crop care, soil and nutrient management. Answers come only from the documents in the knowledge base and show their sources.</p>
            <div className="mt-2 flex flex-wrap gap-2">{sugg?.map((s) => <button key={s} className="btn-ghost text-xs" onClick={() => send(s)}>{s}</button>)}</div></div>}
          {conv?.messages?.map((m: any, i: number) => (
            <div key={i} className={m.role === "user" ? "ml-auto max-w-[85%] rounded-lg bg-forest-700 p-2 text-white" : "max-w-[92%] rounded-lg bg-forest-50 p-3"}>
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.role === "assistant" && <>{!m.grounded && <p className="mt-1 text-xs text-amber-700"><AlertTriangle size={12} className="inline" aria-hidden /> Not grounded in retrieved sources.</p>}
                {m.citations?.length > 0 && <div className="mt-2"><div className="text-xs font-semibold">Sources</div><Cites list={m.citations} /></div>}
                {m.id > 0 && <div className="mt-1 flex gap-1 text-xs">Helpful? <button aria-label="Useful" onClick={() => api.post(`/advisory/messages/${m.id}/feedback`, { value: 1 }).then(() => toast("Thanks"))}><ThumbsUp size={14} /></button><button aria-label="Not useful" onClick={() => api.post(`/advisory/messages/${m.id}/feedback`, { value: -1 }).then(() => toast("Thanks"))}><ThumbsDown size={14} /></button></div>}</>}
            </div>))}
          {busy && <Skeleton rows={2} />}<div ref={end} />
        </div>
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(text); }}>
          <input className="input" aria-label="Your question" value={text} maxLength={1500} onChange={(e) => setText(e.target.value)} placeholder="Ask in English or मराठी…" />
          <button className="btn-primary" aria-label="Send" disabled={busy}><Send size={16} /></button></form>
      </section>
    </div>
  );
}
