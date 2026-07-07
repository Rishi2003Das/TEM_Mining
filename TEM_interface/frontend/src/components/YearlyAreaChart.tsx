import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import type { YearlyChartData } from "../types";

interface YearlyAreaChartProps {
  data: YearlyChartData[];
  showMdoContractor?: boolean;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip" style={{ minWidth: 180 }}>
        <div style={{ fontWeight: 600, marginBottom: 8, color: "var(--text-primary)", fontSize: "0.85rem" }}>
          {label}
        </div>
        {payload.map((p, i) => {
          const isCapex = p.name.includes("CAPEX");
          return (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 3, fontSize: "0.8rem" }}>
              <span style={{ color: p.color }}>{p.name}</span>
              <span style={{ color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                {isCapex ? `₹ ${p.value.toFixed(1)} Cr` : `₹ ${p.value.toFixed(1)} /ton`}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
}

export function YearlyAreaChart({ data, showMdoContractor = false }: YearlyAreaChartProps) {
  return (
    <div className="glass-card chart-container">
      <div className="glass-card__header">
        <div className="glass-card__title">
          <div className="glass-card__title-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>📉</div>
          Year-by-Year Cost Profile
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
          CAPEX: INR Cr | OPEX & Fees: ₹/ton
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="gradCapex" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradOpex" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradGovt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradMdo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 10, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 10, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            width={35}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 10, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: "0.75rem", color: "#94a3b8" }}
          />
          <Area
            type="monotone"
            yAxisId="left"
            dataKey="ownerCapex"
            name="Owner CAPEX"
            stroke="#6366f1"
            fillOpacity={1}
            fill="url(#gradCapex)"
            strokeWidth={2}
            animationDuration={800}
          />
          <Area
            type="monotone"
            yAxisId="right"
            dataKey="ownerOpex"
            name="Owner OPEX"
            stroke="#3b82f6"
            fillOpacity={1}
            fill="url(#gradOpex)"
            strokeWidth={2}
            animationDuration={800}
          />
          <Area
            type="monotone"
            yAxisId="right"
            dataKey="govtFees"
            name="Govt Fees"
            stroke="#f59e0b"
            fillOpacity={1}
            fill="url(#gradGovt)"
            strokeWidth={2}
            animationDuration={800}
          />
          {showMdoContractor && (
            <Area
              type="monotone"
              yAxisId="right"
              dataKey="mdoContractor"
              name="MDO Contractor"
              stroke="#f43f5e"
              fillOpacity={1}
              fill="url(#gradMdo)"
              strokeWidth={2}
              animationDuration={800}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
