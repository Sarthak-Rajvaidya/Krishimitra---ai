import { Leaf, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { useToast } from "../hooks/useToast";
import { rupees } from "../services/api";
import type { Product } from "../types";

export default function ProductCard({ p }: { p: Product }) {
  const { user } = useAuth();
  const { add } = useCart();
  const toast = useToast();
  return (
    <div className="card flex flex-col">
      <Link to={`/product/${p.id}`} className="mb-3 flex h-28 items-center justify-center rounded-lg bg-forest-50 text-forest-500" aria-label={p.name}>
        {p.image_url ? <img src={p.image_url} alt="" className="h-full object-contain" /> : <Leaf size={40} aria-hidden />}
      </Link>
      <Link to={`/product/${p.id}`} className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-forest-900 hover:underline">{p.name}</Link>
      <div className="mt-1 text-xs text-slate-500">{p.pack_size} · {p.category_name}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-lg font-bold text-forest-800">{rupees(p.price_paise)}</span>
        {p.unit_price_paise && p.unit !== "unit" && <span className="text-xs text-slate-500">{rupees(p.unit_price_paise)}/{p.unit}</span>}
      </div>
      <div className="mt-1 text-xs">
        {!p.in_stock ? <span className="badge bg-red-100 text-red-700">Out of stock</span>
          : p.low_stock ? <span className="badge bg-amber-500/15 text-amber-600">Only {p.stock} left</span>
          : <span className="badge bg-forest-100 text-forest-700">In stock</span>}
        {p.is_demo && <span className="ml-1 badge bg-slate-100 text-slate-600">Sample</span>}
      </div>
      {user?.role === "FARMER" ? (
        <button className="btn-primary mt-3" disabled={!p.in_stock} onClick={async () => { try { await add(p.id); toast(`${p.name} added to cart`); } catch (e: any) { toast(e.message, "err"); } }}>
          <ShoppingCart size={16} aria-hidden /> Add to cart
        </button>
      ) : !user ? <Link to="/login" className="btn-ghost mt-3">Sign in to buy</Link> : null}
    </div>
  );
}
