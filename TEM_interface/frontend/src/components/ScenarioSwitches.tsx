import type { SwitchState } from "../types";

interface ScenarioSwitchesProps {
  switches: SwitchState;
  onChange: (updates: Partial<SwitchState>) => void;
}

export function ScenarioSwitches({ switches, onChange }: ScenarioSwitchesProps) {
  return (
    <div className="switch-panel animate-in">
      <div className="switch-panel__title">
        <span>⚙️</span>
        Scenario Controls
      </div>

      {/* Switch 1: Coal Mining Machinery (Coming Soon) */}
      <div className="switch-group">
        <div className="switch-group__label">
          Coal Mining Machinery <span className="badge badge--coming-soon">Coming Soon</span>
        </div>
        <div className="switch-toggle">
          <button
            className={`switch-toggle__option switch-toggle__option--disabled ${
              switches.coalMiningMachinery === "Surface Miner"
                ? "switch-toggle__option--active"
                : ""
            }`}
            disabled
          >
            Surface Miner
          </button>
          <button
            className="switch-toggle__option switch-toggle__option--disabled"
            disabled
          >
            Shovel-Dumper
          </button>
        </div>
      </div>

      {/* Switch 2: Mining Operation */}
      <div className="switch-group">
        <div className="switch-group__label">Mining Operation</div>
        <div className="switch-toggle">
          <button
            className={`switch-toggle__option ${
              switches.miningMode === "Departmental"
                ? "switch-toggle__option--active"
                : ""
            }`}
            onClick={() => onChange({ miningMode: "Departmental" })}
          >
            Departmental
          </button>
          <button
            className={`switch-toggle__option ${
              switches.miningMode === "MDO" ? "switch-toggle__option--active" : ""
            }`}
            onClick={() => onChange({ miningMode: "MDO" })}
          >
            MDO
          </button>
        </div>
      </div>

      {/* Switch 3: Pre-Tax & Pre-Finance Basis */}
      <div className="switch-group">
        <div className="switch-group__label">Pre-Tax & Pre-Finance</div>
        <div className="switch-toggle">
          <button
            className={`switch-toggle__option ${
              switches.preTaxPreFinance === "Yes"
                ? "switch-toggle__option--active"
                : ""
            }`}
            onClick={() => onChange({ preTaxPreFinance: "Yes" })}
          >
            Yes
          </button>
          <button
            className={`switch-toggle__option ${
              switches.preTaxPreFinance === "No"
                ? "switch-toggle__option--active"
                : ""
            }`}
            onClick={() => onChange({ preTaxPreFinance: "No" })}
          >
            No
          </button>
        </div>
      </div>

      {/* Switch 4: Coal Price */}
      <div className="switch-group">
        <div className="switch-group__label">Coal Price Type</div>
        <div className="switch-toggle">
          <button
            className={`switch-toggle__option ${
              switches.coalPriceType === "Commercial"
                ? "switch-toggle__option--active"
                : ""
            }`}
            onClick={() => onChange({ coalPriceType: "Commercial" })}
          >
            Commercial
          </button>
          <button
            className={`switch-toggle__option ${
              switches.coalPriceType === "NCI" ? "switch-toggle__option--active" : ""
            }`}
            onClick={() => onChange({ coalPriceType: "NCI" })}
          >
            NCI
          </button>
        </div>
      </div>

      {/* Switch 5: Price Correlation Factor (Coming Soon) */}
      <div className="switch-group">
        <div className="switch-group__label">
          Price Co-relation Factor <span className="badge badge--coming-soon">Coming Soon</span>
        </div>
        <div className="switch-toggle">
          <button
            className="switch-toggle__option switch-toggle__option--active switch-toggle__option--disabled"
            disabled
          >
            NCI → Commercial: {switches.priceCorrelationFactor}
          </button>
        </div>
      </div>
    </div>
  );
}
