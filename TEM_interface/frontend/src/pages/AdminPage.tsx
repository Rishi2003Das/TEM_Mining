import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PasswordGate } from "../components/PasswordGate";
import { API_BASE } from "../types";

interface Project {
  projectId: string;
  projectName: string;
  client: string;
  commodity: string;
  status: "Draft" | "Published" | "Archived";
  lastComputationDate: string;
  manager: string;
  description: string;
}

interface ProjectDetails {
  projectId: string;
  projectManager: string;
  clientCompany: string;
  projectDescription: string;
}

const initialProjects: Project[] = [
  {
    projectId: "IN_1324",
    projectName: "Radhikapur Option 3 (15 Mtpa)",
    client: "Hindalco Industries Limited (HIL)",
    commodity: "Coal",
    status: "Published",
    lastComputationDate: "2026-07-07 16:12",
    manager: "Mrinal Kanti Sarkar",
    description: "Technical Evaluation and Preparation of Detailed Project Report Base Case - 9Mtpa; Departmental/ MDO Operation; Coal - Surface Miner; Waste - Truck & Shovel"
  },
  {
    projectId: "IN_1411",
    projectName: "Radhikapur Coal Block Option 2",
    client: "Rio Tinto",
    commodity: "Coal",
    status: "Draft",
    lastComputationDate: "2026-06-12 10:45",
    manager: "Rishi Das",
    description: "Option 2 assessment for alternative transport configuration using conveyors."
  },
  {
    projectId: "IN_1502",
    projectName: "Gevra Expansion",
    client: "South Eastern Coalfields (SECL)",
    commodity: "Coal",
    status: "Archived",
    lastComputationDate: "2025-11-20 14:30",
    manager: "S. K. Rao",
    description: "Archived scenario studies for 70 Mtpa Gevra opencast expansion."
  }
];

const HARD_INPUT_COLLECTIONS_LABELS: { [key: string]: string } = {
  salary_wages: "Salary & Wages",
  working_regime: "Working Regime",
  basic_consideration: "Basic Considerations",
  density_swell_factor: "Density & Swell Factor",
  explosives: "Explosives",
  unit_rates_opcosts: "Unit Rates & Operating Costs",
  maintainance_cost: "Maintenance Cost",
  operational_para: "Operational Parameters",
  govt_fees_charges: "Government Fees & Charges",
  payment_assumption: "Payment related assumption",
  mdo_assumption: "MDO Assumption",
  safety_slope_stability: "Safety - slope stability",
  production_schedule_params: "Production Schedule Params"
};

export function AdminPage() {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "project-list" | "input-management" | "computation-control" | "result-preview"
  >("dashboard");

  // Projects list state (persisted in localStorage)
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem("tem_projects");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return initialProjects;
  });

  useEffect(() => {
    localStorage.setItem("tem_projects", JSON.stringify(projects));
  }, [projects]);

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // New Project Form State
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProject, setNewProject] = useState<Omit<Project, "lastComputationDate">>({
    projectId: "",
    projectName: "",
    client: "",
    commodity: "Coal",
    status: "Draft",
    manager: "",
    description: ""
  });

  // Current project config details (synced with selected project)
  const [projectDetails, setProjectDetails] = useState<ProjectDetails>({
    projectId: "",
    projectManager: "",
    clientCompany: "",
    projectDescription: ""
  });

  // Recalculation / Upload States
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [consoleLog, setConsoleLog] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hard Inputs state for Input Management Tab
  const [hardInputs, setHardInputs] = useState<any>(null);
  const [loadingInputs, setLoadingInputs] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string>("basic_consideration");
  const [savingParam, setSavingParam] = useState<string | null>(null);

  // Computed results state for Result Preview Tab
  const [scenariosList, setScenariosList] = useState<any[]>([]);
  const [loadingScenarios, setLoadingScenarios] = useState(false);

  // Sync selected project with projectDetails form
  useEffect(() => {
    if (selectedProject) {
      setProjectDetails({
        projectId: selectedProject.projectId,
        projectManager: selectedProject.manager,
        clientCompany: selectedProject.client,
        projectDescription: selectedProject.description
      });
    }
  }, [selectedProject]);

  // Load hard inputs
  useEffect(() => {
    if (!authenticated) return;
    setLoadingInputs(true);
    fetch(`${API_BASE}/hard-inputs`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setHardInputs(data))
      .catch((err) => console.error("Error loading hard inputs:", err))
      .finally(() => setLoadingInputs(false));
  }, [authenticated]);

  // Load scenarios for result preview
  useEffect(() => {
    if (!authenticated) return;
    setLoadingScenarios(true);
    fetch(`${API_BASE}/scenarios`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setScenariosList(data))
      .catch((err) => console.error("Error loading scenarios:", err))
      .finally(() => setLoadingScenarios(false));
  }, [authenticated]);

  if (!authenticated) {
    return <PasswordGate onAuthenticated={() => setAuthenticated(true)} />;
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith(".xlsx")) {
        setExcelFile(file);
        setError(null);
      } else {
        setError("Only Excel workbook (.xlsx) files are supported.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith(".xlsx")) {
        setExcelFile(file);
        setError(null);
      } else {
        setError("Only Excel workbook (.xlsx) files are supported.");
      }
    }
  };

  // Upload Excel & Recalculate
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!excelFile) {
      setError("Please select an Excel workbook to upload.");
      return;
    }
    if (!projectDetails.projectId.trim()) {
      setError("Project ID is required.");
      return;
    }

    setUploading(true);
    setUploadProgress("Reading workbook file...");
    setConsoleLog("Starting file processing...\n");
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const result = event.target?.result as string;
          const base64Data = result.split(",")[1];
          
          setUploadProgress("Uploading file & running extraction worker...");
          setConsoleLog((prev) => prev + "Sending workbook to backend...\n");

          const response = await fetch(`${API_BASE}/admin/upload-excel`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileContent: base64Data,
              fileName: excelFile.name,
              projectId: projectDetails.projectId,
              projectManager: projectDetails.projectManager,
              clientCompany: projectDetails.clientCompany,
              projectDescription: projectDetails.projectDescription
            })
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Failed to process workbook");

          setConsoleLog((prev) => prev + (data.log || "Success.\n"));
          setUploadProgress("Processing completed successfully!");

          // Update computation date in project list
          if (selectedProject) {
            const dateStr = new Date().toISOString().replace("T", " ").substring(0, 16);
            setProjects((prev) =>
              prev.map((p) =>
                p.projectId === selectedProject.projectId
                  ? { ...p, lastComputationDate: dateStr, status: "Published" }
                  : p
              )
            );
          }

          alert("Workbook successfully uploaded and scenarios recalculated!");
          setExcelFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          navigate("/");
        } catch (err: any) {
          setError(err.message || "An error occurred during file upload.");
          setConsoleLog((prev) => prev + `\n[ERROR] ${err.message || err}\n`);
          setUploadProgress("Failed to process workbook.");
        } finally {
          setUploading(false);
        }
      };

      reader.onerror = () => {
        setError("Failed to read the file.");
        setUploading(false);
      };

      reader.readAsDataURL(excelFile);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
      setUploading(false);
    }
  };

  // Create New Project
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.projectId.trim() || !newProject.projectName.trim()) {
      alert("Project ID and Name are required!");
      return;
    }

    const created: Project = {
      ...newProject,
      lastComputationDate: "Never"
    };

    setProjects((prev) => [created, ...prev]);
    setSelectedProject(created);
    setShowNewProjectForm(false);
    setNewProject({
      projectId: "",
      projectName: "",
      client: "",
      commodity: "Coal",
      status: "Draft",
      manager: "",
      description: ""
    });
    setActiveTab("computation-control");
  };

  // Archive Project
  const handleArchiveProject = (projectId: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.projectId === projectId ? { ...p, status: "Archived" } : p))
    );
  };

  // Update a single parameter value
  const handleUpdateParameter = async (key: string, value: any) => {
    setSavingParam(key);
    try {
      const response = await fetch(`${API_BASE}/admin/update-input`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection: selectedCollection,
          key: key,
          value: parseFloat(value) || value
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update parameter");

      // Update local state
      setHardInputs((prev: any) => {
        const updatedCollection = prev[selectedCollection].map((item: any) =>
          item.key === key
            ? { ...item, [getValFieldName(selectedCollection)]: parseFloat(value) || value }
            : item
        );
        return { ...prev, [selectedCollection]: updatedCollection };
      });
    } catch (err: any) {
      alert(`Error updating parameter: ${err.message}`);
    } finally {
      setSavingParam(null);
    }
  };

  const getValFieldName = (collectionName: string) => {
    const fields: { [key: string]: string } = {
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
      production_schedule_params: "Value"
    };
    return fields[collectionName] || "Value";
  };

  const getDescriptionFieldName = (item: any) => {
    const ignored = ["id", "key", "Unit", "Value", "Values", "Annual CTC", "Base Rate", "Basis", "Representative Price", "Operational Parameters"];
    for (const k of Object.keys(item)) {
      if (!ignored.includes(k)) return k;
    }
    if (item["Operational Parameters"]) return "Operational Parameters";
    return "key";
  };

  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  return (
    <div className="admin-shell">
      {/* ── Sidebar Navigation ───────────────────────────────── */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar__section">
          <div className="admin-sidebar__section-title">Global View</div>
          <button
            className={`admin-sidebar__btn ${activeTab === "dashboard" ? "admin-sidebar__btn--active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            📊 Dashboard Overview
          </button>
          <button
            className={`admin-sidebar__btn ${activeTab === "project-list" ? "admin-sidebar__btn--active" : ""}`}
            onClick={() => setActiveTab("project-list")}
          >
            📁 Project List
          </button>
        </div>

        <div className="admin-sidebar__section" style={{ marginTop: "var(--space-md)" }}>
          <div className="admin-sidebar__section-title">Selected Project</div>
          {selectedProject ? (
            <>
              <div className="admin-sidebar__project-badge" title={selectedProject.projectName}>
                📁 {selectedProject.projectId}
              </div>
              <button
                className={`admin-sidebar__btn ${activeTab === "input-management" ? "admin-sidebar__btn--active" : ""}`}
                onClick={() => setActiveTab("input-management")}
              >
                ⚙️ Input Management
              </button>
              <button
                className={`admin-sidebar__btn ${activeTab === "computation-control" ? "admin-sidebar__btn--active" : ""}`}
                onClick={() => setActiveTab("computation-control")}
              >
                🚀 Computation Control
              </button>
              <button
                className={`admin-sidebar__btn ${activeTab === "result-preview" ? "admin-sidebar__btn--active" : ""}`}
                onClick={() => setActiveTab("result-preview")}
              >
                👁️ Result Preview
              </button>
            </>
          ) : (
            <div style={{ padding: "0 var(--space-sm)", fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
              No project opened. Select a project from the project list.
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Content Area ────────────────────────────────── */}
      <main className="admin-content-area animate-in">
        
        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === "dashboard" && (
          <div>
            <div className="section-header">
              <div className="section-header__bar" />
              <h2 className="section-header__title">Admin Operations Dashboard</h2>
              <span className="section-header__subtitle">System-wide mining project options summary</span>
            </div>

            <div className="kpi-grid">
              <div className="kpi-card kpi-card--indigo">
                <div className="kpi-card__icon kpi-card__icon--indigo">📁</div>
                <div className="kpi-card__label">Total Projects</div>
                <div className="kpi-card__value">{projects.length}</div>
              </div>
              <div className="kpi-card kpi-card--emerald">
                <div className="kpi-card__icon kpi-card__icon--emerald">⚡</div>
                <div className="kpi-card__label">Active Models</div>
                <div className="kpi-card__value">
                  {projects.filter((p) => p.status !== "Archived").length}
                </div>
              </div>
              <div className="kpi-card kpi-card--amber">
                <div className="kpi-card__icon kpi-card__icon--amber">⚙️</div>
                <div className="kpi-card__label">Draft Status</div>
                <div className="kpi-card__value">
                  {projects.filter((p) => p.status === "Draft").length}
                </div>
              </div>
              <div className="kpi-card kpi-card--rose">
                <div className="kpi-card__icon kpi-card__icon--rose">📦</div>
                <div className="kpi-card__label">Archived</div>
                <div className="kpi-card__value">
                  {projects.filter((p) => p.status === "Archived").length}
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ marginTop: "var(--space-lg)" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "var(--space-md)" }}>
                ⚙️ Centralized Techno-Economic Model (TEM) Controller
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "var(--space-md)" }}>
                Welcome to the digitised Techno-Economic Model management console. This administrative portal provides full governance over multiple coal and metal mine evaluation options.
              </p>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button className="btn btn--primary" onClick={() => setActiveTab("project-list")}>
                  📁 Browse Projects List
                </button>
                <button className="btn btn--ghost" onClick={() => navigate("/")}>
                  📊 Go to Public Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PROJECT LIST */}
        {activeTab === "project-list" && (
          <div>
            <div className="section-header" style={{ marginBottom: "var(--space-lg)" }}>
              <div className="section-header__bar" />
              <h2 className="section-header__title">Project Register</h2>
              <button 
                className="btn btn--primary" 
                style={{ marginLeft: "auto" }} 
                onClick={() => setShowNewProjectForm(true)}
              >
                ➕ New Project
              </button>
            </div>

            {/* New Project Form Card */}
            {showNewProjectForm && (
              <div className="glass-card animate-in" style={{ marginBottom: "var(--space-lg)", borderLeft: "4px solid var(--accent-primary)" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "var(--space-md)" }}>
                  📋 Create New Mining DPR Project Option
                </h3>
                <form onSubmit={handleCreateProject} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)" }}>
                  <div>
                    <label className="admin-field__label" style={{ color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: "4px" }}>Project ID / Code *</label>
                    <input 
                      type="text" 
                      className="admin-field__input" 
                      style={{ width: "100%", textAlign: "left", padding: "8px 12px" }}
                      placeholder="e.g. IN_1412" 
                      required
                      value={newProject.projectId}
                      onChange={(e) => setNewProject({ ...newProject, projectId: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="admin-field__label" style={{ color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: "4px" }}>Project Name *</label>
                    <input 
                      type="text" 
                      className="admin-field__input" 
                      style={{ width: "100%", textAlign: "left", padding: "8px 12px" }}
                      placeholder="e.g. Radhikapur Coal Block Option 3" 
                      required
                      value={newProject.projectName}
                      onChange={(e) => setNewProject({ ...newProject, projectName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="admin-field__label" style={{ color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: "4px" }}>Client Company</label>
                    <input 
                      type="text" 
                      className="admin-field__input" 
                      style={{ width: "100%", textAlign: "left", padding: "8px 12px" }}
                      placeholder="Client name" 
                      value={newProject.client}
                      onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="admin-field__label" style={{ color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: "4px" }}>Project Manager</label>
                    <input 
                      type="text" 
                      className="admin-field__input" 
                      style={{ width: "100%", textAlign: "left", padding: "8px 12px" }}
                      placeholder="Manager name" 
                      value={newProject.manager}
                      onChange={(e) => setNewProject({ ...newProject, manager: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="admin-field__label" style={{ color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: "4px" }}>Commodity Type</label>
                    <input 
                      type="text" 
                      className="admin-field__input" 
                      style={{ width: "100%", textAlign: "left", padding: "8px 12px" }}
                      value={newProject.commodity}
                      onChange={(e) => setNewProject({ ...newProject, commodity: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="admin-field__label" style={{ color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: "4px" }}>Status</label>
                    <select 
                      className="admin-field__input" 
                      style={{ width: "100%", textAlign: "left", padding: "8px 12px", height: "36px" }}
                      value={newProject.status}
                      onChange={(e: any) => setNewProject({ ...newProject, status: e.target.value })}
                    >
                      <option value="Draft">Draft</option>
                      <option value="Published">Published</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label className="admin-field__label" style={{ color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: "4px" }}>Description</label>
                    <textarea 
                      className="admin-field__input" 
                      style={{ width: "100%", textAlign: "left", padding: "8px 12px", minHeight: "80px", fontFamily: "inherit" }}
                      placeholder="Enter project DPR description..."
                      value={newProject.description}
                      onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    />
                  </div>
                  <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                    <button type="button" className="btn btn--ghost" onClick={() => setShowNewProjectForm(false)}>Cancel</button>
                    <button type="submit" className="btn btn--primary">Create Project</button>
                  </div>
                </form>
              </div>
            )}

            <div className="glass-card data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Project ID & Name</th>
                    <th>Client</th>
                    <th>Commodity</th>
                    <th>Status</th>
                    <th>Last Computed</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.projectId}>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{project.projectId}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{project.projectName}</div>
                      </td>
                      <td>{project.client}</td>
                      <td>
                        <span style={{ fontSize: "0.75rem", background: "rgba(99, 102, 241, 0.08)", padding: "2px 8px", borderRadius: "4px", color: "var(--accent-primary)" }}>
                          {project.commodity}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          project.status === "Published" ? "badge--coming-soon" : ""
                        }`} style={{
                          background: project.status === "Published" ? "rgba(16, 185, 129, 0.1)" : (project.status === "Draft" ? "rgba(245, 158, 11, 0.1)" : "rgba(100, 116, 139, 0.1)"),
                          color: project.status === "Published" ? "var(--accent-emerald)" : (project.status === "Draft" ? "var(--accent-amber)" : "var(--text-tertiary)"),
                          border: project.status === "Published" ? "1px solid rgba(16, 185, 129, 0.2)" : (project.status === "Draft" ? "1px solid rgba(245, 158, 11, 0.2)" : "1px solid rgba(100, 116, 139, 0.2)")
                        }}>
                          {project.status}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        {project.lastComputationDate}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          <button
                            className="btn btn--primary"
                            style={{ padding: "6px 12px", fontSize: "0.75rem" }}
                            onClick={() => {
                              setSelectedProject(project);
                              setActiveTab("computation-control");
                            }}
                          >
                            Open
                          </button>
                          <button
                            className="btn btn--ghost"
                            style={{ padding: "6px 12px", fontSize: "0.75rem" }}
                            onClick={() => {
                              const shareUrl = `${window.location.origin}/project/${project.projectId}`;
                              navigator.clipboard.writeText(shareUrl);
                              alert(`Client Share URL copied to clipboard:\n${shareUrl}`);
                            }}
                          >
                            🔗 Share
                          </button>
                          {project.status !== "Archived" && (
                            <button
                              className="btn btn--ghost"
                              style={{ padding: "6px 12px", fontSize: "0.75rem" }}
                              onClick={() => handleArchiveProject(project.projectId)}
                            >
                              Archive
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: INPUT MANAGEMENT */}
        {activeTab === "input-management" && selectedProject && (
          <div>
            <div className="section-header">
              <div className="section-header__bar" />
              <h2 className="section-header__title">Input Assumptions: {selectedProject.projectId}</h2>
              <span className="section-header__subtitle">Review and update parameters directly in MongoDB</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "var(--space-lg)" }}>
              {/* Collections Navigation List */}
              <div className="glass-card" style={{ padding: "var(--space-md)", display: "flex", flexDirection: "column", gap: "4px" }}>
                <span className="admin-sidebar__section-title" style={{ padding: "0 8px" }}>Assumptions Groups</span>
                {Object.keys(HARD_INPUT_COLLECTIONS_LABELS).map((colKey) => (
                  <button
                    key={colKey}
                    className={`admin-sidebar__btn ${selectedCollection === colKey ? "admin-sidebar__btn--active" : ""}`}
                    style={{ padding: "8px 12px", fontSize: "0.8rem" }}
                    onClick={() => setSelectedCollection(colKey)}
                  >
                    {HARD_INPUT_COLLECTIONS_LABELS[colKey]}
                  </button>
                ))}
              </div>

              {/* Table rendering the active assumptions list */}
              <div className="glass-card">
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "var(--space-md)", textTransform: "capitalize" }}>
                  📋 {HARD_INPUT_COLLECTIONS_LABELS[selectedCollection] || selectedCollection} Table
                </h3>

                {loadingInputs ? (
                  <div className="loading-state">
                    <div className="loading-spinner" />
                    <div className="loading-text">Loading parameters from database...</div>
                  </div>
                ) : hardInputs && hardInputs[selectedCollection] ? (
                  <div className="data-table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Parameter Label</th>
                          <th>Value</th>
                          <th>Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hardInputs[selectedCollection].map((item: any, i: number) => {
                          const descField = getDescriptionFieldName(item);
                          const valField = getValFieldName(selectedCollection);
                          return (
                            <tr key={i}>
                              <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                                {item[descField]}
                              </td>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" }}>
                                  {savingParam === item.key && (
                                    <span style={{ fontSize: "0.75rem", color: "var(--accent-primary)" }}>Saving...</span>
                                  )}
                                  <input
                                    type="text"
                                    defaultValue={item[valField]}
                                    className="admin-field__input"
                                    style={{ width: "90px", fontSize: "0.8rem" }}
                                    onBlur={(e) => {
                                      if (e.target.value !== String(item[valField])) {
                                        handleUpdateParameter(item.key, e.target.value);
                                      }
                                    }}
                                  />
                                </div>
                              </td>
                              <td style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                                {item.Unit || item.unit || "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem", textAlign: "center", padding: "40px" }}>
                    No assumptions data found. Please trigger computation control to recalculate.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: COMPUTATION CONTROL */}
        {activeTab === "computation-control" && selectedProject && (
          <div>
            <div className="section-header" style={{ marginBottom: "var(--space-xl)" }}>
              <div className="section-header__bar" />
              <h2 className="section-header__title">Computation Control: {selectedProject.projectId}</h2>
              <span className="section-header__subtitle">
                Upload new Excel TEM and trigger the Python calculation engine.
              </span>
            </div>

            <form onSubmit={handleUpload} className="admin-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "var(--space-lg)" }}>
              {/* Project Metadata Section */}
              <div className="glass-card">
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "var(--space-md)", borderBottom: "var(--border-subtle)", paddingBottom: "10px" }}>
                  📋 Project Credentials
                </h3>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-md)" }}>
                  <div className="field-group">
                    <label className="admin-field__label" style={{ display: "block", marginBottom: "6px", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Project ID *</label>
                    <input
                      type="text"
                      className="admin-field__input"
                      style={{ width: "100%", textAlign: "left", fontSize: "0.9rem", padding: "10px 14px" }}
                      required
                      value={projectDetails.projectId}
                      onChange={(e) => setProjectDetails({ ...projectDetails, projectId: e.target.value })}
                      disabled={uploading}
                    />
                  </div>

                  <div className="field-group">
                    <label className="admin-field__label" style={{ display: "block", marginBottom: "6px", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Project Manager</label>
                    <input
                      type="text"
                      className="admin-field__input"
                      style={{ width: "100%", textAlign: "left", fontSize: "0.9rem", padding: "10px 14px" }}
                      value={projectDetails.projectManager}
                      onChange={(e) => setProjectDetails({ ...projectDetails, projectManager: e.target.value })}
                      disabled={uploading}
                    />
                  </div>

                  <div className="field-group">
                    <label className="admin-field__label" style={{ display: "block", marginBottom: "6px", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Client Company</label>
                    <input
                      type="text"
                      className="admin-field__input"
                      style={{ width: "100%", textAlign: "left", fontSize: "0.9rem", padding: "10px 14px" }}
                      value={projectDetails.clientCompany}
                      onChange={(e) => setProjectDetails({ ...projectDetails, clientCompany: e.target.value })}
                      disabled={uploading}
                    />
                  </div>

                  <div className="field-group" style={{ gridColumn: "1 / -1" }}>
                    <label className="admin-field__label" style={{ display: "block", marginBottom: "6px", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Project Description</label>
                    <textarea
                      className="admin-field__input"
                      style={{ width: "100%", textAlign: "left", fontSize: "0.9rem", padding: "10px 14px", minHeight: "100px", fontFamily: "inherit", resize: "vertical" }}
                      value={projectDetails.projectDescription}
                      onChange={(e) => setProjectDetails({ ...projectDetails, projectDescription: e.target.value })}
                      disabled={uploading}
                    />
                    <div style={{ textAlign: "right", fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "4px" }}>
                      {countWords(projectDetails.projectDescription)} words
                    </div>
                  </div>
                </div>
              </div>

              {/* Excel Upload Section */}
              <div className="glass-card">
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "var(--space-md)", borderBottom: "var(--border-subtle)", paddingBottom: "10px" }}>
                  📂 TEM Workbook File
                </h3>

                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className={`admin-dropzone ${uploading ? "admin-dropzone--disabled" : ""}`}
                >
                  <input
                    type="file"
                    accept=".xlsx"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                  
                  <div style={{ fontSize: "3rem", marginBottom: "12px" }}>📊</div>
                  {excelFile ? (
                    <div>
                      <div style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "1.05rem", marginBottom: "4px" }}>
                        {excelFile.name}
                      </div>
                      <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                        {(excelFile.size / (1024 * 1024)).toFixed(2)} MB — Ready to upload
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "1rem", marginBottom: "4px" }}>
                        Drag & Drop Excel file here, or click to browse
                      </div>
                      <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                        Supports TEM excel workbooks (.xlsx) up to 50MB
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="glass-card" style={{ padding: "16px var(--space-lg)", background: "rgba(244, 63, 94, 0.08)", border: "1px solid rgba(244, 63, 94, 0.25)", borderRadius: "10px", color: "#fca5a5", display: "flex", gap: "10px", alignItems: "center" }}>
                  <span style={{ fontSize: "1.2rem" }}>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Upload Button */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--space-xs)", flexWrap: "wrap", gap: "8px" }}>
                <button
                  type="submit"
                  disabled={uploading || !excelFile}
                  className="btn btn--primary"
                  style={{ padding: "12px 36px", fontSize: "0.95rem", fontWeight: 600, flex: "1 1 auto", maxWidth: "320px", minWidth: "180px" }}
                >
                  {uploading ? "Processing Workbook..." : "🚀 Process & Recalculate Scenario"}
                </button>
              </div>
            </form>

            {/* Progress & Console Log console */}
            {(uploading || consoleLog) && (
              <div className="glass-card animate-in" style={{ padding: "var(--space-xl)", marginTop: "var(--space-xl)" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "var(--space-md)" }}>
                  ⚙️ Worker Execution Log
                </h3>
                
                {uploading && (
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", color: "var(--accent-primary)", fontWeight: 500 }}>
                    <div className="loading-spinner" style={{ width: "20px", height: "20px", borderWidth: "2px" }} />
                    <span>{uploadProgress}</span>
                  </div>
                )}

                <div
                  style={{
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(99, 102, 241, 0.15)",
                    borderRadius: "8px",
                    padding: "16px 20px",
                    color: "#94a3b8",
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontSize: "0.82rem",
                    lineHeight: 1.6,
                    maxHeight: "350px",
                    overflowY: "auto",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {consoleLog || "Waiting for upload..."}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: RESULT PREVIEW */}
        {activeTab === "result-preview" && selectedProject && (
          <div>
            <div className="section-header">
              <div className="section-header__bar" />
              <h2 className="section-header__title">Result Preview: {selectedProject.projectId}</h2>
              <span className="section-header__subtitle">Quick overview of calculated scenarios</span>
            </div>

            {loadingScenarios ? (
              <div className="loading-state">
                <div className="loading-spinner" />
                <div className="loading-text">Loading computed results from MongoDB...</div>
              </div>
            ) : scenariosList.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
                <div className="glass-card">
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "var(--space-sm)" }}>
                    🚀 Scenario Computations Complete
                  </h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "var(--space-md)" }}>
                    We have successfully pre-calculated all **8 scenario combinations** for this mining project in the database.
                  </p>
                  <button className="btn btn--primary" onClick={() => navigate("/")}>
                    📊 View Full Interactive Dashboard
                  </button>
                </div>

                <div className="glass-card">
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "var(--space-md)" }}>
                    Scenario Keys Pre-computed in MongoDB
                  </h3>
                  <div className="data-table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Scenario Combination Key</th>
                          <th>Mining Mode</th>
                          <th>Pre-Tax</th>
                          <th>Price Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scenariosList.map((sc, i) => (
                          <tr key={i}>
                            <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--accent-primary)" }}>
                              {sc.scenarioKey}
                            </td>
                            <td>{sc.switches?.mining_mode}</td>
                            <td>{sc.switches?.pre_tax_pre_finance}</td>
                            <td>{sc.switches?.coal_price_type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card" style={{ padding: "40px", textAlign: "center" }}>
                <div style={{ fontSize: "2rem", marginBottom: "12px" }}>⚠️</div>
                <h3 style={{ color: "var(--text-primary)", marginBottom: "8px" }}>No computed results found</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "var(--space-md)" }}>
                  This project does not have any calculated scenarios in MongoDB. Go to **Computation Control** to upload the master TEM workbook and trigger calculations.
                </p>
                <button className="btn btn--primary" onClick={() => setActiveTab("computation-control")}>
                  🚀 Upload Master TEM
                </button>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
