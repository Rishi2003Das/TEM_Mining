import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ChartDataItem } from "../types";
import { formatCroreExact } from "../types";

interface OpexBarChartProps {
  data: ChartDataItem[];
  title?: string;
  unit?: string;
}

function CustomTooltip({ active, payload, unit }: { active?: boolean; payload?: Array<{ payload: ChartDataItem }>; unit?: string }) {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    const isRsPerTon = unit?.includes("/ton") || unit?.includes("/t");
    return (
      <div
        style={{
          background: "rgba(15, 23, 42, 0.95)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(99, 102, 241, 0.2)",
          borderRadius: "10px",
          padding: "12px 16px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4, color: d.color }}>
          {d.name}
        </div>
        <div style={{ fontSize: "0.85rem", color: "#f1f5f9" }}>
          {isRsPerTon ? `₹ ${d.value.toFixed(2)} /ton` : `₹ ${formatCroreExact(d.value)} Cr`}
        </div>
        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
          {d.percentage}% of total
        </div>
      </div>
    );
  }
  return null;
}

export function OpexBarChart({ data, title = "Owner OPEX Breakdown (LOM)", unit = "₹ Cr" }: OpexBarChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const isRsPerTon = unit.includes("/ton") || unit.includes("/t");

  return (
    <div className="glass-card chart-container">
      <div className="glass-card__header">
        <div className="glass-card__title">
          <div className="glass-card__title-icon" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" }}>📈</div>
          {title}
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
          Total: {isRsPerTon ? `₹ ${total.toFixed(2)} /ton` : `₹ ${formatCroreExact(total)} Cr`}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(300, data.length * 28)}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
          <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis
            dataKey="name"
            type="category"
            width={100}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip unit={unit} />} cursor={{ fill: "rgba(99, 102, 241, 0.05)" }} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={800}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
