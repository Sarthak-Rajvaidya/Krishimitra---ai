import { Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Empty, ErrorBox, Skeleton } from "../components/ui";
import { useCart } from "../hooks/useCart";
import { useFetch } from "../hooks/useFetch";
import { useToast } from "../hooks/useToast";
import { api, rupees } from "../services/api";
import type { Address } from "../types";

export function CartPage() {
  const { cart, setQty, remove } = useCart();
  const toast = useToast();
  if (!cart.items.length) return <Empty text="Your cart is empty." />;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="space-y-2 md:col-span-2">
        {cart.items.map((i) => (
          <div key={i.id} className="card flex items-center gap-3">
            <div className="flex-1"><div className="text-sm font-semibold">{i.name}</div><div className="text-xs text-slate-500">{i.pack_size} · {rupees(i.unit_price_paise)}{i.recommendation_id && " · from advisory"}</div>
              {i.quantity > i.available && <div className="text-xs text-red-600">Only {i.available} available</div>}</div>
            <div className="flex items-center gap-1">
              <button aria-label="Decrease" className="btn-ghost px-2" disabled={i.quantity <= 1} onClick={() => setQty(i.id, i.quantity - 1).catch((e) => toast(e.message, "err"))}><Minus size={14} /></button>
              <span aria-live="polite" className="w-6 text-center text-sm">{i.quantity}</span>
              <button aria-label="Increase" className="btn-ghost px-2" onClick={() => setQty(i.id, i.quantity + 1).catch((e) => toast(e.message, "err"))}><Plus size={14} /></button>
            </div>
            <div className="w-20 text-right text-sm font-semibold">{rupees(i.line_total_paise)}</div>
            <button aria-label={`Remove ${i.name}`} onClick={() => remove(i.id)}><Trash2 size={16} className="text-red-600" /></button>
          </div>))}
      </div>
      <div className="card h-fit space-y-2 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>{rupees(cart.subtotal_paise)}</span></div>
        <p className="text-xs text-slate-500">Delivery and discounts are calculated at checkout by the server. Prices include GST.</p>
        <Link to="/checkout" className="btn-primary w-full">Checkout</Link>
      </div>
    </div>
  );
}

export function Checkout() {
  const { data: addrs, reload } = useFetch<Address[]>("/addresses");
  const [aid, setAid] = useState<number | null>(null);
  const [promo, setPromo] = useState("");
  const [mode, setMode] = useState<"COD" | "SIMULATED_ONLINE">("COD");
  const [share, setShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [key] = useState(() => crypto.randomUUID());
  const sel = addrs?.find((a) => a.id === (aid ?? addrs[0]?.id));
  const { data: cart, error } = useFetch<any>(`/cart?${new URLSearchParams({ ...(promo ? { promo } : {}), ...(sel ? { pincode: sel.pincode } : {}) })}`);
  const { refresh } = useCart(); const nav = useNavigate(); const toast = useToast();
  const hasAdvisory = cart?.items?.some((i: any) => i.recommendation_id);
  if (!addrs) return <Skeleton />;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="space-y-4 md:col-span-2">
        <section className="card"><h2 className="font-semibold">Delivery address</h2>
          {addrs.length === 0 ? <AddressForm onSaved={reload} /> : addrs.map((a) => (
            <label key={a.id} className="mt-2 flex gap-2 text-sm"><input type="radio" checked={sel?.id === a.id} onChange={() => setAid(a.id)} /><span>{a.line1}, {a.district}, {a.state} {a.pincode}</span></label>))}
        </section>
        <section className="card text-sm"><h2 className="font-semibold">Payment</h2>
          <label className="mt-2 flex gap-2"><input type="radio" checked={mode === "COD"} onChange={() => setMode("COD")} /> Cash on delivery</label>
          <label className="mt-1 flex gap-2"><input type="radio" checked={mode === "SIMULATED_ONLINE"} onChange={() => setMode("SIMULATED_ONLINE")} /> Simulated online payment <span className="badge bg-amber-500/15 text-amber-600">Demo only, no real money</span></label>
        </section>
        <label className="flex gap-2 text-sm"><input aria-label="Promo" className="input w-40" placeholder="Promo code" value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())} /></label>
        {hasAdvisory && <label className="flex gap-2 text-sm"><input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} /> Link this order to my crop advisory so I can follow up (optional)</label>}
      </div>
      <div className="card h-fit space-y-2 text-sm">
        {error ? <ErrorBox text={error} /> : !cart ? <Skeleton rows={4} /> : (<>
          <Row l="Subtotal" v={cart.subtotal_paise} />{cart.discount_paise > 0 && <Row l={`Discount ${cart.promo_code || ""}`} v={-cart.discount_paise} />}
          <Row l="Delivery" v={cart.delivery_fee_paise} /><div className="border-t pt-2"><Row l="Total" v={cart.total_paise} bold /></div>
          <p className="text-xs text-slate-500">Includes GST of {rupees(cart.tax_included_paise)}.</p>
          <button className="btn-primary w-full" disabled={busy || !sel || !cart.items.length} onClick={async () => {
            setBusy(true);
            try { const o = await api.post<{ id: number }>("/checkout", { address_id: sel!.id, payment_mode: mode, promo_code: promo || null, share_advisory: share }, { "Idempotency-Key": key }); refresh(); toast("Order placed"); nav(`/orders/${o.id}`); }
            catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); }
          }}>{busy ? "Placing order…" : "Place order"}</button></>)}
      </div>
    </div>
  );
}
const Row = ({ l, v, bold }: { l: string; v: number; bold?: boolean }) => <div className={`flex justify-between ${bold ? "font-bold" : ""}`}><span>{l}</span><span>{rupees(v)}</span></div>;

export function AddressForm({ onSaved }: { onSaved: () => void }) {
  const [f, setF] = useState({ line1: "", village: "", district: "", state: "Maharashtra", pincode: "" });
  const toast = useToast();
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  return (
    <form className="mt-2 grid gap-2 sm:grid-cols-2" onSubmit={async (e) => { e.preventDefault(); try { await api.post("/addresses", { ...f, is_default: true }); onSaved(); } catch (x: any) { toast(x.message, "err"); } }}>
      <input required className="input sm:col-span-2" placeholder="Address line" value={f.line1} onChange={set("line1")} aria-label="Address line" />
      <input className="input" placeholder="Village" value={f.village} onChange={set("village")} aria-label="Village" />
      <input required className="input" placeholder="District" value={f.district} onChange={set("district")} aria-label="District" />
      <input required className="input" placeholder="State" value={f.state} onChange={set("state")} aria-label="State" />
      <input required pattern="\d{6}" className="input" placeholder="Pincode (6 digits)" value={f.pincode} onChange={set("pincode")} aria-label="Pincode" />
      <button className="btn-primary sm:col-span-2">Save address</button>
    </form>
  );
}

export function Addresses() {
  const { data, reload } = useFetch<Address[]>("/addresses");
  return (<div className="space-y-3"><h1 className="text-xl font-bold">Saved addresses</h1>
    {data?.map((a) => <div key={a.id} className="card flex justify-between text-sm"><span>{a.line1}, {a.district} {a.pincode}</span><button className="text-red-600" onClick={async () => { await api.del(`/addresses/${a.id}`); reload(); }}>Delete</button></div>)}
    <div className="card"><h2 className="font-semibold">Add address</h2><AddressForm onSaved={reload} /></div></div>);
}

export function Orders() {
  const { data, loading, error } = useFetch<any[]>("/orders");
  if (loading) return <Skeleton />; if (error) return <ErrorBox text={error} />;
  return (<div className="space-y-2"><h1 className="text-xl font-bold">My orders</h1>{!data?.length && <Empty text="No orders yet." />}
    {data?.map((o) => <Link key={o.id} to={`/orders/${o.id}`} className="card flex justify-between text-sm"><span>{o.order_number} · {new Date(o.placed_at).toLocaleDateString()}</span><span><b>{rupees(o.total_paise)}</b> · {o.status.replace(/_/g, " ")}</span></Link>)}</div>);
}

export function OrderDetail() {
  const { id } = useParams();
  const { data: o, loading, error, reload } = useFetch<any>(`/orders/${id}`);
  const toast = useToast();
  if (loading) return <Skeleton />; if (error || !o) return <ErrorBox text={error || "Not found"} />;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="card space-y-2 text-sm md:col-span-2" id="invoice">
        <h1 className="text-lg font-bold">Order {o.order_number}</h1>
        <p className="text-xs text-slate-500">{o.payment_note}{o.is_demo && " · Demo order"}</p>
        <table className="w-full"><thead><tr className="text-left text-xs text-slate-500"><th>Item</th><th>Qty</th><th className="text-right">Amount</th></tr></thead>
          <tbody>{o.items.map((i: any) => <tr key={i.sku}><td>{i.name}</td><td>{i.quantity}</td><td className="text-right">{rupees(i.line_total_paise)}</td></tr>)}</tbody></table>
        <div className="border-t pt-2 text-right">Subtotal {rupees(o.subtotal_paise)} · Discount {rupees(-o.discount_paise)} · Delivery {rupees(o.delivery_fee_paise)}<div className="font-bold">Total {rupees(o.total_paise)} <span className="font-normal text-xs">(incl. GST {rupees(o.tax_included_paise)})</span></div></div>
        <p className="text-xs text-slate-500">Ship to: {o.ship_to.name}, {o.ship_to.line1}, {o.ship_to.district} {o.ship_to.pincode}</p>
        <div className="flex gap-2"><button className="btn-ghost" onClick={() => window.print()}>Print invoice</button>
          {["PLACED", "CONFIRMED"].includes(o.status) && <button className="btn-danger" onClick={async () => { try { await api.post(`/orders/${o.id}/cancel`); toast("Order cancelled"); reload(); } catch (e: any) { toast(e.message, "err"); } }}>Cancel order</button>}</div>
      </div>
      <div className="card h-fit"><h2 className="font-semibold">Delivery timeline</h2>
        <ol className="mt-2 space-y-2 border-l-2 border-forest-100 pl-3 text-sm">{o.timeline.map((t: any, i: number) => <li key={i}><b>{t.status.replace(/_/g, " ")}</b><div className="text-xs text-slate-500">{new Date(t.at).toLocaleString()}</div></li>)}</ol></div>
    </div>
  );
}

export function MyFarm() {
  const { data: d } = useFetch<any[]>("/crop/diagnoses");
  return (<div className="space-y-3"><h1 className="text-xl font-bold">My Farm</h1><p className="text-sm text-slate-600">Your crop assessments and follow-ups.</p>
    {!d?.length && <Empty text="No diagnoses yet. Try the Crop Doctor." />}
    {d?.map((x) => <Link key={x.id} to={`/diagnoses/${x.id}`} className="card flex justify-between text-sm"><span>{x.crop || "Crop"} · {new Date(x.created_at).toLocaleDateString()}</span><span>{x.status.replace(/_/g, " ")}</span></Link>)}</div>);
}

export function Account() {
  const { data } = useFetch<any>("/auth/me");
  return <div className="card max-w-md text-sm"><h1 className="text-lg font-bold">Profile</h1><p>{data?.full_name} · {data?.email}</p><Link to="/addresses" className="underline">Manage addresses</Link></div>;
}
