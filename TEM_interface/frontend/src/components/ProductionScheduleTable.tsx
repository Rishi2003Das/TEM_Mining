import { useMemo } from "react";
import type { ScenarioData } from "../types";
import { YEAR_HEADERS, formatCroreExact } from "../types";

interface ProductionScheduleTableProps {
  scenario: ScenarioData;
}

export function ProductionScheduleTable({ scenario }: ProductionScheduleTableProps) {
  const ps = scenario.results.production_schedule;

  const years = useMemo(() => {
    if (!ps || !ps.coal_production) return YEAR_HEADERS;
    return Object.keys(ps.coal_production)
      .map(Number)
      .sort((a, b) => a - b)
      .map(String);
  }, [ps]);

  if (!ps) return null;

  // List of rows to display, including section headers
  const rows = [
    { isHeader: false, key: "available_hours", label: "Total Available Hours excavation", unit: "hrs", type: "constant" },
    { isHeader: false, key: "coal_production", label: "Production Coal/Ore", unit: "Mt", type: "sum" },
    { isHeader: false, key: "blasted_coal", label: "  - Blasted Coal/Ore", unit: "Mt", type: "sum" },
    { isHeader: false, key: "sm_coal", label: "  - Surface Miner Coal/Ore", unit: "Mt", type: "sum" },
    { isHeader: false, key: "waste_volume", label: "Waste (Topsoil + OB + Partings)", unit: "Mbcm", type: "sum" },
    { isHeader: false, key: "topsoil_volume", label: "  - Topsoil", unit: "Mbcm", type: "sum" },
    { isHeader: false, key: "ob_volume", label: "  - Overburden (OB)", unit: "Mbcm", type: "sum" },
    { isHeader: false, key: "partings", label: "  - Partings", unit: "Mbcm", type: "sum" },
    { isHeader: false, key: "chp_rehandling", label: "Rehandling at CHP", unit: "Mbcm", type: "sum" },
    { isHeader: false, key: "waste_rehandling", label: "Waste - Rehandle", unit: "Mbcm", type: "sum" },
    { isHeader: false, key: "gcv_adb", label: "GCV (ADB)", unit: "kcal/kg", type: "average" },
    { isHeader: false, key: "relative_density", label: "Relative Density (RD)", unit: "g/cm³", type: "average" },
    { isHeader: false, key: "raw_ash", label: "Raw Ash", unit: "%", type: "average" },
    { isHeader: false, key: "moisture", label: "Moisture", unit: "%", type: "average" },
    
    // Group Header
    { isHeader: true, key: "", label: "Stripping Ratio", unit: "", type: "" },
    { isHeader: false, key: "stripping_ratio", label: "YoY", unit: "cum/t", type: "stripping_ratio" },
    { isHeader: false, key: "cumulative_stripping_ratio", label: "Cumulative", unit: "cum/t", type: "stripping_ratio" },
    
    // Group Header
    { isHeader: true, key: "", label: "Haul Distance", unit: "", type: "" },
    { isHeader: false, key: "haul_rom", label: "ROM", unit: "km", type: "average" },
    { isHeader: false, key: "haul_waste", label: "Waste", unit: "km", type: "average" },
    { isHeader: false, key: "haul_in_pit", label: "  - In-Pit", unit: "km", type: "average" },
    { isHeader: false, key: "haul_ex_pit", label: "  - Ex-Pit", unit: "km", type: "average" },
    { isHeader: false, key: "haul_rehandling", label: "  - Rehandling", unit: "km", type: "average" },
    
    // Group Header
    { isHeader: true, key: "", label: "Bench Specification", unit: "", type: "" },
    { isHeader: false, key: "bench_height_coal", label: "Bench Height - Coal", unit: "m", type: "constant" },
    { isHeader: false, key: "bench_width_coal", label: "Bench Width - Coal", unit: "m", type: "constant" },
    { isHeader: false, key: "bench_height_ob", label: "Bench Height - OB/IB", unit: "m", type: "constant" },
    { isHeader: false, key: "bench_width_ob", label: "Bench Width - OB/IB", unit: "m", type: "constant" },
    
    // Group Header
    { isHeader: true, key: "", label: "Rehandling Cost", unit: "", type: "" },
    { isHeader: false, key: "rehandling_cost", label: "Rehandling Cost", unit: "₹/ton", type: "sum" },
  ];

  // Retrieve LOM for each row from DB or calculate as fallback
  const getLOM = (rowKey: string, type: string): number => {
    const lomVal = (scenario.results.production_schedule_lom as Record<string, number> | undefined)?.[rowKey];
    if (lomVal !== undefined && lomVal !== null) {
      return lomVal;
    }
    
    const values = (ps as Record<string, any>)[rowKey];
    if (!values) return 0;
    
    if (type === "sum") {
      return (Object.values(values) as any[]).reduce<number>((s, v) => s + (v || 0), 0);
    } else if (type === "stripping_ratio") {
      const totalWaste = (Object.values(ps.waste_volume || {}) as any[]).reduce<number>((s, v) => s + (v || 0), 0);
      const totalCoal = (Object.values(ps.coal_production || {}) as any[]).reduce<number>((s, v) => s + (v || 0), 0);
      return totalCoal > 0 ? totalWaste / totalCoal : 0;
    }
    return 0;
  };

  // Custom cell formatter to match Excel display style
  const formatValue = (val: number | undefined | null, rowKey: string, isLom: boolean = false) => {
    if (val === undefined || val === null) return "-";
    
    if (rowKey.startsWith("bench_")) {
      if (!isLom) return "-";
      return val.toFixed(0);
    }
    
    if (val === 0) {
      if (
        rowKey === "coal_production" || 
        rowKey === "waste_volume" || 
        rowKey === "topsoil_volume" || 
        rowKey === "ob_volume" || 
        rowKey === "partings" ||
        rowKey === "rehandling_cost"
      ) {
        return "0.00";
      }
      return "-";
    }
    
    if (rowKey === "available_hours" || rowKey === "gcv_adb") {
      return Math.round(val).toLocaleString();
    }
    
    if (rowKey === "relative_density") {
      return val.toFixed(2);
    }
    
    if (rowKey === "raw_ash" || rowKey === "moisture") {
      return `${val.toFixed(2)}%`;
    }
    
    return formatCroreExact(val);
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
      <div className="data-table-wrapper" style={{ maxHeight: "650px", overflowY: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ minWidth: "240px", position: "sticky", left: 0, background: "var(--bg-secondary)", zIndex: 3 }}>
                Parameter
              </th>
              <th>Unit</th>
              <th style={{ textAlign: "right", fontWeight: 600 }}>LOM Total/Avg</th>
              {years.map((yr) => (
                <th key={yr} style={{ textAlign: "right", minWidth: "75px" }}>
                   Yr {yr}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              if (row.isHeader) {
                return (
                  <tr key={`header-${index}`} style={{ background: "rgba(255, 255, 255, 0.02)" }}>
                    <td 
                      colSpan={years.length + 3} 
                      style={{ 
                        position: "sticky", 
                        left: 0, 
                        background: "var(--bg-tertiary)", 
                        zIndex: 2,
                        padding: "0.5rem 0.75rem",
                        color: "var(--accent-primary)",
                        borderBottom: "var(--border-subtle)",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase"
                      }}
                    >
                      {row.label}
                    </td>
                  </tr>
                );
              }

              const isSubItem = row.label.startsWith("  -");
              
              let lomValue = getLOM(row.key, row.type);
              let values = (ps as Record<string, any>)[row.key] || {};
              
              if (row.key === "rehandling_cost") {
                const totalCoal = getLOM("coal_production", "sum");
                lomValue = totalCoal > 0 ? (lomValue / totalCoal) * 10 : 0;
                
                const originalValues = values;
                values = {};
                Object.keys(originalValues).forEach((yr) => {
                  const coalProd = ps.coal_production?.[yr] || 0;
                  const rawCost = originalValues[yr] || 0;
                  values[yr] = coalProd > 0 ? (rawCost / coalProd) * 10 : 0;
                });
              }
              
              return (
                <tr key={row.key} style={isSubItem ? { fontStyle: "italic", opacity: 0.85 } : undefined}>
                  <td style={{ 
                    position: "sticky", 
                    left: 0, 
                    background: "var(--bg-secondary)", 
                    zIndex: 2,
                    fontWeight: isSubItem ? 400 : 500,
                    paddingLeft: isSubItem ? "1.5rem" : "0.75rem"
                  }}>
                    {row.label}
                  </td>
                  <td style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>{row.unit}</td>
                  <td className="value" style={{ fontWeight: 600, textAlign: "right" }}>
                    {formatValue(lomValue, row.key, true)}
                  </td>
                  {years.map((yr) => {
                    const val = values[yr];
                    return (
                      <td key={yr} className="value" style={{ textAlign: "right" }}>
                        {formatValue(val, row.key, false)}
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
