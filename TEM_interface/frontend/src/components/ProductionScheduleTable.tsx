import type { ScenarioData } from "../types";
import { YEAR_HEADERS, formatCroreExact } from "../types";

interface ProductionScheduleTableProps {
  scenario: ScenarioData;
}

export function ProductionScheduleTable({ scenario }: ProductionScheduleTableProps) {
  const ps = scenario.results.production_schedule;
  if (!ps) return null;

  // We define the list of rows to display:
  // key in ps, label, unit, type ('sum' or 'average' or 'stripping_ratio')
  const rows = [
    { key: "coal_production", label: "Production Coal/Ore", unit: "Mt", type: "sum" },
    { key: "blasted_coal", label: "  - Blasted Coal/Ore", unit: "Mt", type: "sum" },
    { key: "sm_coal", label: "  - Surface Miner Coal/Ore", unit: "Mt", type: "sum" },
    { key: "waste_volume", label: "Waste (Topsoil + OB + Partings)", unit: "Mbcm", type: "sum" },
    { key: "topsoil_volume", label: "  - Topsoil", unit: "Mbcm", type: "sum" },
    { key: "ob_volume", label: "  - Overburden (OB)", unit: "Mbcm", type: "sum" },
    { key: "partings", label: "  - Partings", unit: "Mbcm", type: "sum" },
    { key: "chp_rehandling", label: "Rehandling at CHP", unit: "Mbcm", type: "sum" },
    { key: "waste_rehandling", label: "Waste - Rehandle", unit: "Mbcm", type: "sum" },
    { key: "stripping_ratio", label: "Stripping Ratio (YoY)", unit: "cum/t", type: "stripping_ratio" },
    { key: "rehandling_cost", label: "Rehandling Cost", unit: "₹ Cr", type: "sum" },
  ] as const;

  // Calculate LOM for each row
  const getLOM = (rowKey: typeof rows[number]["key"], type: string) => {
    const values = ps[rowKey];
    if (!values) return 0;
    
    if (type === "sum") {
      return Object.values(values).reduce((s, v) => s + (v || 0), 0);
    } else if (type === "stripping_ratio") {
      // LOM Stripping Ratio = total waste / total coal
      const totalWaste = Object.values(ps.waste_volume || {}).reduce((s, v) => s + (v || 0), 0);
      const totalCoal = Object.values(ps.coal_production || {}).reduce((s, v) => s + (v || 0), 0);
      return totalCoal > 0 ? totalWaste / totalCoal : 0;
    }
    return 0;
  };

  return (
    <div className="glass-card animate-in" style={{ width: "100%" }}>
      <div className="glass-card__header">
        <div className="glass-card__title">
          <div className="glass-card__title-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
            🚜
          </div>
          Production Schedule & Derived Volumes
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
          Year-by-year production metrics, waste decomposition, and stripping ratios.
        </div>
      </div>
      <div className="data-table-wrapper" style={{ maxHeight: "500px", overflowY: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ minWidth: "220px", position: "sticky", left: 0, background: "var(--bg-surface)", zIndex: 3 }}>
                Parameter
              </th>
              <th>Unit</th>
              <th style={{ textAlign: "right", fontWeight: 600 }}>LOM Total/Avg</th>
              {YEAR_HEADERS.map((yr) => (
                <th key={yr} style={{ textAlign: "right", minWidth: "70px" }}>
                  Yr {yr}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const lomValue = getLOM(row.key, row.type);
              const values = ps[row.key] || {};
              const isSubItem = row.label.startsWith("  -");
              
              return (
                <tr key={row.key} style={isSubItem ? { fontStyle: "italic", opacity: 0.85 } : undefined}>
                  <td style={{ 
                    position: "sticky", 
                    left: 0, 
                    background: "var(--bg-surface)", 
                    zIndex: 2,
                    fontWeight: isSubItem ? 400 : 500,
                    paddingLeft: isSubItem ? "1.5rem" : "0.75rem"
                  }}>
                    {row.label}
                  </td>
                  <td style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>{row.unit}</td>
                  <td className="value" style={{ fontWeight: 600, textAlign: "right" }}>
                    {formatCroreExact(lomValue)}
                  </td>
                  {YEAR_HEADERS.map((yr) => {
                    const val = values[yr];
                    return (
                      <td key={yr} className="value" style={{ textAlign: "right" }}>
                        {val !== undefined ? formatCroreExact(val) : "0.00"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
