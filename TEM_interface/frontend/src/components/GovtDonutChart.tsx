import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { ChartDataItem } from "../types";
import { formatCroreExact } from "../types";

interface GovtDonutChartProps {
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

function CustomLegend({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", justifyContent: "center", marginTop: 8 }}>
      {payload?.map((entry, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.68rem", color: "var(--text-secondary)" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: entry.color, flexShrink: 0 }} />
          {entry.value}
        </div>
      ))}
    </div>
  );
}

export function GovtDonutChart({ data, title = "Government Fees & Taxes" }: GovtDonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="glass-card chart-container">
      <div className="glass-card__header">
        <div className="glass-card__title">
          <div className="glass-card__title-icon" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}>🏛️</div>
          {title}
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
          Total: ₹ {formatCroreExact(total)} Cr
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            outerRadius={100}
            innerRadius={55}
            paddingAngle={2}
            dataKey="value"
            stroke="var(--bg-primary)"
            strokeWidth={2}
            animationBegin={100}
            animationDuration={800}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
