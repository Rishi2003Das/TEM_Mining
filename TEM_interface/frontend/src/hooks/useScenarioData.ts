import { useState, useEffect, useCallback, useMemo } from "react";
import {
  type SwitchState,
  type ScenarioData,
  type CapexBreakdown,
  type ChartDataItem,
  type YearlyChartData,
  YEAR_HEADERS,
  PIE_COLORS,
  sumYearly,
  API_BASE,
} from "../types";

export function useScenarioData() {
  const [switches, setSwitches] = useState<SwitchState>({
    miningMode: "Departmental",
    preTaxPreFinance: "Yes",
    coalPriceType: "Commercial",
    coalMiningMachinery: "Surface Miner",
    priceCorrelationFactor: 1.6,
  });

  const [scenario, setScenario] = useState<ScenarioData | null>(null);
  const [capexBreakdown, setCapexBreakdown] = useState<CapexBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Build scenario key from current switch state
  const scenarioKey = useMemo(() => {
    const machineryKey = switches.coalMiningMachinery.replace(/[- ]/g, "");
    return `${switches.miningMode}_${switches.preTaxPreFinance}_${switches.coalPriceType}_${machineryKey}`;
  }, [
    switches.miningMode,
    switches.preTaxPreFinance,
    switches.coalPriceType,
    switches.coalMiningMachinery,
  ]);

  // Fetch scenario data
  const fetchScenario = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [scenarioRes, breakdownRes] = await Promise.all([
        fetch(`${API_BASE}/scenarios/${scenarioKey}`),
        fetch(`${API_BASE}/capex-breakdown`),
      ]);
      if (!scenarioRes.ok) throw new Error("Failed to load scenario data");
      if (!breakdownRes.ok) throw new Error("Failed to load CAPEX breakdown");

      const scenarioData: ScenarioData = await scenarioRes.json();
      const breakdownData: CapexBreakdown = await breakdownRes.json();

      setScenario(scenarioData);
      setCapexBreakdown(breakdownData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [scenarioKey]);

  useEffect(() => {
    fetchScenario();
  }, [fetchScenario]);

  // ── Derived data for charts ───────────────────────────────────

  // Owner CAPEX pie chart data
  const ownerCapexPieData: ChartDataItem[] = useMemo(() => {
    if (!scenario || !capexBreakdown) return [];

    const isDepartmental = switches.miningMode === "Departmental";

    const components: { name: string; value: number }[] = [
      { name: "Pre-Operative", value: capexBreakdown.pre_operative },
      { name: "Land & R&R", value: capexBreakdown.land + capexBreakdown.rr },
    ];

    if (isDepartmental) {
      const dynamicHemmInitial = scenario.results.capex.hemm_initial
        ? sumYearly(scenario.results.capex.hemm_initial)
        : capexBreakdown.hemm_initial;
      const dynamicHemmSustaining = scenario.results.capex.hemm_sustaining
        ? sumYearly(scenario.results.capex.hemm_sustaining)
        : capexBreakdown.hemm_replacement;

      components.push({
        name: "HEMM (Initial + Replacement)",
        value: dynamicHemmInitial + dynamicHemmSustaining,
      });
    }

    // CHP & Infrastructure
    const chpVal = capexBreakdown.breakups["CHP"] || 0;
    const civilVal = capexBreakdown.breakups["Civil Infrastructure, Roads, Water Supply etc."] || 0;
    components.push({ name: "CHP & Infrastructure", value: chpVal + civilVal });

    // Railway Siding
    components.push({
      name: "Railway Siding",
      value: capexBreakdown.breakups["Railway Siding"] || 0,
    });

    // Others (Fire, Workshop, Electrical, Dewatering, Digitalisation)
    const othersKeys = [
      "Fire Fighting/Dust Suppression/Cleaning system etc.",
      "Workshop and Store (E&M)",
      "Electrical",
      "Mine Dewatering System",
      "Digitalisation",
    ];
    const othersVal = othersKeys.reduce(
      (s, k) => s + (capexBreakdown.breakups[k] || 0),
      0
    );
    if (isDepartmental) {
      // Workshop, Dewatering are part of Owner in Departmental
      components.push({ name: "Others", value: othersVal });
    } else {
      // In MDO mode, Workshop & Dewatering go to MDO
      const mdoKeys = ["Workshop and Store (E&M)", "Mine Dewatering System"];
      const ownerOthers = othersKeys
        .filter((k) => !mdoKeys.includes(k))
        .reduce((s, k) => s + (capexBreakdown.breakups[k] || 0), 0);
      components.push({ name: "Others", value: ownerOthers });
    }

    // Upfront Amount
    components.push({ name: "Upfront Amount", value: 99.07 });

    // Contingency (15% of non-upfront items)
    const capexData = scenario.results.capex;
    const totalOwner = sumYearly(capexData.owner_total);
    const itemSum = components.reduce((s, c) => s + c.value, 0);
    const contingency = totalOwner - itemSum;
    if (contingency > 0) {
      components.push({ name: "Contingency", value: contingency });
    }

    const total = components.reduce((s, c) => s + c.value, 0);

    return components
      .filter((c) => c.value > 0)
      .map((c, i) => ({
        name: c.name,
        value: Math.round(c.value * 100) / 100,
        color: PIE_COLORS[i % PIE_COLORS.length],
        percentage: Math.round((c.value / total) * 1000) / 10,
      }));
  }, [scenario, capexBreakdown, switches.miningMode]);

  // Owner OPEX bar chart data
  const ownerOpexBarData: ChartDataItem[] = useMemo(() => {
    if (!scenario) return [];

    const opex = scenario.results.opex;
    const items: { name: string; key: keyof typeof opex }[] = [
      { name: "Diesel", key: "diesel" },
      { name: "Lubrication", key: "lubrication" },
      { name: "HEMM Spares", key: "spares" },
      { name: "Tyres", key: "tyres" },
      { name: "CHP", key: "chp" },
      { name: "Power", key: "power" },
      { name: "Wages", key: "wage" },
      { name: "Explosives", key: "explosives" },
      { name: "Civil Infra", key: "civil_infra" },
      { name: "Railway Maint.", key: "railway" },
      { name: "Fire & Dust", key: "fire" },
      { name: "Rehandling", key: "rehandling" },
      { name: "Digitalisation", key: "digital" },
      { name: "Environment", key: "env" },
      { name: "Misc.", key: "misc" },
      { name: "Admin", key: "admin" },
      { name: "R&R", key: "rr" },
      { name: "Contingency", key: "contingency" },
    ];

    const subtotal = sumYearly(opex.subtotal);

    return items
      .map((item, i) => {
        const value = sumYearly(opex[item.key]);
        return {
          name: item.name,
          value: Math.round(value * 100) / 100,
          color: PIE_COLORS[i % PIE_COLORS.length],
          percentage: subtotal > 0 ? Math.round((value / subtotal) * 1000) / 10 : 0,
        };
      })
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [scenario]);

  // Government fees donut data
  const govtDonutData: ChartDataItem[] = useMemo(() => {
    if (!scenario) return [];

    const govt = scenario.results.government;
    const items: { name: string; key: keyof typeof govt }[] = [
      { name: "Revenue Sharing", key: "final_revenue_sharing" },
      { name: "GST (Rev. Sharing)", key: "gst_revenue_sharing" },
      { name: "Royalty", key: "royalty" },
      { name: "DMF", key: "dmf" },
      { name: "NMET", key: "nmet" },
      { name: "Surface Rent", key: "surface_rent" },
      { name: "GST (Royalty etc.)", key: "gst_royalty_etc" },
      { name: "Mine Closure", key: "mine_closure" },
      { name: "Bank Fee", key: "bank_fee" },
    ];

    const total = sumYearly(govt.total_fees_with_mc_bank);

    return items
      .map((item, i) => {
        const value = sumYearly(govt[item.key]);
        return {
          name: item.name,
          value: Math.round(value * 100) / 100,
          color: PIE_COLORS[i % PIE_COLORS.length],
          percentage: total > 0 ? Math.round((value / total) * 1000) / 10 : 0,
        };
      })
      .filter((d) => d.value > 0);
  }, [scenario]);

  const years = useMemo(() => {
    if (!scenario || !scenario.results.production_schedule?.coal_production) {
      return YEAR_HEADERS;
    }
    return Object.keys(scenario.results.production_schedule.coal_production)
      .map(Number)
      .sort((a, b) => a - b)
      .map(String);
  }, [scenario]);

  // Year-by-year stacked area chart
  const yearlyChartData: YearlyChartData[] = useMemo(() => {
    if (!scenario) return [];

    return years.map((yr) => ({
      year: `Yr ${yr}`,
      ownerCapex: Math.round((scenario.results.capex.owner_total[yr] || 0) * 100) / 100,
      ownerOpex: Math.round((scenario.results.opex.subtotal[yr] || 0) * 100) / 100,
      govtFees: Math.round(
        (scenario.results.government.total_fees_with_mc_bank[yr] || 0) * 100
      ) / 100,
      mdoContractor: Math.round(
        (scenario.results.opex.mdo_contractor[yr] || 0) * 100
      ) / 100,
    }));
  }, [scenario, years]);

  // Summary KPIs
  const kpis = useMemo(() => {
    if (!scenario) return null;

    const capex = scenario.results.capex;
    const opex = scenario.results.opex;
    const govt = scenario.results.government;

    return {
      totalOwnerCapex: sumYearly(capex.owner_total),
      totalMdoCapex: sumYearly(capex.mdo_total),
      totalProjectCapex: sumYearly(capex.project_total),
      totalOwnerOpex: sumYearly(opex.subtotal),
      totalMdoContractor: sumYearly(opex.mdo_contractor),
      totalGovtFees: sumYearly(govt.total_fees_with_mc_bank),
      totalProjectOpex: sumYearly(scenario.results.project_grand_total_opex),
    };
  }, [scenario]);

  return {
    switches,
    setSwitches,
    scenario,
    capexBreakdown,
    loading,
    error,
    scenarioKey,
    ownerCapexPieData,
    ownerOpexBarData,
    govtDonutData,
    yearlyChartData,
    kpis,
    refetch: fetchScenario,
    years,
  };
}
