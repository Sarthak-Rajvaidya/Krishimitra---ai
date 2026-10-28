import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { Role } from "../types";

export const BRAND = import.meta.env.VITE_BRAND_NAME || "KrishiSetu AI";

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return <div className="space-y-2" aria-busy="true">{Array.from({ length: rows }).map((_, i) => <div key={i} className="skeleton h-6 w-full" />)}</div>;
}
export function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-forest-100 p-8 text-center text-sm text-slate-500">{text}</div>; }
export function ErrorBox({ text, retry }: { text: string; retry?: () => void }) {
  return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{text}{retry && <button className="ml-3 underline" onClick={retry}>Retry</button>}</div>;
}
export function DemoBadge({ show = true }: { show?: boolean }) { return show ? <span className="badge bg-amber-500/15 text-amber-600">Demo data</span> : null; }
export function Kpi({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return <div className="card"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 text-2xl font-bold text-forest-800">{value}</div>{hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}</div>;
}
export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <label className="block"><span className="label">{label}</span>{children}{error && <span className="mt-1 block text-xs text-red-600">{error}</span>}</label>;
}

export function RequireRole({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8"><Skeleton /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;  // UX only; API still enforces
  return <>{children}</>;
}

export function RangePicker({ value, onChange }: { value: { range: string; start?: string; end?: string }; onChange: (v: { range: string; start?: string; end?: string }) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select aria-label="Date range" className="input w-auto" value={value.range} onChange={(e) => onChange({ ...value, range: e.target.value })}>
        <option value="today">Today</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option>
        <option value="90d">Last 90 days</option><option value="custom">Custom range</option>
      </select>
      {value.range === "custom" && (<>
        <input aria-label="Start date" type="date" className="input w-auto" value={value.start || ""} onChange={(e) => onChange({ ...value, start: e.target.value })} />
        <input aria-label="End date" type="date" className="input w-auto" value={value.end || ""} onChange={(e) => onChange({ ...value, end: e.target.value })} />
      </>)}
    </div>
  );
}
export const rangeQs = (v: { range: string; start?: string; end?: string }) =>
  `range=${v.range}${v.range === "custom" && v.start && v.end ? `&start=${v.start}&end=${v.end}` : ""}`;
