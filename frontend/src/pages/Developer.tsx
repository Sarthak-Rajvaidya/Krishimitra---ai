import { useState } from "react";
import DataTable from "../components/DataTable";
import { DemoBadge, ErrorBox, Kpi, Skeleton } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { useFetch } from "../hooks/useFetch";
import { useToast } from "../hooks/useToast";
import { api } from "../services/api";

const Dot = ({ ok }: { ok: boolean }) => <span className={`inline-block h-2.5 w-2.5 rounded-full ${ok ? "bg-leaf-500" : "bg-red-500"}`} aria-label={ok ? "healthy" : "down"} />;

export function SystemOverview() {
  const { data: d, error, loading } = useFetch<any>("/system/overview");
  if (error) return <ErrorBox text={error} />; if (loading || !d) return <Skeleton rows={6} />;
  return (<div className="space-y-4"><h1 className="text-xl font-bold">System overview</h1>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi label="API" value={<Dot ok={d.api.ok} />} /><Kpi label="Database" value={<Dot ok={d.database.ok} />} hint={`${d.database.latency_ms} ms`} />
      <Kpi label="Vector DB" value={<Dot ok={d.vector_db.ok} />} hint={d.vector_db.points != null ? `${d.vector_db.points} points` : d.vector_db.error} /><Kpi label="Crop model" value={<Dot ok={d.crop_model.available} />} hint={d.crop_model.available ? "Trained model loaded" : d.crop_model.reason} /></div>
    <h2 className="font-semibold">LLM providers</h2>
    <DataTable rows={d.llm_providers} cols={[{ head: "Provider", cell: (p: any) => p.provider }, { head: "Configured", cell: (p: any) => <Dot ok={p.configured} /> }, { head: "Cooling down", cell: (p: any) => (p.cooling_down ? "Yes" : "No") }, { head: "Calls", cell: (p: any) => p.calls, right: true }, { head: "OK", cell: (p: any) => p.ok, right: true }, { head: "Last error", cell: (p: any) => p.last_error ?? "-" }, { head: "Last latency", cell: (p: any) => (p.last_latency_ms != null ? `${p.last_latency_ms} ms` : "-"), right: true }]} />
    <p className="text-xs text-slate-500">API keys are never displayed. Environment: {d.environment}.</p></div>);
}

export function Models() {
  const { data, reload } = useFetch<any[]>("/system/models"); const { can } = useAuth(); const toast = useToast();
  return (<div className="space-y-3"><h1 className="text-xl font-bold">Model registry and evaluation</h1>
    {data?.map((m) => (<div key={m.id} className="card space-y-1 text-sm"><div className="flex justify-between"><b>{m.name} v{m.version}</b><span>{m.is_active ? <span className="badge bg-forest-100 text-forest-700">Active</span> : m.is_trained ? "Inactive" : <span className="badge bg-amber-500/15 text-amber-600">Untrained</span>}</span></div>
      <p>{m.architecture} · {m.classes?.length ?? 0} classes</p><p className="text-xs text-slate-500">{m.dataset_note}</p>
      {m.last_evaluation ? <p>Test accuracy: <b>{(m.last_evaluation.test_accuracy * 100).toFixed(2)}%</b> (lab-style data; not field accuracy)</p> : <p className="text-slate-500">No evaluation recorded.</p>}
      {can("system.configure") && m.is_trained && !m.is_active && <button className="btn-primary" onClick={async () => { try { await api.post(`/system/models/${m.id}/activate`); toast("Model activated (audited)"); reload(); } catch (e: any) { toast(e.message, "err"); } }}>Activate</button>}</div>))}</div>);
}

export function Flags() {
  const { data, reload } = useFetch<any[]>("/system/flags"); const { can } = useAuth(); const toast = useToast();
  return (<div className="space-y-3"><h1 className="text-xl font-bold">Feature flags</h1>
    <DataTable rows={data ?? undefined} cols={[{ head: "Key", cell: (f: any) => f.key }, { head: "Description", cell: (f: any) => f.description }, { head: "Updated by", cell: (f: any) => f.updated_by ?? "-" },
      { head: "Enabled", cell: (f: any) => <input type="checkbox" aria-label={`Toggle ${f.key}`} checked={f.enabled} disabled={!can("system.configure")} onChange={async (e) => { try { await api.put("/system/flags", { key: f.key, description: f.description, enabled: e.target.checked }); toast("Flag updated (audited)"); reload(); } catch (x: any) { toast(x.message, "err"); } }} /> }]} /></div>);
}

export function Knowledge() {
  const { data: docs, reload } = useFetch<any[]>("/knowledge/documents"); const { data: jobs } = useFetch<any[]>("/knowledge/jobs"); const { can } = useAuth(); const toast = useToast();
  const [q, setQ] = useState(""); const [res, setRes] = useState<any[] | null>(null); const [busy, setBusy] = useState(false);
  return (<div className="space-y-4"><h1 className="text-xl font-bold">RAG documents and ingestion</h1>
    <p className="text-sm text-slate-500">Only upload documents the company is authorised to use. Source, licence and authoriser are mandatory and stored with every chunk.</p>
    {can("knowledge.manage") && <form className="card grid gap-2 sm:grid-cols-2" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { const r: any = await api.upload("/knowledge/documents", new FormData(e.currentTarget)); toast(r.status === "INDEXED" ? "Document indexed" : `Ingestion failed: ${r.error}`, r.status === "INDEXED" ? "ok" : "err"); reload(); } catch (x: any) { toast(x.message, "err"); } finally { setBusy(false); } }}>
      <input required name="title" className="input" placeholder="Title" aria-label="Title" /><input required name="source_org" className="input" placeholder="Source organisation" aria-label="Source organisation" />
      <input required name="licence" className="input" placeholder="Licence / permission" aria-label="Licence" /><input required name="authorized_by" className="input" placeholder="Authorised by" aria-label="Authorised by" />
      <input name="source_url" className="input" placeholder="Source URL (optional)" aria-label="Source URL" /><input required name="file" type="file" accept=".pdf,.txt,.md" className="input" aria-label="Document file" />
      <button className="btn-primary sm:col-span-2" disabled={busy}>{busy ? "Ingesting…" : "Upload and ingest"}</button></form>}
    <DataTable rows={docs ?? undefined} cols={[{ head: "Title", cell: (d: any) => <>{d.title} {d.is_demo && <DemoBadge />}</> }, { head: "Source", cell: (d: any) => d.source_org }, { head: "Licence", cell: (d: any) => d.licence }, { head: "Status", cell: (d: any) => d.status }, { head: "Chunks", cell: (d: any) => d.chunks, right: true }]} />
    <h2 className="font-semibold">Ingestion jobs</h2>
    <DataTable rows={jobs ?? undefined} cols={[{ head: "Job", cell: (j: any) => j.id }, { head: "Doc", cell: (j: any) => j.document_id }, { head: "Status", cell: (j: any) => j.status }, { head: "Error", cell: (j: any) => j.error ?? "" }]} />
    <h2 className="font-semibold">Retrieval test</h2>
    <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); setRes(await api.post<any[]>("/knowledge/retrieval-test", { query: q })); }}><input className="input" aria-label="Test query" value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn-ghost">Search</button></form>
    {res && (res.length ? res.map((r) => <div key={r.n} className="card text-xs"><b>{r.title}</b> score {r.score} {r.page && `p.${r.page}`}<p className="mt-1 text-slate-600">{r.excerpt}</p></div>) : <p className="text-sm text-slate-500">No passage passed the relevance threshold.</p>)}</div>);
}

export function ErrorLogs() { const { data } = useFetch<any[]>("/system/error-logs");
  return (<div className="space-y-3"><h1 className="text-xl font-bold">Error logs (sanitized)</h1><DataTable rows={data ?? undefined} cols={[{ head: "When", cell: (e: any) => new Date(e.at).toLocaleString() }, { head: "Path", cell: (e: any) => e.path }, { head: "Status", cell: (e: any) => e.status }, { head: "Error", cell: (e: any) => e.message }]} /></div>); }
export function DevAudit() { const { data } = useFetch<any>("/admin/audit-logs?size=100");
  return (<div className="space-y-3"><h1 className="text-xl font-bold">Audit logs</h1><DataTable rows={data?.items} cols={[{ head: "When", cell: (a: any) => new Date(a.at).toLocaleString() }, { head: "Actor", cell: (a: any) => a.actor ?? "system" }, { head: "Action", cell: (a: any) => a.action }, { head: "Detail", cell: (a: any) => <code className="text-xs">{a.detail ? JSON.stringify(a.detail) : ""}</code> }]} /></div>); }
