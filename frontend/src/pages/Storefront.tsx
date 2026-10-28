import { Camera, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ErrorBox, Empty, Skeleton } from "../components/ui";
import ProductCard from "../components/ProductCard";
import { useAuth } from "../hooks/useAuth";
import { useFetch } from "../hooks/useFetch";
import type { Product } from "../types";

interface Page { items: Product[]; total: number }

export function Home() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch<Page>("/products?size=8");
  return (
    <div className="space-y-6">
      <section className="card flex flex-col gap-3 bg-forest-800 text-white sm:flex-row sm:items-center">
        <div className="flex-1">
          <h1 className="text-xl font-bold">Check your crop, then check availability and price.</h1>
          <p className="mt-1 text-sm text-forest-100">Upload a photo for an AI assessment backed by cited sources. Options shown with evidence and label limits, never pushed by price.</p>
        </div>
        <div className="flex gap-2">
          <Link className="btn bg-amber-500 text-white hover:bg-amber-600" to={user?.role === "FARMER" ? "/crop-doctor" : "/login"}><Camera size={16} aria-hidden /> Crop Doctor</Link>
          <Link className="btn bg-white text-forest-800" to={user?.role === "FARMER" ? "/advisory" : "/login"}><MessageCircle size={16} aria-hidden /> Ask Advisory</Link>
        </div>
      </section>
      <h2 className="text-lg font-bold text-forest-900">Popular products <span className="badge bg-amber-500/15 text-amber-600">Sample catalogue</span></h2>
      {error ? <ErrorBox text={error} retry={reload} /> : loading ? <Skeleton rows={4} /> : <Grid items={data!.items} />}
    </div>
  );
}

function Grid({ items }: { items: Product[] }) {
  return items.length ? <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{items.map((p) => <ProductCard key={p.id} p={p} />)}</div> : <Empty text="No products match your filters." />;
}

export function Shop({ search = false }: { search?: boolean }) {
  const { slug } = useParams();
  const [sp] = useSearchParams();
  const q = sp.get("q") || "";
  const [sort, setSort] = useState("relevance");
  const [inStock, setInStock] = useState(false);
  const [max, setMax] = useState("");
  const qs = new URLSearchParams({ size: "60", sort });
  if (slug) qs.set("category", slug);
  if (search && q) qs.set("q", q);
  if (inStock) qs.set("in_stock", "true");
  if (max) qs.set("max_price", String(Number(max) * 100));
  const { data, loading, error, reload } = useFetch<Page>(`/products?${qs}`);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-forest-900">{search ? `Results for “${q}”` : slug ? slug.replace("-", " ") : "All products"}{data && <span className="ml-2 text-sm font-normal text-slate-500">{data.total} items</span>}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-1"><input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} /> In stock</label>
          <label className="flex items-center gap-1">Max ₹<input aria-label="Maximum price in rupees" className="input w-24" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} /></label>
          <select aria-label="Sort" className="input w-auto" value={sort} onChange={(e) => setSort(e.target.value)}><option value="relevance">Relevance</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></select>
        </div>
      </div>
      {error ? <ErrorBox text={error} retry={reload} /> : loading ? <Skeleton rows={4} /> : <Grid items={data!.items} />}
    </div>
  );
}

export function ProductPage() {
  const { id } = useParams();
  const { data: p, loading, error } = useFetch<Product>(`/products/${id}`);
  const { user } = useAuth();
  if (loading) return <Skeleton rows={5} />;
  if (error || !p) return <ErrorBox text={error || "Not found"} />;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="card flex h-64 items-center justify-center text-forest-500">{p.image_url ? <img src={p.image_url} alt={p.name} className="h-full object-contain" /> : <span className="text-sm text-slate-500">No image</span>}</div>
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-forest-900">{p.name}</h1>
        <p className="text-sm text-slate-600">{p.description}</p>
        <ProductCard p={p} />
        <div className="card text-sm"><h2 className="font-semibold">Safety information</h2><p className="mt-1 text-slate-600">{p.safety_info || "None on file."}</p>
          <p className="mt-2 text-xs text-slate-500">{p.label_verified ? "Label metadata verified." : "Label metadata not yet verified: always read the registered product label before use."}</p></div>
        {!user && <p className="text-xs text-slate-500"><Link to="/login" className="underline">Sign in</Link> to add to cart.</p>}
      </div>
    </div>
  );
}

export function Help() {
  return (
    <div className="card max-w-2xl space-y-2 text-sm">
      <h1 className="text-lg font-bold">Help and support</h1>
      <p>Orders are Cash on Delivery or a clearly labelled <strong>simulated</strong> online payment (no real money moves in this demo).</p>
      <p>Crop Doctor gives a preliminary AI assessment, not a diagnosis. Advisory answers cite the documents they came from; if no evidence is found it says so. Confirm pesticide decisions with a qualified agronomist.</p>
      <p>Support contact: add your real helpline here before launch.</p>
    </div>
  );
}
