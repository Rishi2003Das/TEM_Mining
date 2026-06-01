import type { ChartDataItem } from "../types";
import { formatCroreExact } from "../types";

interface BreakdownTableProps {
  data: ChartDataItem[];
  title: string;
  icon?: string;
  iconBg?: string;
  iconColor?: string;
}

export function BreakdownTable({
  data,
  title,
  icon = "📋",
  iconBg = "rgba(99, 102, 241, 0.15)",
  iconColor = "#6366f1",
}: BreakdownTableProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="glass-card animate-in">
      <div className="glass-card__header">
        <div className="glass-card__title">
          <div className="glass-card__title-icon" style={{ background: iconBg, color: iconColor }}>
            {icon}
          </div>
          {title}
        </div>
      </div>
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Component</th>
              <th style={{ textAlign: "right" }}>LOM Total (₹ Cr)</th>
              <th style={{ textAlign: "right" }}>Share (%)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                <td>
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: row.color,
                      marginRight: 8,
                      verticalAlign: "middle",
                    }}
                  />
                  {row.name}
                </td>
                <td className="value">{formatCroreExact(row.value)}</td>
                <td className="percentage">{row.percentage?.toFixed(1)}%</td>
              </tr>
            ))}
            <tr className="total-row">
              <td>Total</td>
              <td className="value">{formatCroreExact(total)}</td>
              <td className="percentage">100.0%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
