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
    ownerOpexBarData,
    govtDonutData,
    yearlyChartData,
    kpis,
    scenario,
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

  const isMDO = switches.miningMode === "MDO";

  return (
    <div>
      {/* Scenario Controls */}
      <ScenarioSwitches
        switches={switches}
        onChange={(updates) =>
          setSwitches((prev) => ({ ...prev, ...updates }))
        }
      />

      {/* KPI Summary Cards */}
      <div className="kpi-grid">
        <KpiCard
          label="Owner CAPEX (LOM)"
          value={kpis?.totalOwnerCapex || 0}
          icon="🏗️"
          variant="indigo"
        />
        <KpiCard
          label={isMDO ? "MDO CAPEX (LOM)" : "Owner OPEX (LOM)"}
          value={isMDO ? kpis?.totalMdoCapex || 0 : kpis?.totalOwnerOpex || 0}
          unit={isMDO ? "INR Cr" : "₹/ton"}
          icon={isMDO ? "🚜" : "⚡"}
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
        <KpiCard
          label="IRR (Equity)"
          value={0}
          icon="📈"
          variant="rose"
          comingSoon
        />
      </div>

      {/* Charts - 2x2 Grid */}
      <div className="section-header">
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
        <GovtDonutChart data={govtDonutData} unit="₹/ton" />
        <OpexBarChart
          data={ownerOpexBarData}
          unit="₹/ton"
          title={isMDO ? "Owner OPEX (excl. MDO Contractor)" : "Owner OPEX Breakdown (LOM)"}
        />
        <YearlyAreaChart
          data={yearlyChartData}
          showMdoContractor={isMDO}
        />
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
