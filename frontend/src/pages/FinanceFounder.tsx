import { useState } from "react";
import { Bars, Donut, SalesLine } from "../components/charts";
import DataTable from "../components/DataTable";
import { DemoBadge, ErrorBox, Kpi, RangePicker, Skeleton, rangeQs } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { useFetch } from "../hooks/useFetch";
import { useToast } from "../hooks/useToast";
import { api, rupees } from "../services/api";

const pct = (v: number | null) => (v == null ? "Unavailable" : `${v}%`);
type R = { range: string; start?: string; end?: string };

export function FinanceOverview() {
  const [r, setR] = useState<R>({ range: "30d" });
  const { data: d, error, loading } = useFetch<any>(`/finance/overview?${rangeQs(r)}`);
  const f = d?.summary;
  return (<div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-xl font-bold">Financial overview</h1><RangePicker value={r} onChange={setR} /></div>
    {error ? <ErrorBox text={error} /> : loading || !f ? <Skeleton rows={5} /> : (<>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Net sales" value={rupees(f.net_sales_paise)} hint="ex-GST, after discounts and refunds" /><Kpi label="COGS" value={rupees(f.cogs_paise)} />
        <Kpi label="Gross profit" value={rupees(f.gross_profit_paise)} hint={`Margin ${pct(f.gross_margin_pct)}`} /><Kpi label="Operating profit" value={rupees(f.operating_profit_paise)} hint="after recorded expenses only" />
        <Kpi label="Discounts" value={rupees(f.discounts_paise)} /><Kpi label="Refunds" value={rupees(f.refunds_paise)} /><Kpi label="Delivery fees" value={rupees(f.delivery_fees_paise)} /><Kpi label="Expenses" value={rupees(f.expenses_paise)} />
      </div>
      <div className="card"><h2 className="mb-2 font-semibold">Net sales and gross profit <DemoBadge /></h2><SalesLine data={d.series} /></div>
      <div className="card text-sm"><h2 className="font-semibold">Definitions</h2><ul className="ml-5 list-disc text-slate-600">{Object.entries(d.definitions).map(([k, v]) => <li key={k}><b>{k}</b>: {v as string}</li>)}</ul>
        <p className="mt-2 text-xs text-slate-500">{f.profit_note} Expense categories included: {Object.keys(f.expense_categories_included).join(", ") || "none recorded"}.</p></div>
      <a className="btn-ghost" href={`/api/v1/finance/export/ledger.csv?${rangeQs(r)}`}>Export ledger CSV</a></>)}
  </div>);
}
export function Ledger() { const { data, loading } = useFetch<any>("/finance/ledger?range=90d&size=100");
  return (<div className="space-y-3"><h1 className="text-xl font-bold">Sales ledger</h1><p className="text-sm text-slate-500">Append-only entries. Corrections are made with reversing entries.</p>
    <DataTable loading={loading} rows={data?.items} cols={[{ head: "When", cell: (t: any) => new Date(t.at).toLocaleString() }, { head: "Type", cell: (t: any) => t.type }, { head: "Ref", cell: (t: any) => t.reference }, { head: "Amount", cell: (t: any) => rupees(t.amount_paise), right: true }]} /></div>); }
export function Recon() { const { data } = useFetch<any>("/finance/reconciliation");
  return (<div className="space-y-3"><h1 className="text-xl font-bold">Payment reconciliation</h1><p className="text-sm text-slate-500">{data?.note}</p>
    <DataTable rows={data?.rows} cols={[{ head: "Mode", cell: (r: any) => r.mode }, { head: "Status", cell: (r: any) => r.status }, { head: "Count", cell: (r: any) => r.count, right: true }, { head: "Amount", cell: (r: any) => rupees(r.amount_paise), right: true }]} /></div>); }
export function Expenses() { const { data, reload } = useFetch<any[]>("/finance/expenses"); const { can } = useAuth(); const toast = useToast(); const [f, setF] = useState({ category: "", amount: "" });
  return (<div className="space-y-3"><h1 className="text-xl font-bold">Expenses</h1>
    <DataTable rows={data ?? undefined} cols={[{ head: "Date", cell: (e: any) => new Date(e.incurred_on).toLocaleDateString() }, { head: "Category", cell: (e: any) => <>{e.category} {e.is_demo && <DemoBadge />}</> }, { head: "Amount", cell: (e: any) => rupees(e.amount_paise), right: true }]} />
    {can("finance.write") && <form className="card flex gap-2" onSubmit={async (e) => { e.preventDefault(); try { await api.post("/finance/expenses", { category: f.category, amount_paise: Math.round(Number(f.amount) * 100) }); toast("Expense recorded"); reload(); } catch (x: any) { toast(x.message, "err"); } }}>
      <input required className="input" placeholder="Category" aria-label="Category" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /><input required className="input w-32" placeholder="₹ amount" aria-label="Amount" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /><button className="btn-primary">Record</button></form>}</div>); }
export function Gst() { const [r, setR] = useState<R>({ range: "30d" }); const { data: d } = useFetch<any>(`/finance/gst?${rangeQs(r)}`);
  return (<div className="space-y-3"><div className="flex justify-between"><h1 className="text-xl font-bold">GST report</h1><RangePicker value={r} onChange={setR} /></div>
    {d && <div className="grid grid-cols-3 gap-3"><Kpi label="Collected" value={rupees(d.gst_collected_paise)} /><Kpi label="Refunded" value={rupees(d.gst_refunded_paise)} /><Kpi label="Net" value={rupees(d.gst_net_paise)} /></div>}<p className="text-xs text-slate-500">{d?.disclaimer}</p></div>); }
export function Refunds() { const { data } = useFetch<any[]>("/finance/refunds");
  return (<div className="space-y-3"><h1 className="text-xl font-bold">Refunds</h1><DataTable rows={data ?? undefined} cols={[{ head: "Order", cell: (r: any) => r.order_id }, { head: "Reason", cell: (r: any) => r.reason }, { head: "Amount", cell: (r: any) => rupees(r.amount_paise), right: true }]} /></div>); }

export function FounderOverview() {
  const [r, setR] = useState<R>({ range: "30d" });
  const { data: d, error, loading } = useFetch<any>(`/founder/overview?${rangeQs(r)}`);
  const f = d?.finance;
  return (<div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-xl font-bold">Executive overview</h1><RangePicker value={r} onChange={setR} /></div>
    {error ? <ErrorBox text={error} /> : loading || !d ? <Skeleton rows={8} /> : (<>
      <p className="text-xs text-amber-700">{d.data_notice}</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Net sales" value={rupees(f.net_sales_paise)} hint={`Growth vs prior period: ${pct(d.net_sales_growth_pct)}`} /><Kpi label="Gross profit" value={rupees(f.gross_profit_paise)} hint={`Margin ${pct(f.gross_margin_pct)}`} />
        <Kpi label="Orders" value={d.orders.orders} hint={`AOV ${rupees(d.orders.aov_paise)}`} /><Kpi label="Repeat purchase rate" value={pct(d.orders.repeat_purchase_rate_pct)} hint={`${d.orders.new_customers} new customers`} />
        <Kpi label="Cancellation rate" value={pct(d.orders.cancellation_rate_pct)} /><Kpi label="Refunds" value={rupees(d.orders.refund_total_paise)} /><Kpi label="Inventory value (cost)" value={rupees(d.inventory.valuation_at_cost_paise)} /><Kpi label="Operating profit" value={rupees(f.operating_profit_paise)} hint="recorded expenses only" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card"><h2 className="mb-2 font-semibold">Net sales &amp; gross profit</h2><SalesLine data={d.series} /></div>
        <div className="card"><h2 className="mb-2 font-semibold">Category performance</h2><Bars data={d.category_sales} x="category" y="sales_paise" money color="#d9921b" /></div>
        <div className="card"><h2 className="mb-2 font-semibold">Revenue by district</h2><Bars data={d.regions} x="district" y="revenue_paise" money /></div>
        <div className="card"><h2 className="mb-2 font-semibold">Crop issues (Crop Doctor top class)</h2><Bars data={d.crop_issues} x="label" y="count" /></div>
        <div className="card text-sm"><h2 className="mb-2 font-semibold">AI usage and quality</h2><ul className="space-y-1"><li>Diagnoses: {d.ai.diagnoses}; low-confidence rate: {pct(d.ai.low_confidence_rate_pct)}; no-model runs: {d.ai.model_unavailable_count}</li><li>Advisory conversations: {d.ai.advisory_conversations}; answers: {d.ai.advisory_answers}; ungrounded: {d.ai.ungrounded_answers}</li>
          {d.ai.llm_providers.map((p: any) => <li key={p.provider}>{p.provider}: {p.success}/{p.calls} ok, avg {p.avg_latency_ms} ms</li>)}{!d.ai.llm_providers.length && <li>No LLM calls recorded yet.</li>}</ul></div>
        <div className="card text-sm"><h2 className="mb-2 font-semibold">Inventory risk and alerts</h2>{d.alerts.length ? <ul className="space-y-1">{d.alerts.map((a: any, i: number) => <li key={i}>• {a.text}</li>)}</ul> : <p className="text-slate-500">No alerts.</p>}
          <p className="mt-2 text-xs text-slate-500">Slow-moving: {d.inventory.slow_moving.length} SKUs with zero sales in range.</p></div>
      </div>
      <a className="btn-ghost" href={`/api/v1/founder/export/summary.csv?${rangeQs(r)}`}>Export summary CSV (audited)</a></>)}
  </div>);
}
