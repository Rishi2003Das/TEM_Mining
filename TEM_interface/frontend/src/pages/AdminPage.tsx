import { useState, useEffect, useMemo, useRef } from "react";
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

/* Reverse lookup: label → collection key */
const LABEL_TO_COLLECTION: Record<string, string> = Object.fromEntries(
  Object.entries(COLLECTION_LABELS).map(([k, v]) => [v, k])
);

function getValueField(collection: string): string {
  return COLLECTION_VALUE_FIELDS[collection] || "Value";
}

/* ── CSV Upload types ──────────────────────────────────────────── */
interface CsvUploadPreview {
  projectId: string;
  projectManager: string;
  clientCompany: string;
  hardInputSections: { label: string; collection: string; rowCount: number }[];
  prodScheduleRows: number;
  prodScheduleYears: string[];
  parsedHardInputs: Record<string, { key: string; value: string }[]>;
  parsedProdSchedule: { item: string; unit: string; yearly_values: Record<string, string> }[];
}

/* ── CSV Export Modal ─────────────────────────────────────────── */
interface ProjectDetails {
  projectId: string;
  projectDescription: string;
  projectManager: string;
  clientCompany: string;
}

const MODAL_STYLES: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.65)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    animation: "fadeIn 0.25s ease-out",
  },
  card: {
    background: "linear-gradient(135deg, rgba(17,24,39,0.95), rgba(15,23,42,0.98))",
    border: "1px solid rgba(99,102,241,0.2)",
    borderRadius: "16px",
    padding: "32px",
    width: "min(560px, 90vw)",
    maxHeight: "85vh",
    overflowY: "auto" as const,
    boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1) inset",
  },
  title: {
    fontSize: "1.35rem",
    fontWeight: 700,
    color: "#f1f5f9",
    marginBottom: "4px",
  },
  subtitle: {
    fontSize: "0.85rem",
    color: "#94a3b8",
    marginBottom: "24px",
  },
  label: {
    display: "block",
    fontSize: "0.82rem",
    fontWeight: 600,
    color: "#94a3b8",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    marginBottom: "6px",
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    background: "rgba(30, 41, 59, 0.8)",
    border: "1px solid rgba(99,102,241,0.15)",
    borderRadius: "8px",
    color: "#f1f5f9",
    fontSize: "0.9rem",
    outline: "none",
    transition: "border-color 0.2s",
    fontFamily: "Inter, sans-serif",
  },
  textarea: {
    width: "100%",
    padding: "10px 14px",
    background: "rgba(30, 41, 59, 0.8)",
    border: "1px solid rgba(99,102,241,0.15)",
    borderRadius: "8px",
    color: "#f1f5f9",
    fontSize: "0.9rem",
    outline: "none",
    transition: "border-color 0.2s",
    fontFamily: "Inter, sans-serif",
    resize: "vertical" as const,
    minHeight: "120px",
  },
  wordCount: {
    textAlign: "right" as const,
    fontSize: "0.75rem",
    marginTop: "4px",
    marginBottom: "16px",
  },
  fieldGroup: {
    marginBottom: "16px",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "24px",
    paddingTop: "16px",
    borderTop: "1px solid rgba(99,102,241,0.1)",
  },
  btnPrimary: {
    padding: "10px 24px",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    fontWeight: 600,
    fontSize: "0.9rem",
    cursor: "pointer",
    transition: "opacity 0.2s, transform 0.15s",
  },
  btnGhost: {
    padding: "10px 24px",
    background: "transparent",
    border: "1px solid rgba(99,102,241,0.2)",
    borderRadius: "8px",
    color: "#94a3b8",
    fontWeight: 500,
    fontSize: "0.9rem",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  error: {
    color: "#f43f5e",
    fontSize: "0.78rem",
    marginTop: "4px",
  },
};

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

  /* CSV Export modal state */
  const [showExportModal, setShowExportModal] = useState(false);
  const [projectDetails, setProjectDetails] = useState<ProjectDetails>({
    projectId: "",
    projectDescription: "",
    projectManager: "",
    clientCompany: "",
  });
  const [exportErrors, setExportErrors] = useState<Partial<Record<keyof ProjectDetails, string>>>({});

  /* CSV Upload modal state */
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<CsvUploadPreview | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

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

      /* Show CSV export modal after successful recalculation */
      setShowExportModal(true);
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

  /* ── CSV Generation ─────────────────────────────────────────── */
  function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  function validateExportForm(): boolean {
    const errs: Partial<Record<keyof ProjectDetails, string>> = {};
    if (!projectDetails.projectId.trim()) errs.projectId = "Project ID is required";
    if (!projectDetails.projectManager.trim()) errs.projectManager = "Project Manager name is required";
    if (!projectDetails.clientCompany.trim()) errs.clientCompany = "Client Company name is required";
    if (!projectDetails.projectDescription.trim()) {
      errs.projectDescription = "Project Description is required";
    } else if (countWords(projectDetails.projectDescription) < 100) {
      errs.projectDescription = `Description must be at least 100 words (currently ${countWords(projectDetails.projectDescription)} words)`;
    }
    setExportErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function escapeCSV(val: unknown): string {
    const str = String(val ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function handleExportCSV() {
    if (!validateExportForm()) return;
    if (!editingData) return;

    const lines: string[] = [];
    const now = new Date();

    // ── Section 1: Project Metadata
    lines.push("=== PROJECT DATA SPECIFICATION ===");
    lines.push("");
    lines.push(`Project ID,${escapeCSV(projectDetails.projectId)}`);
    lines.push(`Project Manager,${escapeCSV(projectDetails.projectManager)}`);
    lines.push(`Client Company,${escapeCSV(projectDetails.clientCompany)}`);
    lines.push(`Export Date,${escapeCSV(now.toLocaleString())}`);
    lines.push("");
    lines.push(`Project Description`);
    lines.push(`${escapeCSV(projectDetails.projectDescription)}`);
    lines.push("");
    lines.push("");

    // ── Section 2: Hard Inputs
    lines.push("=== HARD INPUTS & ASSUMPTIONS ===");
    lines.push("");

    for (const [collection, docs] of Object.entries(editingData)) {
      const label = COLLECTION_LABELS[collection] || collection;
      const valField = getValueField(collection);

      lines.push(`--- ${label} ---`);
      lines.push(`Parameter,${valField},Unit`);

      docs.forEach((doc) => {
        const key = getDisplayKey(doc);
        const value = doc[valField] ?? "";
        const unit = (doc["Unit"] as string) || (doc["unit"] as string) || "";
        lines.push(`${escapeCSV(key)},${escapeCSV(value)},${escapeCSV(unit)}`);
      });

      lines.push("");
    }

    // ── Section 3: Production Schedule
    if (editingProdSchedule && editingProdSchedule.length > 0) {
      lines.push("");
      lines.push("=== PRODUCTION SCHEDULE (Year-by-Year) ===");
      lines.push("");

      // Header row
      lines.push(`Parameter,Unit,${years.map((yr) => `Year ${yr}`).join(",")}`);

      editingProdSchedule.forEach((row) => {
        const vals = years.map((yr) => escapeCSV(row.yearly_values?.[String(yr)] ?? ""));
        lines.push(`${escapeCSV(row.item)},${escapeCSV(row.unit || "")},${vals.join(",")}`);
      });
    }

    // Build & download
    const csvContent = lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeId = projectDetails.projectId.replace(/[^a-zA-Z0-9_-]/g, "_");
    a.href = url;
    a.download = `TEM_DataSpec_${safeId}_${now.toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Reset & close
    setShowExportModal(false);
    setProjectDetails({ projectId: "", projectDescription: "", projectManager: "", clientCompany: "" });
    setExportErrors({});
  }

  /* ── CSV Upload / Import ────────────────────────────────────── */

  /** Parse a single CSV line, respecting quoted fields that may contain commas */
  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++; // skip escaped quote
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          result.push(current);
          current = "";
        } else {
          current += ch;
        }
      }
    }
    result.push(current);
    return result;
  }

  function handleCSVFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        const preview = parseUploadedCSV(text);
        setUploadPreview(preview);
        setUploadError(null);
        setShowUploadModal(true);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Failed to parse CSV");
        setUploadPreview(null);
        setShowUploadModal(true);
      }
    };
    reader.readAsText(file);
  }

  function parseUploadedCSV(text: string): CsvUploadPreview {
    const rawLines = text.split(/\r?\n/);

    // ── Extract project metadata
    let projectId = "";
    let projectManager = "";
    let clientCompany = "";

    for (const line of rawLines) {
      if (line.startsWith("Project ID,")) projectId = parseCSVLine(line)[1] || "";
      else if (line.startsWith("Project Manager,")) projectManager = parseCSVLine(line)[1] || "";
      else if (line.startsWith("Client Company,")) clientCompany = parseCSVLine(line)[1] || "";
    }

    // ── Locate section boundaries
    const hardInputsStartIdx = rawLines.findIndex((l) => l.includes("=== HARD INPUTS"));
    const prodScheduleStartIdx = rawLines.findIndex((l) => l.includes("=== PRODUCTION SCHEDULE"));

    if (hardInputsStartIdx === -1) {
      throw new Error("CSV is missing the '=== HARD INPUTS & ASSUMPTIONS ===' section header.");
    }

    const hardInputsEnd = prodScheduleStartIdx !== -1 ? prodScheduleStartIdx : rawLines.length;
    const hardInputLines = rawLines.slice(hardInputsStartIdx + 1, hardInputsEnd);

    // ── Parse hard inputs section by section
    const parsedHardInputs: Record<string, { key: string; value: string }[]> = {};
    const hardInputSections: CsvUploadPreview["hardInputSections"] = [];
    let currentLabel = "";
    let currentCollection = "";
    let valFieldName = ""; // the value field column header

    for (const line of hardInputLines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Check for section header like "--- Salary & Wages ---"
      const sectionMatch = trimmed.match(/^---\s*(.+?)\s*---$/);
      if (sectionMatch) {
        currentLabel = sectionMatch[1];
        currentCollection = LABEL_TO_COLLECTION[currentLabel] || "";
        valFieldName = ""; // reset; will be set from header row
        if (currentCollection) {
          parsedHardInputs[currentCollection] = [];
        }
        continue;
      }

      // Check for column header row like "Parameter,Annual CTC,Unit"
      if (trimmed.startsWith("Parameter,") && currentCollection) {
        const cols = parseCSVLine(trimmed);
        valFieldName = cols[1] || "";
        continue;
      }

      // Data row
      if (currentCollection && valFieldName) {
        const cols = parseCSVLine(trimmed);
        if (cols.length >= 2 && cols[0]) {
          parsedHardInputs[currentCollection].push({
            key: cols[0],
            value: cols[1],
          });
        }
      }
    }

    // Build section summary
    for (const [col, rows] of Object.entries(parsedHardInputs)) {
      hardInputSections.push({
        label: COLLECTION_LABELS[col] || col,
        collection: col,
        rowCount: rows.length,
      });
    }

    // ── Parse production schedule
    let parsedProdSchedule: CsvUploadPreview["parsedProdSchedule"] = [];
    let prodScheduleYears: string[] = [];

    if (prodScheduleStartIdx !== -1) {
      const prodLines = rawLines.slice(prodScheduleStartIdx + 1);

      // Find header row "Parameter,Unit,Year -4,Year -3,..."
      const headerIdx = prodLines.findIndex((l) => l.trim().startsWith("Parameter,Unit,"));
      if (headerIdx !== -1) {
        const headerCols = parseCSVLine(prodLines[headerIdx]);
        // Extract year labels: "Year -4" → "-4", "Year 1" → "1"
        prodScheduleYears = headerCols.slice(2).map((h) => {
          const m = h.trim().match(/Year\s+(.+)/);
          return m ? m[1] : h.trim();
        });

        // Data rows after header
        for (let i = headerIdx + 1; i < prodLines.length; i++) {
          const trimmed = prodLines[i].trim();
          if (!trimmed) continue;
          const cols = parseCSVLine(trimmed);
          if (cols.length < 3 || !cols[0]) continue;

          const yearlyVals: Record<string, string> = {};
          prodScheduleYears.forEach((yr, idx) => {
            yearlyVals[yr] = cols[idx + 2] || "0";
          });

          parsedProdSchedule.push({
            item: cols[0],
            unit: cols[1] || "",
            yearly_values: yearlyVals,
          });
        }
      }
    }

    return {
      projectId,
      projectManager,
      clientCompany,
      hardInputSections,
      prodScheduleRows: parsedProdSchedule.length,
      prodScheduleYears,
      parsedHardInputs,
      parsedProdSchedule,
    };
  }

  async function handleConfirmUpload() {
    if (!uploadPreview || !editingData || !editingProdSchedule) return;
    setUploading(true);

    try {
      // ── 1. Merge hard inputs into editingData
      const newEditingData = JSON.parse(JSON.stringify(editingData)) as HardInputsData;

      for (const [collection, csvRows] of Object.entries(uploadPreview.parsedHardInputs)) {
        if (!newEditingData[collection]) continue;
        const valField = getValueField(collection);

        for (const csvRow of csvRows) {
          // Find matching doc by key
          const matchIdx = newEditingData[collection].findIndex(
            (doc) => doc.key === csvRow.key || doc.Parameter === csvRow.key
          );
          if (matchIdx !== -1) {
            newEditingData[collection][matchIdx] = {
              ...newEditingData[collection][matchIdx],
              [valField]: csvRow.value,
            };
          }
        }
      }

      setEditingData(newEditingData);

      // ── 2. Merge production schedule into editingProdSchedule
      if (uploadPreview.parsedProdSchedule.length > 0) {
        const newProdSchedule = JSON.parse(JSON.stringify(editingProdSchedule)) as any[];

        for (const csvRow of uploadPreview.parsedProdSchedule) {
          const matchIdx = newProdSchedule.findIndex((r) => r.item === csvRow.item);
          if (matchIdx !== -1) {
            // Merge year values
            for (const [yr, val] of Object.entries(csvRow.yearly_values)) {
              newProdSchedule[matchIdx].yearly_values[yr] = val;
            }
          }
        }

        setEditingProdSchedule(newProdSchedule);
      }

      setShowUploadModal(false);
      setUploadPreview(null);
      alert(
        "✅ CSV data imported into the form!\n\nReview the values in the form below, then click 'Save & Recalculate' to persist changes to MongoDB and recalculate all scenarios."
      );
    } catch (err) {
      alert(`Error importing CSV: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setUploading(false);
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
          {/* Hidden file input for CSV upload */}
          <input
            ref={csvFileInputRef}
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={handleCSVFileSelect}
          />
          <button
            onClick={() => csvFileInputRef.current?.click()}
            disabled={saving || !editingData}
            className="btn btn--ghost"
            style={{ fontSize: "0.9rem", padding: "10px 20px" }}
          >
            📤 Upload CSV
          </button>
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

      {/* ── CSV Export Modal ─────────────────────────────────────── */}
      {showExportModal && (
        <div style={MODAL_STYLES.overlay} onClick={() => setShowExportModal(false)}>
          <div style={MODAL_STYLES.card} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
              <span style={{ fontSize: "1.6rem" }}>📋</span>
              <div style={MODAL_STYLES.title}>Download Project Data Specifications</div>
            </div>
            <div style={MODAL_STYLES.subtitle}>
              Provide project details to generate a comprehensive CSV file containing all hard inputs and production schedule data.
            </div>

            {/* Project ID */}
            <div style={MODAL_STYLES.fieldGroup}>
              <label style={MODAL_STYLES.label}>Project ID *</label>
              <input
                style={MODAL_STYLES.input}
                placeholder="e.g. TEM-2026-001"
                value={projectDetails.projectId}
                onChange={(e) => setProjectDetails((p) => ({ ...p, projectId: e.target.value }))}
                onFocus={(e) => (e.target.style.borderColor = "rgba(99,102,241,0.5)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(99,102,241,0.15)")}
              />
              {exportErrors.projectId && <div style={MODAL_STYLES.error}>{exportErrors.projectId}</div>}
            </div>

            {/* Project Manager */}
            <div style={MODAL_STYLES.fieldGroup}>
              <label style={MODAL_STYLES.label}>Project Manager *</label>
              <input
                style={MODAL_STYLES.input}
                placeholder="Enter project manager's full name"
                value={projectDetails.projectManager}
                onChange={(e) => setProjectDetails((p) => ({ ...p, projectManager: e.target.value }))}
                onFocus={(e) => (e.target.style.borderColor = "rgba(99,102,241,0.5)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(99,102,241,0.15)")}
              />
              {exportErrors.projectManager && <div style={MODAL_STYLES.error}>{exportErrors.projectManager}</div>}
            </div>

            {/* Client Company */}
            <div style={MODAL_STYLES.fieldGroup}>
              <label style={MODAL_STYLES.label}>Client Company *</label>
              <input
                style={MODAL_STYLES.input}
                placeholder="Enter client company name"
                value={projectDetails.clientCompany}
                onChange={(e) => setProjectDetails((p) => ({ ...p, clientCompany: e.target.value }))}
                onFocus={(e) => (e.target.style.borderColor = "rgba(99,102,241,0.5)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(99,102,241,0.15)")}
              />
              {exportErrors.clientCompany && <div style={MODAL_STYLES.error}>{exportErrors.clientCompany}</div>}
            </div>

            {/* Project Description */}
            <div style={MODAL_STYLES.fieldGroup}>
              <label style={MODAL_STYLES.label}>Project Description * (min 100 words)</label>
              <textarea
                style={MODAL_STYLES.textarea}
                placeholder="Provide a detailed project description (minimum 100 words) covering scope, objectives, methodology, and key assumptions..."
                value={projectDetails.projectDescription}
                onChange={(e) => setProjectDetails((p) => ({ ...p, projectDescription: e.target.value }))}
                onFocus={(e) => (e.target.style.borderColor = "rgba(99,102,241,0.5)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(99,102,241,0.15)")}
              />
              <div
                style={{
                  ...MODAL_STYLES.wordCount,
                  color: countWords(projectDetails.projectDescription) >= 100 ? "#10b981" : "#94a3b8",
                }}
              >
                {countWords(projectDetails.projectDescription)} / 100 words
              </div>
              {exportErrors.projectDescription && <div style={{ ...MODAL_STYLES.error, marginTop: "-8px" }}>{exportErrors.projectDescription}</div>}
            </div>

            <div style={MODAL_STYLES.actions}>
              <button
                style={MODAL_STYLES.btnGhost}
                onClick={() => {
                  setShowExportModal(false);
                  setExportErrors({});
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                Skip
              </button>
              <button
                style={MODAL_STYLES.btnPrimary}
                onClick={handleExportCSV}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                📥 Generate & Download CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CSV Upload Confirmation Modal ──────────────────────── */}
      {showUploadModal && (
        <div style={MODAL_STYLES.overlay} onClick={() => { setShowUploadModal(false); setUploadPreview(null); setUploadError(null); }}>
          <div style={{ ...MODAL_STYLES.card, width: "min(640px, 92vw)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
              <span style={{ fontSize: "1.6rem" }}>📤</span>
              <div style={MODAL_STYLES.title}>Import CSV Data</div>
            </div>

            {uploadError ? (
              <>
                <div style={{ ...MODAL_STYLES.subtitle, color: "#f43f5e" }}>
                  Failed to parse the uploaded CSV file.
                </div>
                <div
                  style={{
                    background: "rgba(244, 63, 94, 0.08)",
                    border: "1px solid rgba(244, 63, 94, 0.2)",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    color: "#fca5a5",
                    fontSize: "0.88rem",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {uploadError}
                </div>
                <div style={MODAL_STYLES.actions}>
                  <button
                    style={MODAL_STYLES.btnGhost}
                    onClick={() => { setShowUploadModal(false); setUploadError(null); }}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : uploadPreview ? (
              <>
                <div style={MODAL_STYLES.subtitle}>
                  Review the data summary below. On confirm, values will be loaded into the form for review before saving.
                </div>

                {/* Project Info */}
                <div style={{
                  background: "rgba(99, 102, 241, 0.06)",
                  border: "1px solid rgba(99,102,241,0.12)",
                  borderRadius: "10px",
                  padding: "14px 18px",
                  marginBottom: "16px",
                }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                    Project Metadata
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "4px 12px", fontSize: "0.88rem" }}>
                    <span style={{ color: "#64748b" }}>Project ID:</span>
                    <span style={{ color: "#f1f5f9", fontWeight: 500 }}>{uploadPreview.projectId || "—"}</span>
                    <span style={{ color: "#64748b" }}>Manager:</span>
                    <span style={{ color: "#f1f5f9", fontWeight: 500 }}>{uploadPreview.projectManager || "—"}</span>
                    <span style={{ color: "#64748b" }}>Client:</span>
                    <span style={{ color: "#f1f5f9", fontWeight: 500 }}>{uploadPreview.clientCompany || "—"}</span>
                  </div>
                </div>

                {/* Hard Inputs Summary */}
                <div style={{
                  background: "rgba(16, 185, 129, 0.06)",
                  border: "1px solid rgba(16, 185, 129, 0.12)",
                  borderRadius: "10px",
                  padding: "14px 18px",
                  marginBottom: "16px",
                }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                    Hard Inputs — {uploadPreview.hardInputSections.length} sections
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {uploadPreview.hardInputSections.map((s) => (
                      <span
                        key={s.collection}
                        style={{
                          background: "rgba(16, 185, 129, 0.12)",
                          color: "#6ee7b7",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "0.78rem",
                          fontWeight: 500,
                        }}
                      >
                        {s.label} ({s.rowCount})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Production Schedule Summary */}
                {uploadPreview.prodScheduleRows > 0 && (
                  <div style={{
                    background: "rgba(59, 130, 246, 0.06)",
                    border: "1px solid rgba(59, 130, 246, 0.12)",
                    borderRadius: "10px",
                    padding: "14px 18px",
                    marginBottom: "16px",
                  }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                      Production Schedule
                    </div>
                    <div style={{ color: "#93c5fd", fontSize: "0.88rem" }}>
                      {uploadPreview.prodScheduleRows} parameters × {uploadPreview.prodScheduleYears.length} years
                      <span style={{ color: "#64748b", marginLeft: "8px" }}>
                        (Yr {uploadPreview.prodScheduleYears[0]} to Yr {uploadPreview.prodScheduleYears[uploadPreview.prodScheduleYears.length - 1]})
                      </span>
                    </div>
                  </div>
                )}

                {/* Warning */}
                <div style={{
                  background: "rgba(245, 158, 11, 0.08)",
                  border: "1px solid rgba(245, 158, 11, 0.15)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  display: "flex",
                  gap: "8px",
                  alignItems: "flex-start",
                  marginBottom: "8px",
                }}>
                  <span style={{ fontSize: "1rem" }}>⚠️</span>
                  <span style={{ color: "#fcd34d", fontSize: "0.82rem", lineHeight: 1.5 }}>
                    This will overwrite current form values with data from the CSV. Unmatched parameters will be skipped. Click <strong>"Save & Recalculate"</strong> after importing to persist and recalculate.
                  </span>
                </div>

                <div style={MODAL_STYLES.actions}>
                  <button
                    style={MODAL_STYLES.btnGhost}
                    onClick={() => { setShowUploadModal(false); setUploadPreview(null); }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.08)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    Cancel
                  </button>
                  <button
                    style={MODAL_STYLES.btnPrimary}
                    onClick={handleConfirmUpload}
                    disabled={uploading}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    {uploading ? "Importing..." : "✅ Confirm & Import"}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
