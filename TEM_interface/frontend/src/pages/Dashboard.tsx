import { useScenarioData } from "../hooks/useScenarioData";
import { ScenarioSwitches } from "../components/ScenarioSwitches";
import { KpiCard } from "../components/KpiCard";
import { CapexPieChart } from "../components/CapexPieChart";
import { OpexBarChart } from "../components/OpexBarChart";
import { GovtDonutChart } from "../components/GovtDonutChart";
import { YearlyAreaChart } from "../components/YearlyAreaChart";
import { BreakdownTable } from "../components/BreakdownTable";
import { ProductionScheduleTable } from "../components/ProductionScheduleTable";

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
    return (
      <div className="loading-state">
        <div style={{ fontSize: "3rem" }}>⚠️</div>
        <div className="loading-text" style={{ color: "var(--accent-rose)" }}>
          {error}
        </div>
        <div className="loading-text">
          Make sure the API server is running on{" "}
          <code style={{ color: "var(--accent-primary)" }}>http://localhost:4000</code>
        </div>
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
