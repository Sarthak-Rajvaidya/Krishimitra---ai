import { ReactNode } from "react";
import { Empty, Skeleton } from "./ui";

export interface Col<T> { head: string; cell: (r: T) => ReactNode; right?: boolean }
export default function DataTable<T>({ rows, cols, loading }: { rows: T[] | undefined; cols: Col<T>[]; loading?: boolean }) {
  if (loading || !rows) return <Skeleton rows={5} />;
  if (!rows.length) return <Empty text="Nothing to show yet." />;
  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead className="bg-forest-50 text-left text-xs uppercase text-slate-500"><tr>{cols.map((c) => <th key={c.head} className={`px-3 py-2 ${c.right ? "text-right" : ""}`}>{c.head}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-slate-100">{cols.map((c) => <td key={c.head} className={`px-3 py-2 ${c.right ? "text-right" : ""}`}>{c.cell(r)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
