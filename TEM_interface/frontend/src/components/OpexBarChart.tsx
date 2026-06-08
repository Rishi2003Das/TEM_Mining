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
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartDataItem }> }) {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div
        style={{
          background: "var(--glass-bg)",
          backdropFilter: "blur(12px)",
          border: "var(--border-accent)",
          borderRadius: "10px",
          padding: "12px 16px",
          boxShadow: "var(--glass-shadow)",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4, color: d.color }}>
          {d.name}
        </div>
        <div style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>
          ₹ {formatCroreExact(d.value)} Cr
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
          {d.percentage}% of total
        </div>
      </div>
    );
  }
  return null;
}

export function OpexBarChart({ data, title = "Owner OPEX Breakdown (LOM)" }: OpexBarChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="glass-card chart-container">
      <div className="glass-card__header">
        <div className="glass-card__title">
          <div className="glass-card__title-icon" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" }}>📈</div>
          {title}
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
          Total: ₹ {formatCroreExact(total)} Cr
        </div>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(300, data.length * 28)}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
          <XAxis type="number" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
          <YAxis
            dataKey="name"
            type="category"
            width={100}
            tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99, 102, 241, 0.05)" }} />
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
