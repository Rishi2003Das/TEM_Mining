import { formatCrore } from "../types";

interface KpiCardProps {
  label: string;
  value: number;
  unit?: string;
  icon: string;
  variant: "indigo" | "blue" | "amber" | "emerald" | "rose";
  comingSoon?: boolean;
}

export function KpiCard({
  label,
  value,
  unit = "INR Cr",
  icon,
  variant,
  comingSoon = false,
}: KpiCardProps) {
  return (
    <div className={`kpi-card kpi-card--${variant} animate-in`}>
      <div className={`kpi-card__icon kpi-card__icon--${variant}`}>{icon}</div>
      <div className="kpi-card__label">{label}</div>
      {comingSoon ? (
        <div className="kpi-card__value" style={{ fontSize: "1.1rem", color: "var(--text-tertiary)" }}>
          Coming Soon
        </div>
      ) : (
        <div className="kpi-card__value">
          {formatCrore(value)}
          <span className="kpi-card__unit">{unit}</span>
        </div>
      )}
    </div>
  );
}
