// ── TypeScript types for the TEM Dashboard ──────────────────────

export interface SwitchState {
  miningMode: "Departmental" | "MDO";
  preTaxPreFinance: "Yes" | "No";
  coalPriceType: "Commercial" | "NCI";
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
      hemm_initial?: YearlyValues;
      hemm_sustaining?: YearlyValues;
      idc?: YearlyValues;
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
    pnl?: {
      realisation: YearlyValues;
      operating_cost: YearlyValues;
      coal_purchase: YearlyValues;
      total_cost: YearlyValues;
      ebidta: YearlyValues;
      depreciation: YearlyValues;
      salvage: YearlyValues;
      ebit: YearlyValues;
      interest: YearlyValues;
      ebt: YearlyValues;
      tax: YearlyValues;
      pat: YearlyValues;
      csr: YearlyValues;
      pat_after_csr: YearlyValues;
    };
    tax?: {
      normal_tax: YearlyValues;
      tax_rate: number;
    };
    borrowings?: {
      owner: {
        total_interest: YearlyValues;
        total_borrowings: YearlyValues;
        total_repayments: YearlyValues;
        debt_pct: number;
      };
      mdo: {
        total_interest: YearlyValues;
        total_borrowings: YearlyValues;
        total_repayments: YearlyValues;
        debt_pct: number;
      };
    };
    cashflow?: {
      project_cf: YearlyValues;
      project_cumulative: YearlyValues;
      equity_cf: YearlyValues;
      equity_cumulative: YearlyValues;
      project_irr: number | null;
      project_npv: number;
      equity_irr: number | null;
      equity_npv: number;
      payback_years: number | null;
      discount_rate: number;
    };
    revenue?: YearlyValues;
    production_schedule?: {
      coal_production: YearlyValues;
      waste_volume: YearlyValues;
      topsoil_volume: YearlyValues;
      waste_rehandling: YearlyValues;
      partings: YearlyValues;
      ob_volume: YearlyValues;
      chp_rehandling: YearlyValues;
      blasted_coal: YearlyValues;
      sm_coal: YearlyValues;
      stripping_ratio: YearlyValues;
      rehandling_cost: YearlyValues;
      available_hours: YearlyValues;
      gcv_adb: YearlyValues;
      relative_density: YearlyValues;
      raw_ash: YearlyValues;
      moisture: YearlyValues;
      cumulative_stripping_ratio: YearlyValues;
      haul_rom: YearlyValues;
      haul_waste: YearlyValues;
      haul_in_pit: YearlyValues;
      haul_ex_pit: YearlyValues;
      haul_rehandling: YearlyValues;
      bench_height_coal: YearlyValues;
      bench_width_coal: YearlyValues;
      bench_height_ob: YearlyValues;
      bench_width_ob: YearlyValues;
    };
    production_schedule_lom?: {
      coal_production: number;
      waste_volume: number;
      topsoil_volume: number;
      waste_rehandling: number;
      partings: number;
      ob_volume: number;
      chp_rehandling: number;
      blasted_coal: number;
      sm_coal: number;
      stripping_ratio: number;
      rehandling_cost: number;
      available_hours: number;
      gcv_adb: number;
      relative_density: number;
      raw_ash: number;
      moisture: number;
      cumulative_stripping_ratio: number;
      haul_rom: number;
      haul_waste: number;
      haul_in_pit: number;
      haul_ex_pit: number;
      haul_rehandling: number;
      bench_height_coal: number;
      bench_width_coal: number;
      bench_height_ob: number;
      bench_width_ob: number;
    };
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
export const API_BASE = import.meta.env.VITE_API_BASE 
  ? `${import.meta.env.VITE_API_BASE}/api`
  : "http://localhost:4000/api";

