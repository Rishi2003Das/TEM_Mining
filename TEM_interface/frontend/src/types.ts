// ── TypeScript types for the TEM Dashboard ──────────────────────

export interface SwitchState {
  miningMode: "Departmental" | "MDO";
  preTaxPreFinance: "Yes" | "No";
  coalPriceType: "Commercial" | "NCI";
  // Future switches (UI-only for now)
  coalMiningMachinery: "Surface Miner" | "Shovel-Dumper";
  priceCorrelationFactor: number;
}

export interface YearlyValues {
  [year: string]: number;
}

export interface ScenarioData {
  projectId: string;
  snapshotId: string;
  scenarioKey: string;
  computedAt: string;
  switches: {
    mining_mode: string;
    pre_tax_pre_finance: string;
    coal_price_type: string;
  };
  results: {
    capex: {
      owner_initial: YearlyValues;
      owner_sustaining: YearlyValues;
      owner_total: YearlyValues;
      mdo_initial: YearlyValues;
      mdo_sustaining: YearlyValues;
      mdo_total: YearlyValues;
      project_initial: YearlyValues;
      project_sustaining: YearlyValues;
      project_total: YearlyValues;
    };
    opex: {
      diesel: YearlyValues;
      lubrication: YearlyValues;
      spares: YearlyValues;
      tyres: YearlyValues;
      chp: YearlyValues;
      power: YearlyValues;
      wage: YearlyValues;
      explosives: YearlyValues;
      civil_infra: YearlyValues;
      railway: YearlyValues;
      fire: YearlyValues;
      rehandling: YearlyValues;
      digital: YearlyValues;
      env: YearlyValues;
      misc: YearlyValues;
      admin: YearlyValues;
      rr: YearlyValues;
      contingency: YearlyValues;
      subtotal: YearlyValues;
      mdo_contractor: YearlyValues;
    };
    government: {
      revenue_sharing: YearlyValues;
      adjusted_upfront: YearlyValues;
      final_revenue_sharing: YearlyValues;
      gst_revenue_sharing: YearlyValues;
      royalty: YearlyValues;
      dmf: YearlyValues;
      nmet: YearlyValues;
      surface_rent: YearlyValues;
      gst_royalty_etc: YearlyValues;
      mine_closure: YearlyValues;
      bank_fee: YearlyValues;
      total_fees: YearlyValues;
      total_fees_with_mc_bank: YearlyValues;
    };
    project_grand_total_opex: YearlyValues;
  };
}

export interface CapexBreakdown {
  pre_operative: number;
  land: number;
  rr: number;
  hemm_initial: number;
  hemm_replacement: number;
  breakups: { [key: string]: number };
}

export interface ChartDataItem {
  name: string;
  value: number;
  color: string;
  percentage?: number;
}

export interface YearlyChartData {
  year: string;
  ownerCapex: number;
  ownerOpex: number;
  govtFees: number;
  mdoContractor: number;
}

// Year headers used across the model
export const YEAR_HEADERS = [
  "-4", "-3", "-2", "-1",
  "1", "2", "3", "4", "5", "6", "7", "8", "9",
  "10", "11", "12", "13", "14", "15", "16", "17", "18", "19",
];

export const PRODUCTION_YEARS = [
  "1", "2", "3", "4", "5", "6", "7", "8", "9",
  "10", "11", "12", "13", "14", "15", "16", "17", "18", "19",
];

// Chart colour palette
export const CHART_COLORS = {
  indigo: "#6366f1",
  violet: "#8b5cf6",
  blue: "#3b82f6",
  cyan: "#22d3ee",
  emerald: "#10b981",
  amber: "#f59e0b",
  orange: "#f97316",
  rose: "#f43f5e",
  pink: "#ec4899",
  teal: "#14b8a6",
  lime: "#84cc16",
  sky: "#0ea5e9",
  fuchsia: "#d946ef",
  red: "#ef4444",
  slate: "#64748b",
  purple: "#a855f6",
};

// Colour arrays for charts
export const PIE_COLORS = [
  "#6366f1", "#8b5cf6", "#3b82f6", "#22d3ee",
  "#10b981", "#f59e0b", "#f97316", "#f43f5e",
  "#ec4899", "#14b8a6", "#84cc16", "#0ea5e9",
];

// Utility: sum all yearly values
export function sumYearly(values: YearlyValues): number {
  return Object.values(values).reduce((s, v) => s + (v || 0), 0);
}

// Utility: format number as INR Crore
export function formatCrore(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(1);
}

export function formatCroreExact(value: number): string {
  return value.toFixed(2);
}

// API base URL
export const API_BASE = "http://localhost:4000/api";
