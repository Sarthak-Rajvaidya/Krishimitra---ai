import { useState } from "react";
import { Bars, Donut, SalesLine } from "../components/charts";
import DataTable from "../components/DataTable";
import { DemoBadge, ErrorBox, Kpi, RangePicker, Skeleton, rangeQs } from "../components/ui";
import { useFetch } from "../hooks/useFetch";
import { useToast } from "../hooks/useToast";
import { api, rupees } from "../services/api";

export function AdminOverview() {
  const [r, setR] = useState({ range: "30d" } as { range: string; start?: string; end?: string });
  const { data: d, error, loading } = useFetch<any>(`/admin/overview?${rangeQs(r)}`);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-xl font-bold">Overview</h1><RangePicker value={r} onChange={setR} /></div>
      {error ? <ErrorBox text={error} /> : loading || !d ? <Skeleton rows={6} /> : (<>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kpi label="Gross order value" value={rupees(d.orders.gross_order_value_paise)} /><Kpi label="Net sales" value={rupees(d.finance.net_sales_paise)} hint="ex-GST, after discounts" />
          <Kpi label="Orders" value={d.orders.orders} /><Kpi label="Avg order value" value={rupees(d.orders.aov_paise)} /><Kpi label="Products" value={d.total_products} />
          <Kpi label="Low stock" value={d.low_stock_count} /><Kpi label="Pending orders" value={d.orders.pending_orders} /><Kpi label="Delivered" value={d.orders.delivered_orders} />
          <Kpi label="Refunds" value={rupees(d.orders.refund_total_paise)} /><Kpi label="Repeat customers" value={d.orders.repeat_customers} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card"><h2 className="mb-2 font-semibold">Daily sales <DemoBadge /></h2><SalesLine data={d.sales_daily} /></div>
          <div className="card"><h2 className="mb-2 font-semibold">Monthly sales</h2><Bars data={d.sales_monthly} x="period" y="net_sales_paise" money /></div>
          <div className="card"><h2 className="mb-2 font-semibold">Order status</h2><Donut data={Object.entries(d.orders.status_distribution).map(([name, value]) => ({ name, value: value as number }))} /></div>
          <div className="card"><h2 className="mb-2 font-semibold">Category sales</h2><Bars data={d.category_sales} x="category" y="sales_paise" money color="#d9921b" /></div>
          <div className="card"><h2 className="mb-2 font-semibold">Top products (units)</h2><Bars data={d.top_products} x="product" y="units" /></div>
          <div className="card"><h2 className="mb-2 font-semibold">Inventory levels</h2><Bars data={d.inventory_levels} x="sku" y="available" color="#4daa57" /></div>
          <div className="card"><h2 className="mb-2 font-semibold">New vs repeat customers</h2><Donut data={[{ name: "New", value: d.orders.new_customers }, { name: "Repeat", value: d.orders.repeat_customers }]} /></div>
          <div className="card"><h2 className="mb-2 font-semibold">Low-stock alerts</h2>{d.low_stock.length ? <ul className="text-sm">{d.low_stock.map((l: any) => <li key={l.product}>{l.product}: {l.available} left (threshold {l.threshold})</li>)}</ul> : <p className="text-sm text-slate-500">None.</p>}</div>
        </div>
        <a className="btn-ghost" href={`/api/v1/admin/reports/orders.csv?${rangeQs(r)}`}>Export orders CSV</a></>)}
    </div>
  );
}

export function AdminProducts() {
  const [q, setQ] = useState(""); const { data, reload, loading } = useFetch<any>(`/admin/products?q=${encodeURIComponent(q)}`);
  const toast = useToast();
  const edit = async (p: any) => {
    const price = prompt(`New price in rupees for ${p.name}`, String(p.price_paise / 100)); if (!price || isNaN(Number(price))) return;
    try { await api.put(`/admin/products/${p.id}`, { sku: p.sku, name: p.name, category_slug: p.category, product_type: p.product_type, description: p.description, pack_size: p.pack_size, unit_qty: 1, unit: p.unit, price_paise: Math.round(Number(price) * 100), cost_paise: p.cost_paise, gst_rate_bp: 500, crops: p.crops.join(","), use_tags: p.use_tags.join(","), safety_info: p.safety_info, is_active: p.is_active }); toast("Updated"); reload(); } catch (e: any) { toast(e.message, "err"); }
  };
  return (<div className="space-y-3"><h1 className="text-xl font-bold">Products</h1>
    <input className="input max-w-sm" placeholder="Search name or SKU" aria-label="Search products" value={q} onChange={(e) => setQ(e.target.value)} />
    <DataTable loading={loading} rows={data?.items} cols={[{ head: "SKU", cell: (p: any) => p.sku }, { head: "Name", cell: (p: any) => p.name }, { head: "Price", cell: (p: any) => rupees(p.price_paise), right: true },
      { head: "Stock", cell: (p: any) => p.stock, right: true }, { head: "Active", cell: (p: any) => (p.is_active ? "Yes" : "No") },
      { head: "", cell: (p: any) => <span className="space-x-2"><button className="underline" onClick={() => edit(p)}>Edit price</button><button className="text-red-600 underline" onClick={async () => { if (confirm("Deactivate and hide this product?")) { await api.del(`/admin/products/${p.id}`); reload(); } }}>Deactivate</button></span> }]} />
    <label className="btn-ghost cursor-pointer w-fit">Import catalogue CSV<input type="file" accept=".csv" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const fd = new FormData(); fd.append("file", f); try { const r: any = await api.upload("/admin/products/import-csv", fd); toast(`Created ${r.created}, updated ${r.updated}, errors ${r.errors.length}`); reload(); } catch (x: any) { toast(x.message, "err"); } }} /></label>
  </div>);
}

export function AdminInventory() {
  const { data, reload, loading } = useFetch<any[]>("/admin/inventory"); const toast = useToast();
  return (<div className="space-y-3"><h1 className="text-xl font-bold">Inventory</h1>
    <DataTable loading={loading} rows={data ?? undefined} cols={[{ head: "SKU", cell: (b: any) => b.sku }, { head: "Product", cell: (b: any) => b.name }, { head: "On hand", cell: (b: any) => b.on_hand, right: true }, { head: "Reorder at", cell: (b: any) => b.reorder_threshold, right: true },
      { head: "Status", cell: (b: any) => (b.low ? <span className="badge bg-red-100 text-red-700">Low</span> : "OK") },
      { head: "", cell: (b: any) => <button className="underline" onClick={async () => { const d = Number(prompt("Quantity change (+ receive, - remove)", "10")); if (!d) return; const reason = prompt("Reason (required)", "Stock count") || ""; try { await api.post("/admin/inventory/adjust", { product_id: b.product_id, delta: d, reason }); toast("Stock updated"); reload(); } catch (e: any) { toast(e.message, "err"); } }}>Adjust</button> }]} /></div>);
}

const NEXT: Record<string, string> = { PLACED: "CONFIRMED", CONFIRMED: "PACKED", PACKED: "OUT_FOR_DELIVERY", OUT_FOR_DELIVERY: "DELIVERED" };
export function AdminOrders() {
  const { data, reload, loading } = useFetch<any>("/admin/orders"); const toast = useToast();
  const move = async (id: number, status: string) => { try { await api.post(`/admin/orders/${id}/status`, { status }); reload(); } catch (e: any) { toast(e.message, "err"); } };
  return (<div className="space-y-3"><h1 className="text-xl font-bold">Orders</h1>
    <DataTable loading={loading} rows={data?.items} cols={[{ head: "Order", cell: (o: any) => o.order_number }, { head: "Date", cell: (o: any) => new Date(o.placed_at).toLocaleDateString() }, { head: "District", cell: (o: any) => o.ship_to.district },
      { head: "Total", cell: (o: any) => rupees(o.total_paise), right: true }, { head: "Status", cell: (o: any) => o.status.replace(/_/g, " ") },
      { head: "", cell: (o: any) => <span className="space-x-2">{NEXT[o.status] && <button className="underline" onClick={() => move(o.id, NEXT[o.status])}>→ {NEXT[o.status].replace(/_/g, " ")}</button>}{["PLACED", "CONFIRMED", "PACKED"].includes(o.status) && <button className="text-red-600 underline" onClick={() => move(o.id, "CANCELLED")}>Cancel</button>}</span> }]} /></div>);
}

export function AdminCustomers() {
  const { data, loading } = useFetch<any[]>("/admin/customers");
  return (<div className="space-y-3"><h1 className="text-xl font-bold">Customers</h1><DataTable loading={loading} rows={data ?? undefined} cols={[{ head: "Name", cell: (c: any) => <>{c.name} {c.is_demo && <DemoBadge />}</> }, { head: "Email", cell: (c: any) => c.email }, { head: "Orders", cell: (c: any) => c.orders, right: true }, { head: "Lifetime value", cell: (c: any) => rupees(c.lifetime_value_paise), right: true }]} /></div>);
}

export function AdminPromotions() {
  const { data, reload } = useFetch<any[]>("/admin/promotions"); const toast = useToast();
  const [f, setF] = useState({ code: "", percent: "5", max: "100", min: "500" });
  return (<div className="space-y-3"><h1 className="text-xl font-bold">Promotions</h1>
    <DataTable rows={data ?? undefined} cols={[{ head: "Code", cell: (p: any) => p.code }, { head: "Off", cell: (p: any) => `${p.percent_off_bp / 100}%` }, { head: "Max discount", cell: (p: any) => rupees(p.max_discount_paise) }, { head: "Min order", cell: (p: any) => rupees(p.min_order_paise) }, { head: "Active", cell: (p: any) => (p.is_active ? "Yes" : "No") }]} />
    <form className="card flex flex-wrap items-end gap-2" onSubmit={async (e) => { e.preventDefault(); try { await api.post("/admin/promotions", { code: f.code.toUpperCase(), percent_off_bp: Math.round(Number(f.percent) * 100), max_discount_paise: Math.round(Number(f.max) * 100), min_order_paise: Math.round(Number(f.min) * 100) }); toast("Promotion created"); reload(); } catch (x: any) { toast(x.message, "err"); } }}>
      <input className="input w-32" placeholder="CODE" aria-label="Code" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /><input className="input w-20" aria-label="Percent off" value={f.percent} onChange={(e) => setF({ ...f, percent: e.target.value })} />%
      <input className="input w-24" aria-label="Max discount rupees" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value })} /><input className="input w-24" aria-label="Min order rupees" value={f.min} onChange={(e) => setF({ ...f, min: e.target.value })} /><button className="btn-primary">Add</button></form></div>);
}

export function AdminUsers() {
  const { data, reload } = useFetch<any[]>("/admin/users"); const toast = useToast();
  return (<div className="space-y-3"><h1 className="text-xl font-bold">Users and roles</h1><p className="text-sm text-slate-500">Role changes are audited. You cannot change your own role.</p>
    <DataTable rows={data ?? undefined} cols={[{ head: "Name", cell: (u: any) => u.name }, { head: "Email", cell: (u: any) => u.email },
      { head: "Role", cell: (u: any) => <select aria-label={`Role for ${u.email}`} className="input w-auto" value={u.role} onChange={async (e) => { try { await api.put(`/admin/users/${u.id}/role`, { role: e.target.value }); toast("Role updated"); reload(); } catch (x: any) { toast(x.message, "err"); } }}>{["FARMER", "ADMIN", "FINANCE", "DEVELOPER", "FOUNDER"].map((r) => <option key={r}>{r}</option>)}</select> }]} /></div>);
}

export function AuditLogs() {
  const { data, loading } = useFetch<any>("/admin/audit-logs?size=100");
  return (<div className="space-y-3"><h1 className="text-xl font-bold">Audit logs</h1><DataTable loading={loading} rows={data?.items} cols={[{ head: "When", cell: (a: any) => new Date(a.at).toLocaleString() }, { head: "Actor", cell: (a: any) => a.actor ?? "system" }, { head: "Action", cell: (a: any) => a.action }, { head: "Entity", cell: (a: any) => `${a.entity ?? ""} ${a.entity_id ?? ""}` }, { head: "Detail", cell: (a: any) => <code className="text-xs">{a.detail ? JSON.stringify(a.detail) : ""}</code> }]} /></div>);
}
