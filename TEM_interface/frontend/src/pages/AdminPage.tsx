import { useState, useEffect, useMemo } from "react";
import { PasswordGate } from "../components/PasswordGate";
import { API_BASE, YEAR_HEADERS } from "../types";

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
  const [prodSchedule, setProdSchedule] = useState<any[] | null>(null);
  const [editingProdSchedule, setEditingProdSchedule] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingMessage, setSavingMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [addingYear, setAddingYear] = useState(false);
  const [removingYear, setRemovingYear] = useState(false);

  const years = useMemo(() => {
    if (!editingProdSchedule || editingProdSchedule.length === 0) return YEAR_HEADERS;
    const firstRow = editingProdSchedule[0];
    if (!firstRow || !firstRow.yearly_values) return YEAR_HEADERS;
    return Object.keys(firstRow.yearly_values)
      .map(Number)
      .sort((a, b) => a - b)
      .map(String);
  }, [editingProdSchedule]);

  useEffect(() => {
    if (!authenticated) return;

    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/hard-inputs`).then((res) => {
        if (!res.ok) throw new Error("Failed to load hard inputs");
        return res.json();
      }),
      fetch(`${API_BASE}/schedules/production`).then((res) => {
        if (!res.ok) throw new Error("Failed to load production schedule");
        return res.json();
      })
    ])
      .then(([hardInputs, prodSched]) => {
        setData(hardInputs);
        setEditingData(JSON.parse(JSON.stringify(hardInputs)));
        setProdSchedule(prodSched);
        setEditingProdSchedule(JSON.parse(JSON.stringify(prodSched)));
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

    const scheduleUpdates: { item: string; yearly_values: Record<string, number | string> }[] = [];

    if (prodSchedule && editingProdSchedule) {
      editingProdSchedule.forEach((row) => {
        const origRow = prodSchedule.find((r) => r.item === row.item);
        if (origRow) {
          let rowChanged = false;
          for (const yr of years) {
            const yrStr = String(yr);
            if (row.yearly_values[yrStr] !== origRow.yearly_values[yrStr]) {
              rowChanged = true;
              break;
            }
          }
          if (rowChanged) {
            scheduleUpdates.push({
              item: row.item,
              yearly_values: row.yearly_values,
            });
          }
        }
      });
    }

    if (updates.length === 0 && scheduleUpdates.length === 0) {
      setSavingMessage("No changes to save. Recalculating scenarios...");
    } else {
      if (updates.length > 0) {
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
          alert(`Error saving parameter changes: ${err instanceof Error ? err.message : "Unknown error"}`);
          setSaving(false);
          return;
        }
      }

      if (scheduleUpdates.length > 0) {
        setSavingMessage(`Saving ${scheduleUpdates.length} production schedule series...`);
        try {
          await Promise.all(
            scheduleUpdates.map((up) =>
              fetch(`${API_BASE}/admin/update-production-schedule`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(up),
              }).then(async (res) => {
                if (!res.ok) {
                  const errJson = await res.json();
                  throw new Error(errJson.error || "Failed to update production schedule");
                }
              })
            )
          );
        } catch (err) {
          alert(`Error saving production schedule changes: ${err instanceof Error ? err.message : "Unknown error"}`);
          setSaving(false);
          return;
        }
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
      const [refreshRes, refreshSchedRes] = await Promise.all([
        fetch(`${API_BASE}/hard-inputs`),
        fetch(`${API_BASE}/schedules/production`),
      ]);

      if (refreshRes.ok && refreshSchedRes.ok) {
        const freshData = await refreshRes.json();
        const freshSchedData = await refreshSchedRes.json();
        setData(freshData);
        setEditingData(JSON.parse(JSON.stringify(freshData)));
        setProdSchedule(freshSchedData);
        setEditingProdSchedule(JSON.parse(JSON.stringify(freshSchedData)));
      }
      alert("TEM scenarios successfully recalculated with new inputs!");
    } catch (err) {
      alert(`Error recalculating: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSaving(false);
      setSavingMessage("");
    }
  }

  async function handleAddYear() {
    setAddingYear(true);
    setSavingMessage("Adding new year to all schedules...");
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/add-year`, {
        method: "POST",
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to add year");
      }
      
      const resData = await res.json();
      const newYearStr = resData.addedYear;
      
      // Refresh parameters
      const [refreshRes, refreshSchedRes] = await Promise.all([
        fetch(`${API_BASE}/hard-inputs`),
        fetch(`${API_BASE}/schedules/production`),
      ]);

      if (refreshRes.ok && refreshSchedRes.ok) {
        const freshData = await refreshRes.json();
        const freshSchedData = await refreshSchedRes.json();
        setData(freshData);
        setEditingData(JSON.parse(JSON.stringify(freshData)));
        setProdSchedule(freshSchedData);
        setEditingProdSchedule(JSON.parse(JSON.stringify(freshSchedData)));
      }
      alert(`Year ${newYearStr} successfully added to all database schedules!`);
    } catch (err) {
      alert(`Error adding year: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setAddingYear(false);
      setSaving(false);
      setSavingMessage("");
    }
  }

  async function handleRemoveYear() {
    if (!years || years.length === 0) return;
    const maxYr = years[years.length - 1];
    
    if (confirm(`Are you sure you want to remove Year ${maxYr} from all schedules? This action cannot be undone.`)) {
      setRemovingYear(true);
      setSavingMessage(`Removing year ${maxYr} from all schedules...`);
      setSaving(true);
      try {
        const res = await fetch(`${API_BASE}/admin/remove-year`, {
          method: "POST",
        });
        if (!res.ok) {
          const errJson = await res.json();
          throw new Error(errJson.error || "Failed to remove year");
        }
        
        const resData = await res.json();
        const removedYearStr = resData.removedYear;
        
        // Refresh parameters
        const [refreshRes, refreshSchedRes] = await Promise.all([
          fetch(`${API_BASE}/hard-inputs`),
          fetch(`${API_BASE}/schedules/production`),
        ]);

        if (refreshRes.ok && refreshSchedRes.ok) {
          const freshData = await refreshRes.json();
          const freshSchedData = await refreshSchedRes.json();
          setData(freshData);
          setEditingData(JSON.parse(JSON.stringify(freshData)));
          setProdSchedule(freshSchedData);
          setEditingProdSchedule(JSON.parse(JSON.stringify(freshSchedData)));
        }
        alert(`Year ${removedYearStr} successfully removed from all database schedules!`);
      } catch (err) {
        alert(`Error removing year: ${err instanceof Error ? err.message : "Unknown error"}`);
      } finally {
        setRemovingYear(false);
        setSaving(false);
        setSavingMessage("");
      }
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
            disabled={saving || (!editingData && !editingProdSchedule)}
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

      <div className="section-header" style={{ marginTop: "var(--space-xl)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
          <div className="section-header__bar" />
          <div>
            <h2 className="section-header__title">Production Schedule Series (Year-by-Year)</h2>
            <span className="section-header__subtitle">
              Editable hard inputs from the production schedule
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "var(--space-sm)" }}>
          <button
            onClick={handleRemoveYear}
            disabled={saving || removingYear || years.length <= 5}
            className="btn btn--ghost"
            style={{ fontSize: "0.85rem", padding: "8px 16px", borderColor: "rgba(244, 63, 94, 0.2)", color: "var(--accent-rose)" }}
          >
            {removingYear ? "Removing..." : "🗑️ Remove Year"}
          </button>
          <button
            onClick={handleAddYear}
            disabled={saving || addingYear}
            className="btn btn--ghost"
            style={{ fontSize: "0.85rem", padding: "8px 16px" }}
          >
            {addingYear ? "Adding..." : "➕ Add Production Year"}
          </button>
        </div>
      </div>

      {editingProdSchedule && (
        <div className="glass-card animate-in" style={{ width: "100%", padding: "var(--space-md)", marginBottom: "var(--space-2xl)" }}>
          <div className="data-table-wrapper" style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ minWidth: "240px", position: "sticky", left: 0, background: "var(--bg-secondary)", zIndex: 3 }}>
                    Parameter
                  </th>
                  <th>Unit</th>
                  {years.map((yr) => (
                    <th key={yr} style={{ textAlign: "right", minWidth: "85px" }}>
                      Yr {yr}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {editingProdSchedule
                  .filter((row) => {
                    const keysToEdit = [
                      "Production Coal/Ore",
                      "Waste (Topsoil + Overburden + Interburden)",
                      "Top Soil",
                      "Waste - Rehandle",
                      "GCV (ADB)",
                      "ROM",
                      "Waste",
                      "In-Pit",
                      "Ex-Pit",
                      "Rehandling"
                    ];
                    return keysToEdit.includes(row.item);
                  })
                  .map((row) => {
                    let displayName = row.item;
                    if (row.item === "Waste (Topsoil + Overburden + Interburden)") {
                      displayName = "Total Waste Amount";
                    } else if (row.item === "ROM") {
                      displayName = "ROM Coal Haul Distance";
                    } else if (row.item === "Waste") {
                      displayName = "Waste Haul Distance";
                    } else if (row.item === "In-Pit") {
                      displayName = "In-Pit Haul Distance";
                    } else if (row.item === "Ex-Pit") {
                      displayName = "Ex-Pit Haul Distance";
                    } else if (row.item === "Rehandling") {
                      displayName = "Rehandling Haul Distance";
                    }
                    
                    return (
                      <tr key={row.item}>
                        <td style={{ position: "sticky", left: 0, background: "var(--bg-secondary)", zIndex: 2, fontWeight: 500 }}>
                          {displayName}
                        </td>
                        <td style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                          {row.unit}
                        </td>
                        {years.map((yr) => {
                          const yrStr = String(yr);
                          const val = row.yearly_values[yrStr] ?? "";
                          return (
                            <td key={yr} style={{ textAlign: "right" }}>
                              <input
                                type="text"
                                className="admin-field__input"
                                style={{ width: "70px", textAlign: "right", margin: "2px 0" }}
                                value={val}
                                disabled={saving}
                                onChange={(e) => {
                                  const newVal = e.target.value;
                                  setEditingProdSchedule((prev) => {
                                    if (!prev) return null;
                                    return prev.map((r) => {
                                      if (r.item === row.item) {
                                        return {
                                          ...r,
                                          yearly_values: {
                                            ...r.yearly_values,
                                            [yrStr]: newVal,
                                          },
                                        };
                                      }
                                      return r;
                                    });
                                  });
                                }}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
