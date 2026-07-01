import { useScenarioData } from "../hooks/useScenarioData";
import { ScenarioSwitches } from "../components/ScenarioSwitches";
import { KpiCard } from "../components/KpiCard";
import { CapexPieChart } from "../components/CapexPieChart";
import { OpexBarChart } from "../components/OpexBarChart";
import { GovtDonutChart } from "../components/GovtDonutChart";
import { YearlyAreaChart } from "../components/YearlyAreaChart";
import { BreakdownTable } from "../components/BreakdownTable";
import { ProductionScheduleTable } from "../components/ProductionScheduleTable";
import { API_BASE } from "../types";

export function Dashboard() {
  const {
    switches,
    setSwitches,
    loading,
    error,
    ownerCapexPieData,
    mdoCapexPieData,
    ownerOpexBarData,
    govtDonutData,
    yearlyChartData,
    kpis,
    scenario,
    projectMetadata,
    refetch,
  } = useScenarioData();

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <div className="loading-text">Loading scenario data from MongoDB…</div>
      </div>
    );
  }

  if (error) {
    const isLocalhost = API_BASE.includes("localhost");
    return (
      <div className="loading-state">
        <div style={{ fontSize: "3rem" }}>⚠️</div>
        <div className="loading-text" style={{ color: "var(--accent-rose)", fontWeight: 700, fontSize: "1.2rem" }}>
          {error}
        </div>
        <div className="loading-text" style={{ marginTop: "0.5rem" }}>
          Attempting to connect to:{" "}
          <code style={{ color: "var(--accent-primary)", background: "rgba(99,102,241,0.12)", padding: "2px 8px", borderRadius: "4px" }}>
            {API_BASE}
          </code>
        </div>
        {isLocalhost ? (
          <div className="loading-text" style={{ marginTop: "1rem", lineHeight: 1.7 }}>
            <strong>To start the local API server:</strong>
            <br />
            <code style={{ color: "var(--accent-primary)", display: "block", marginTop: "0.5rem", background: "rgba(99,102,241,0.08)", padding: "8px 14px", borderRadius: "6px", fontSize: "0.85rem" }}>
              cd TEM_interface/server && node server.js
            </code>
          </div>
        ) : (
          <div className="loading-text" style={{ marginTop: "1rem", lineHeight: 1.7 }}>
            <strong>Deployed backend not configured.</strong>
            <br />
            Set <code style={{ color: "var(--accent-primary)" }}>VITE_API_BASE</code> in your Vercel/Render environment variables
            to point to your deployed backend URL (e.g. <code style={{ color: "var(--accent-primary)" }}>https://your-api.onrender.com</code>).
            <br />
            See <strong>DEPLOYMENT.md</strong> for full instructions.
          </div>
        )}
        <button
          onClick={() => refetch()}
          style={{ marginTop: "1.5rem", padding: "10px 28px", borderRadius: "8px", border: "none", background: "var(--accent-primary)", color: "#fff", fontWeight: 600, fontSize: "1rem", cursor: "pointer" }}
        >
          🔄 Retry Connection
        </button>
      </div>
    );
  }

  const isPreTax = switches.preTaxPreFinance === "Yes";
  const isMDO = switches.miningMode === "MDO";

  /* helper to format IRR as percentage */
  const fmtIrr = (v: number | null | undefined) =>
    v != null && isFinite(v) && v > -1 && v < 5 ? `${(v * 100).toFixed(2)}%` : "—";
  const fmtCr = (v: number) => `₹ ${v.toFixed(1)} Cr`;

  return (
    <div>
      {/* Project Metadata Banner */}
      {projectMetadata && projectMetadata.projectId && (
        <div className="glass-card animate-in" style={{ padding: "18px 24px", marginBottom: "var(--space-md)", borderLeft: "4px solid var(--accent-primary)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
            <div>
              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>Project ID</span>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#f1f5f9", margin: "2px 0 0 0" }}>{projectMetadata.projectId}</h2>
            </div>
            
            <div style={{ display: "flex", gap: "32px" }}>
              {projectMetadata.projectManager && (
                <div>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", display: "block" }}>Project Manager</span>
                  <span style={{ fontSize: "0.9rem", color: "#e2e8f0", fontWeight: 600 }}>{projectMetadata.projectManager}</span>
                </div>
              )}
              {projectMetadata.clientCompany && (
                <div>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", display: "block" }}>Client Company</span>
                  <span style={{ fontSize: "0.9rem", color: "#e2e8f0", fontWeight: 600 }}>{projectMetadata.clientCompany}</span>
                </div>
              )}
            </div>
          </div>
          {projectMetadata.projectDescription && (
            <p style={{ margin: "14px 0 0 0", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "10px" }}>
              {projectMetadata.projectDescription}
            </p>
          )}
        </div>
      )}

      {/* Scenario Controls */}
      <ScenarioSwitches
        switches={switches}
        onChange={(updates) =>
          setSwitches((prev) => ({ ...prev, ...updates }))
        }
      />

      {/* KPI Summary Cards */}
      <div className="kpi-grid">
        {isMDO ? (
          <>
            <KpiCard
              label="Owner CAPEX (LOM)"
              value={kpis?.totalOwnerCapex || 0}
              icon="🏗️"
              variant="indigo"
            />
            <KpiCard
              label="MDO CAPEX (LOM)"
              value={kpis?.totalMdoCapex || 0}
              icon="🚜"
              variant="blue"
            />
            <KpiCard
              label="Project CAPEX (LOM)"
              value={kpis?.totalProjectCapex || 0}
              icon="🏢"
              variant="violet"
            />
            <KpiCard
              label="Owner OPEX (LOM)"
              value={kpis?.totalOwnerOpex || 0}
              unit="₹/ton"
              icon="⚡"
              variant="rose"
            />
            <KpiCard
              label="MDO OPEX (LOM)"
              value={kpis?.totalMdoContractor || 0}
              unit="₹/ton"
              icon="⛏️"
              variant="cyan"
            />
            <KpiCard
              label="Government Fees (LOM)"
              value={kpis?.totalGovtFees || 0}
              unit="₹/ton"
              icon="🏛️"
              variant="amber"
            />
            <KpiCard
              label="Project OPEX (LOM)"
              value={kpis?.totalProjectOpex || 0}
              unit="₹/ton"
              icon="📊"
              variant="emerald"
            />
          </>
        ) : (
          <>
            <KpiCard
              label="Owner CAPEX (LOM)"
              value={kpis?.totalOwnerCapex || 0}
              icon="🏗️"
              variant="indigo"
            />
            <KpiCard
              label="Owner OPEX (LOM)"
              value={kpis?.totalOwnerOpex || 0}
              unit="₹/ton"
              icon="⚡"
              variant="blue"
            />
            <KpiCard
              label="Government Fees (LOM)"
              value={kpis?.totalGovtFees || 0}
              unit="₹/ton"
              icon="🏛️"
              variant="amber"
            />
            <KpiCard
              label="Project OPEX (LOM)"
              value={kpis?.totalProjectOpex || 0}
              unit="₹/ton"
              icon="📊"
              variant="emerald"
            />
          </>
        )}
      </div>

      {/* Financial KPIs — IRR, NPV, Tax, Interest */}
      <div className="section-header" style={{ marginTop: "var(--space-lg)" }}>
        <div className="section-header__bar" />
        <h2 className="section-header__title">Financial Summary</h2>
        <span className="section-header__subtitle">
          {isPreTax
            ? "Pre-Tax & Pre-Finance Basis (No Debt, No Tax)"
            : "Full Financial Model (With Debt & Tax)"}
        </span>
      </div>

      <div className="kpi-grid">
        <KpiCard
          label="Project IRR"
          value={0}
          icon="📈"
          variant="emerald"
          customDisplay={fmtIrr(kpis?.projectIrr)}
        />
        <KpiCard
          label="Equity IRR"
          value={0}
          icon="📊"
          variant="cyan"
          customDisplay={
            isPreTax
              ? `${fmtIrr(kpis?.equityIrr)} (= Project)`
              : fmtIrr(kpis?.equityIrr)
          }
        />
        <KpiCard
          label="Project NPV @ 10%"
          value={kpis?.projectNpv || 0}
          icon="💰"
          variant="violet"
        />
        <KpiCard
          label="EBIDTA (LOM)"
          value={kpis?.lomEbidta || 0}
          icon="📋"
          variant="indigo"
        />
        <KpiCard
          label={isPreTax ? "Tax (Pre-Tax Basis)" : "Corporate Tax (LOM)"}
          value={kpis?.lomTax || 0}
          icon="🏛️"
          variant="amber"
          customDisplay={isPreTax ? "₹ 0 (Pre-Tax)" : fmtCr(kpis?.lomTax || 0)}
        />
        <KpiCard
          label={isPreTax ? "Interest (Pre-Finance)" : "Interest (LOM)"}
          value={kpis?.lomInterest || 0}
          icon="🏦"
          variant="rose"
          customDisplay={isPreTax ? "₹ 0 (Pre-Finance)" : fmtCr(kpis?.lomInterest || 0)}
        />
        <KpiCard
          label="PAT (LOM)"
          value={kpis?.lomPat || 0}
          icon="✅"
          variant="blue"
        />
        {!isPreTax && (
          <KpiCard
            label="IDC (LOM)"
            value={kpis?.lomIdc || 0}
            icon="🔗"
            variant="orange"
          />
        )}
      </div>

      {/* P&L Waterfall Summary */}
      {kpis && (
        <div className="glass-card animate-in" style={{ marginTop: "var(--space-lg)" }}>
          <div className="glass-card__header">
            <div className="glass-card__title">
              <div className="glass-card__title-icon" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#6366f1" }}>📊</div>
              P&L Summary (Life of Mine)
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>All values in INR Crore</div>
          </div>
          <div style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <tbody>
                {[
                  { label: "Revenue (Realisation)", value: kpis.lomRevenue, bold: false, color: "#10b981" },
                  { label: "Less: Operating Cost", value: -(kpis.lomRevenue - kpis.lomEbidta), bold: false, color: "#ef4444" },
                  { label: "EBIDTA", value: kpis.lomEbidta, bold: true, color: "#6366f1" },
                  { label: "Less: Depreciation", value: -kpis.lomDepreciation, bold: false, color: "#f59e0b" },
                  { label: "EBIT", value: kpis.lomEbit, bold: true, color: "#8b5cf6" },
                  { label: isPreTax ? "Less: Interest (Pre-Finance → ₹0)" : "Less: Interest", value: -kpis.lomInterest, bold: false, color: isPreTax ? "#64748b" : "#f43f5e" },
                  { label: "EBT", value: kpis.lomEbit - kpis.lomInterest, bold: true, color: "#3b82f6" },
                  { label: isPreTax ? "Less: Tax (Pre-Tax → ₹0)" : `Less: Tax @ 25.17%`, value: -kpis.lomTax, bold: false, color: isPreTax ? "#64748b" : "#f43f5e" },
                  { label: "PAT (Profit After Tax)", value: kpis.lomPat, bold: true, color: "#10b981" },
                  { label: "Less: CSR @ 2%", value: -kpis.lomCsr, bold: false, color: "#64748b" },
                  { label: "PAT after CSR", value: kpis.lomPatAfterCsr, bold: true, color: "#22d3ee" },
                ].map((row, i) => (
                  <tr key={i} style={{
                    borderBottom: row.bold ? "2px solid rgba(99,102,241,0.2)" : "1px solid rgba(255,255,255,0.05)",
                    background: row.bold ? "rgba(99,102,241,0.04)" : "transparent",
                  }}>
                    <td style={{ padding: "10px 16px", fontWeight: row.bold ? 700 : 400, color: "var(--text-primary)" }}>{row.label}</td>
                    <td style={{
                      padding: "10px 16px",
                      textAlign: "right",
                      fontWeight: row.bold ? 700 : 400,
                      fontVariantNumeric: "tabular-nums",
                      color: row.color,
                    }}>
                      {row.value >= 0 ? "" : "("}{fmtCr(Math.abs(row.value))}{row.value >= 0 ? "" : ")"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts - 2x2 Grid */}
      <div className="section-header" style={{ marginTop: "var(--space-xl)" }}>
        <div className="section-header__bar" />
        <h2 className="section-header__title">Financial Analysis</h2>
        <span className="section-header__subtitle">
          Scenario: {switches.miningMode} | Pre-Tax: {switches.preTaxPreFinance} | Price: {switches.coalPriceType}
        </span>
      </div>

      <div className="charts-grid">
        <CapexPieChart
          data={ownerCapexPieData}
          title={isMDO ? "Owner CAPEX (MDO Mode)" : "Owner CAPEX Breakdown"}
        />
        {isMDO && (
          <CapexPieChart
            data={mdoCapexPieData}
            title="MDO CAPEX Breakdown"
          />
        )}
        <GovtDonutChart data={govtDonutData} unit="₹/ton" />
        <OpexBarChart
          data={ownerOpexBarData}
          unit="₹/ton"
          title={isMDO ? "Owner OPEX (excl. MDO Contractor)" : "Owner OPEX Breakdown (LOM)"}
        />
        <div style={isMDO ? { gridColumn: "span 2" } : undefined}>
          <YearlyAreaChart
            data={yearlyChartData}
            showMdoContractor={isMDO}
          />
        </div>
      </div>

      {/* Production Schedule Section */}
      <div className="section-header" style={{ marginTop: "var(--space-xl)" }}>
        <div className="section-header__bar" />
        <h2 className="section-header__title">Production Schedule & Volumes</h2>
      </div>

      <div style={{ marginBottom: "var(--space-xl)" }}>
        {scenario && <ProductionScheduleTable scenario={scenario} />}
      </div>

      {/* Breakdown Tables */}
      <div className="section-header" style={{ marginTop: "var(--space-xl)" }}>
        <div className="section-header__bar" />
        <h2 className="section-header__title">Detailed Breakdown Tables</h2>
      </div>

      <div className="charts-grid" style={{ marginBottom: "var(--space-2xl)" }}>
        <BreakdownTable
          data={ownerCapexPieData}
          title="Owner CAPEX — Component Breakdown"
          unit="₹ Cr"
          icon="🏗️"
          iconBg="rgba(99, 102, 241, 0.15)"
          iconColor="#6366f1"
        />
        {isMDO && (
          <BreakdownTable
            data={mdoCapexPieData}
            title="MDO CAPEX — Component Breakdown"
            unit="₹ Cr"
            icon="🚜"
            iconBg="rgba(59, 130, 246, 0.15)"
            iconColor="#3b82f6"
          />
        )}
        <BreakdownTable
          data={ownerOpexBarData}
          title="Owner OPEX — Component Breakdown"
          unit="₹/ton"
          icon="⚡"
          iconBg="rgba(59, 130, 246, 0.15)"
          iconColor="#3b82f6"
        />
        <BreakdownTable
          data={govtDonutData}
          title="Government Fees & Taxes Breakdown"
          unit="₹/ton"
          icon="🏛️"
          iconBg="rgba(245, 158, 11, 0.15)"
          iconColor="#f59e0b"
        />
      </div>
    </div>
  );
}
