import { formatCrore } from "../types";

interface KpiCardProps {
  label: string;
  value: number;
  unit?: string;
  icon: string;
  variant: "indigo" | "blue" | "amber" | "emerald" | "rose" | "violet" | "cyan" | "orange";
  comingSoon?: boolean;
  customDisplay?: string;
}

export function KpiCard({
  label,
  value,
  unit = "INR Cr",
  icon,
  variant,
  comingSoon = false,
  customDisplay,
}: KpiCardProps) {
  return (
    <div className={`kpi-card kpi-card--${variant} animate-in`}>
      <div className={`kpi-card__icon kpi-card__icon--${variant}`}>{icon}</div>
      <div className="kpi-card__label">{label}</div>
      {comingSoon ? (
        <div className="kpi-card__value" style={{ fontSize: "1.1rem", color: "var(--text-tertiary)" }}>
          Coming Soon
        </div>
      ) : customDisplay ? (
        <div className="kpi-card__value" style={{ fontSize: "1.3rem" }}>
          {customDisplay}
        </div>
      ) : (
        <div className="kpi-card__value">
          {unit.includes("/ton") || unit.includes("/t")
            ? value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
            : formatCrore(value)}
          <span className="kpi-card__unit">{unit}</span>
        </div>
      )}
    </div>
  );
}
