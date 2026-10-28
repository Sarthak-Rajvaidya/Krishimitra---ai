import { Leaf, LogOut } from "lucide-react";
import { ReactNode } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { BRAND } from "../components/ui";
import { useAuth } from "../hooks/useAuth";

export interface NavItem { to: string; label: string }

export default function DashboardLayout({ items, title }: { items: NavItem[]; title: string }): ReactNode {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="bg-forest-900 text-forest-100 md:w-56 md:shrink-0">
        <div className="flex items-center gap-2 px-4 py-4 font-bold text-white"><Leaf className="text-leaf-400" aria-hidden />{BRAND}</div>
        <div className="px-4 pb-2 text-xs uppercase tracking-wide text-forest-100/60">{title}</div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:overflow-visible" aria-label={title}>
          {items.map((i) => <NavLink key={i.to} to={i.to} end className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-2 text-sm ${isActive ? "bg-forest-700 text-white" : "hover:bg-forest-800"}`}>{i.label}</NavLink>)}
        </nav>
        <div className="mt-auto hidden px-4 py-4 text-xs md:block">
          <div className="truncate">{user?.full_name}</div><div className="text-forest-100/60">{user?.role}</div>
          <Link to="/" className="mt-2 block underline">Storefront</Link>
          <button className="mt-2 flex items-center gap-1" onClick={async () => { await logout(); nav("/login"); }}><LogOut size={14} aria-hidden /> Sign out</button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 bg-cream p-4 md:p-6"><Outlet /></main>
    </div>
  );
}
