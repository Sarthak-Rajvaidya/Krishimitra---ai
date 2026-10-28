import { Leaf, LogOut, Menu, Search, ShoppingCart, User as UserIcon } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { BRAND } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";

const NAV = [["/shop", "Shop All"], ["/shop/fertilizers", "Fertilizers"], ["/shop/crop-protection", "Crop Protection"], ["/shop/seeds", "Seeds"],
  ["/shop/micronutrients", "Micronutrients"], ["/shop/equipment", "Equipment"]];

export default function StoreLayout() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const submit = (e: FormEvent) => { e.preventDefault(); if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`); };
  const staff = user && user.role !== "FARMER";
  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>
      <header className="sticky top-0 z-30 border-b border-forest-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
          <button className="md:hidden" aria-label="Menu" onClick={() => setOpen(!open)}><Menu /></button>
          <Link to="/" className="flex items-center gap-1 font-bold text-forest-800"><Leaf className="text-leaf-500" aria-hidden />{BRAND}</Link>
          <form onSubmit={submit} className="relative mx-auto hidden max-w-md flex-1 sm:block" role="search">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" aria-hidden />
            <input aria-label="Search products" value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9" placeholder="Search products, crops, uses…" />
          </form>
          <div className="ml-auto flex items-center gap-3 text-sm">
            {user?.role === "FARMER" && <Link to="/cart" aria-label={`Cart, ${count} items`} className="relative"><ShoppingCart /><span className="absolute -right-2 -top-2 rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white">{count}</span></Link>}
            {staff && <Link className="btn-ghost" to={`/${user!.role.toLowerCase()}`}>Dashboard</Link>}
            {user ? (<>
              {user.role === "FARMER" && <Link to="/account" aria-label="Account"><UserIcon /></Link>}
              <button aria-label="Sign out" onClick={async () => { await logout(); nav("/"); }}><LogOut size={18} /></button>
            </>) : <Link className="btn-primary" to="/login">Sign in</Link>}
          </div>
        </div>
        <form onSubmit={submit} className="px-4 pb-2 sm:hidden" role="search"><input aria-label="Search products" value={q} onChange={(e) => setQ(e.target.value)} className="input" placeholder="Search products…" /></form>
        <nav className={`${open ? "block" : "hidden"} border-t border-forest-100 md:block`} aria-label="Categories">
          <div className="mx-auto flex max-w-6xl flex-wrap gap-x-5 gap-y-1 px-4 py-2 text-sm">
            {NAV.map(([to, label]) => <NavLink key={to} to={to} end className={({ isActive }) => (isActive ? "font-semibold text-forest-700" : "text-slate-600 hover:text-forest-700")}>{label}</NavLink>)}
            {user?.role === "FARMER" && <>
              <NavLink to="/crop-doctor" className="font-semibold text-amber-600">AI Crop Doctor</NavLink>
              <NavLink to="/advisory" className="font-semibold text-amber-600">Krishi Advisory</NavLink>
              <NavLink to="/my-farm" className="text-slate-600">My Farm</NavLink>
            </>}
          </div>
        </nav>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 py-6"><Outlet /></main>
      <footer className="border-t border-forest-100 py-6 text-center text-xs text-slate-500">
        {BRAND} demo prototype. Sample prices and stock are fictional. AI output is decision support, not agronomic prescription. <Link to="/help" className="underline">Help</Link>
      </footer>
    </div>
  );
}
