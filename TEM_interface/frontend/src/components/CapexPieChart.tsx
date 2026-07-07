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

interface CapexPieChartProps {
  data: ChartDataItem[];
  title?: string;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartDataItem }> }) {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="chart-tooltip">
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
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", justifyContent: "center", marginTop: 8 }}>
      {payload?.map((entry, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.7rem", color: "#94a3b8" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: entry.color, flexShrink: 0 }} />
          {entry.value}
        </div>
      ))}
    </div>
  );
}

export function CapexPieChart({ data, title = "Owner CAPEX Breakdown" }: CapexPieChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="glass-card chart-container">
      <div className="glass-card__header">
        <div className="glass-card__title">
          <div className="glass-card__title-icon" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#6366f1" }}>📊</div>
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
            innerRadius={45}
            paddingAngle={2}
            dataKey="value"
            stroke="rgba(10, 14, 26, 0.8)"
            strokeWidth={2}
            animationBegin={0}
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
