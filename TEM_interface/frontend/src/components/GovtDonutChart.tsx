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

function CustomLegend({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", justifyContent: "center", marginTop: 8 }}>
      {payload?.map((entry, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.68rem", color: "#94a3b8" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: entry.color, flexShrink: 0 }} />
          {entry.value}
        </div>
      ))}
    </div>
  );
}

export function GovtDonutChart({ data, title = "Government Fees & Taxes", unit = "₹ Cr" }: GovtDonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const isRsPerTon = unit.includes("/ton") || unit.includes("/t");

  return (
    <div className="glass-card chart-container">
      <div className="glass-card__header">
        <div className="glass-card__title">
          <div className="glass-card__title-icon" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}>🏛️</div>
          {title}
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
          Total: {isRsPerTon ? `₹ ${total.toFixed(2)} /ton` : `₹ ${formatCroreExact(total)} Cr`}
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
            stroke="rgba(10, 14, 26, 0.8)"
            strokeWidth={2}
            animationBegin={100}
            animationDuration={800}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip unit={unit} />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
