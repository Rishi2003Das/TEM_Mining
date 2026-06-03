import { useState, useEffect } from "react";
import { PasswordGate } from "../components/PasswordGate";
import { API_BASE } from "../types";

interface HardInputDoc {
  key?: string;
  Parameter?: string;
  Category?: string;
  [k: string]: unknown;
}

type HardInputsData = Record<string, HardInputDoc[]>;

const COLLECTION_LABELS: Record<string, string> = {
  basic_consideration: "Basic Considerations",
  salary_wages: "Salary & Wages",
  working_regime: "Working Regime",
  density_swell_factor: "Density & Swell Factor",
  explosives: "Explosives",
  unit_rates_opcosts: "Unit Rates & Op. Costs",
  maintainance_cost: "Maintenance Cost",
  operational_para: "Operational Parameters",
  govt_fees_charges: "Govt Fees & Charges",
  payment_assumption: "Payment Assumptions",
  mdo_assumption: "MDO Assumptions",
  safety_slope_stability: "Safety & Slope Stability",
  production_schedule_params: "Production Schedule Parameters",
};

const COLLECTION_VALUE_FIELDS: Record<string, string> = {
  salary_wages: "Annual CTC",
  working_regime: "Values",
  basic_consideration: "Value",
  density_swell_factor: "Value",
  explosives: "Value",
  unit_rates_opcosts: "Base Rate",
  maintainance_cost: "Base Rate",
  operational_para: "Values",
  govt_fees_charges: "Base Rate",
  payment_assumption: "Base Rate",
  mdo_assumption: "Value",
  safety_slope_stability: "Value",
  production_schedule_params: "Value",
};

function getValueField(collection: string): string {
  return COLLECTION_VALUE_FIELDS[collection] || "Value";
}

export function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [data, setData] = useState<HardInputsData | null>(null);
  const [editingData, setEditingData] = useState<HardInputsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingMessage, setSavingMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authenticated) return;

    setLoading(true);
    fetch(`${API_BASE}/hard-inputs`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load hard inputs");
        return res.json();
      })
      .then((d) => {
        setData(d);
        setEditingData(JSON.parse(JSON.stringify(d))); // Deep copy
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [authenticated]);

  if (!authenticated) {
    return <PasswordGate onAuthenticated={() => setAuthenticated(true)} />;
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <div className="loading-text">Loading hard inputs from MongoDB…</div>
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
      </div>
    );
  }

  function getDisplayKey(doc: HardInputDoc): string {
    return (
      doc.Parameter ||
      doc.key ||
      doc.Category ||
      (typeof doc["Description"] === "string" ? doc["Description"] : "") ||
      (typeof doc["Category wise Executives wage details"] === "string"
        ? doc["Category wise Executives wage details"]
        : "") ||
      (typeof doc["Unit Rates and Operating Costs"] === "string"
        ? doc["Unit Rates and Operating Costs"]
        : "") ||
      (typeof doc["Maintenance Rate"] === "string" ? doc["Maintenance Rate"] : "") ||
      (typeof doc["Government Fees and charges"] === "string"
        ? doc["Government Fees and charges"]
        : "") ||
      (typeof doc["Payment related assumption"] === "string"
        ? doc["Payment related assumption"]
        : "") ||
      JSON.stringify(doc).slice(0, 60)
    );
  }

  function handleFieldChange(
    collection: string,
    index: number,
    valField: string,
    newValue: string
  ) {
    setEditingData((prev) => {
      if (!prev) return null;
      const updatedCollection = [...prev[collection]];
      updatedCollection[index] = {
        ...updatedCollection[index],
        [valField]: newValue,
      };
      return {
        ...prev,
        [collection]: updatedCollection,
      };
    });
  }

  async function handleSaveAndRecalculate() {
    if (!data || !editingData) return;
    setSaving(true);
    setSavingMessage("Scanning changes...");

    const updates: { collection: string; key: string; value: string | number }[] = [];

    for (const [col, docs] of Object.entries(editingData)) {
      const valField = getValueField(col);
      const originalDocs = data[col];

      docs.forEach((doc, i) => {
        const origDoc = originalDocs[i];
        if (origDoc && doc[valField] !== origDoc[valField]) {
          updates.push({
            collection: col,
            key: doc.key || "",
            value: doc[valField] as string | number,
          });
        }
      });
    }

    if (updates.length === 0) {
      setSavingMessage("No changes to save. Recalculating scenarios...");
    } else {
      setSavingMessage(`Saving ${updates.length} parameters to MongoDB...`);
      try {
        await Promise.all(
          updates.map((up) =>
            fetch(`${API_BASE}/admin/update-input`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(up),
            }).then(async (res) => {
              if (!res.ok) {
                const errJson = await res.json();
                throw new Error(errJson.error || "Failed to update input");
              }
            })
          )
        );
      } catch (err) {
        alert(`Error saving changes: ${err instanceof Error ? err.message : "Unknown error"}`);
        setSaving(false);
        return;
      }
    }

    setSavingMessage("Recalculating TEM scenarios in MongoDB...");
    try {
      const res = await fetch(`${API_BASE}/recalculate`, { method: "POST" });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to recalculate scenarios");
      }

      setSavingMessage("Refreshing parameters...");
      const refreshRes = await fetch(`${API_BASE}/hard-inputs`);
      if (refreshRes.ok) {
        const freshData = await refreshRes.json();
        setData(freshData);
        setEditingData(JSON.parse(JSON.stringify(freshData)));
      }
      alert("TEM scenarios successfully recalculated with new inputs!");
    } catch (err) {
      alert(`Error recalculating: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSaving(false);
      setSavingMessage("");
    }
  }

  return (
    <div>
      <div className="section-header">
        <div className="section-header__bar" />
        <h2 className="section-header__title">Hard Inputs & Assumptions</h2>
        <span className="section-header__subtitle">
          {data ? Object.keys(data).length : 0} collections loaded from MongoDB
        </span>
        <div className="admin-header-actions">
          {saving && (
            <div className="saving-indicator animate-in">
              <div className="saving-indicator__spinner" />
              <span>{savingMessage}</span>
            </div>
          )}
          <button
            onClick={handleSaveAndRecalculate}
            disabled={saving || !editingData}
            className="btn btn--primary"
          >
            {saving ? "Processing..." : "💾 Save & Recalculate"}
          </button>
        </div>
      </div>

      <div className="admin-grid">
        {editingData &&
          Object.entries(editingData).map(([collection, docs]) => (
            <div key={collection} className="admin-collection animate-in">
              <div className="admin-collection__title">
                {COLLECTION_LABELS[collection] || collection}
              </div>
              {docs.map((doc, i) => {
                const key = getDisplayKey(doc);
                const valField = getValueField(collection);
                const value = (doc[valField] as string | number) ?? "";
                if (!key) return null;
                return (
                  <div key={i} className="admin-field">
                    <span className="admin-field__label" title={key}>
                      {key}
                    </span>
                    <input
                      type="text"
                      className="admin-field__input"
                      value={value}
                      disabled={saving}
                      onChange={(e) =>
                        handleFieldChange(collection, i, valField, e.target.value)
                      }
                    />
                  </div>
                );
              })}
            </div>
          ))}
      </div>
    </div>
  );
}
