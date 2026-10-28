import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { rupees } from "../services/api";

const COLORS = ["#256b3d", "#4daa57", "#d9921b", "#6a8caf", "#8b5e83", "#b5543c"];

export function SalesLine({ data }: { data: { period: string; net_sales_paise: number; gross_profit_paise: number }[] }) {
  if (!data.length) return <p className="text-sm text-slate-500">No sales in this range.</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data.map((d) => ({ ...d, net: d.net_sales_paise / 100, profit: d.gross_profit_paise / 100 }))}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="period" fontSize={11} /><YAxis fontSize={11} />
        <Tooltip formatter={(v: number) => rupees(v * 100)} /><Legend />
        <Line type="monotone" dataKey="net" name="Net sales" stroke="#256b3d" dot={false} strokeWidth={2} />
        <Line type="monotone" dataKey="profit" name="Gross profit" stroke="#d9921b" dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
export function Bars({ data, x, y, money = false, color = "#256b3d" }: { data: Record<string, any>[]; x: string; y: string; money?: boolean; color?: string }) {
  if (!data.length) return <p className="text-sm text-slate-500">No data in this range.</p>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data.map((d) => ({ ...d, [y]: money ? d[y] / 100 : d[y] }))}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey={x} fontSize={11} interval={0} angle={-15} height={50} /><YAxis fontSize={11} />
        <Tooltip formatter={(v: number) => (money ? rupees(v * 100) : v)} /><Bar dataKey={y} fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
export function Donut({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) return <p className="text-sm text-slate-500">No data.</p>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} label>{data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart>
    </ResponsiveContainer>
  );
}
