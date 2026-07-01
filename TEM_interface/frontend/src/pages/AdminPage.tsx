import { useState, useEffect, useRef } from "react";
import { PasswordGate } from "../components/PasswordGate";
import { API_BASE } from "../types";

interface ProjectDetails {
  projectId: string;
  projectManager: string;
  clientCompany: string;
  projectDescription: string;
}

export function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [projectDetails, setProjectDetails] = useState<ProjectDetails>({
    projectId: "",
    projectManager: "",
    clientCompany: "",
    projectDescription: "",
  });

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [consoleLog, setConsoleLog] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current project metadata once authenticated
  useEffect(() => {
    if (!authenticated) return;

    setLoadingMetadata(true);
    fetch(`${API_BASE}/project-metadata`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load project metadata");
        return res.json();
      })
      .then((data) => {
        if (data) {
          setProjectDetails({
            projectId: data.projectId || "",
            projectManager: data.projectManager || "",
            clientCompany: data.clientCompany || "",
            projectDescription: data.projectDescription || "",
          });
        }
      })
      .catch((err) => console.error("Error loading metadata:", err))
      .finally(() => setLoadingMetadata(false));
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
      // 1. Read file as base64 string
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const result = event.target?.result as string;
          // Extract base64 part
          const base64Data = result.split(",")[1];
          
          setUploadProgress("Uploading file & running extraction worker...");
          setConsoleLog((prev) => prev + "Sending workbook to backend...\n");

          // 2. Post to API
          const response = await fetch(`${API_BASE}/admin/upload-excel`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fileContent: base64Data,
              fileName: excelFile.name,
              projectId: projectDetails.projectId,
              projectManager: projectDetails.projectManager,
              clientCompany: projectDetails.clientCompany,
              projectDescription: projectDetails.projectDescription,
            }),
          });

          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.error || "Failed to process workbook");
          }

          setConsoleLog((prev) => prev + (data.log || "Success.\n"));
          setUploadProgress("Processing completed successfully!");
          alert("Workbook successfully uploaded and scenarios recalculated!");
          setExcelFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
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

  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  return (
    <div className="admin-container animate-in" style={{ padding: "var(--space-lg) 0", maxWidth: "1000px", margin: "0 auto" }}>
      <div className="section-header" style={{ marginBottom: "var(--space-xl)" }}>
        <div className="section-header__bar" />
        <h2 className="section-header__title">Project Configuration & Workbook Upload</h2>
        <span className="section-header__subtitle">
          Upload the master Excel workbook (.xlsx) to extract parameters, production schedules, and pre-calculate scenarios.
        </span>
      </div>

      <form onSubmit={handleUpload} className="admin-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "var(--space-lg)" }}>
        {/* Project Metadata Section */}
        <div className="glass-card">
          <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#f1f5f9", marginBottom: "var(--space-md)", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "10px" }}>
            📋 Project Credentials
          </h3>
          
          {loadingMetadata ? (
            <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Loading existing project details...</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-md)" }}>
              <div className="field-group">
                <label className="admin-field__label" style={{ display: "block", marginBottom: "6px", fontSize: "0.8rem", fontWeight: 600, color: "#94a3b8" }}>Project ID *</label>
                <input
                  type="text"
                  className="admin-field__input"
                  style={{ width: "100%", textAlign: "left", fontSize: "0.9rem", padding: "10px 14px" }}
                  placeholder="e.g. TEM-2026-001"
                  required
                  value={projectDetails.projectId}
                  onChange={(e) => setProjectDetails({ ...projectDetails, projectId: e.target.value })}
                  disabled={uploading}
                />
              </div>

              <div className="field-group">
                <label className="admin-field__label" style={{ display: "block", marginBottom: "6px", fontSize: "0.8rem", fontWeight: 600, color: "#94a3b8" }}>Project Manager</label>
                <input
                  type="text"
                  className="admin-field__input"
                  style={{ width: "100%", textAlign: "left", fontSize: "0.9rem", padding: "10px 14px" }}
                  placeholder="Manager name"
                  value={projectDetails.projectManager}
                  onChange={(e) => setProjectDetails({ ...projectDetails, projectManager: e.target.value })}
                  disabled={uploading}
                />
              </div>

              <div className="field-group">
                <label className="admin-field__label" style={{ display: "block", marginBottom: "6px", fontSize: "0.8rem", fontWeight: 600, color: "#94a3b8" }}>Client Company</label>
                <input
                  type="text"
                  className="admin-field__input"
                  style={{ width: "100%", textAlign: "left", fontSize: "0.9rem", padding: "10px 14px" }}
                  placeholder="Client name"
                  value={projectDetails.clientCompany}
                  onChange={(e) => setProjectDetails({ ...projectDetails, clientCompany: e.target.value })}
                  disabled={uploading}
                />
              </div>

              <div className="field-group" style={{ gridColumn: "1 / -1" }}>
                <label className="admin-field__label" style={{ display: "block", marginBottom: "6px", fontSize: "0.8rem", fontWeight: 600, color: "#94a3b8" }}>Project Description</label>
                <textarea
                  className="admin-field__input"
                  style={{ width: "100%", textAlign: "left", fontSize: "0.9rem", padding: "10px 14px", minHeight: "100px", fontFamily: "inherit", resize: "vertical" }}
                  placeholder="Describe the scope, options, and key aspects of this project..."
                  value={projectDetails.projectDescription}
                  onChange={(e) => setProjectDetails({ ...projectDetails, projectDescription: e.target.value })}
                  disabled={uploading}
                />
                <div style={{ textAlign: "right", fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>
                  {countWords(projectDetails.projectDescription)} words
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Excel Upload Section */}
        <div className="glass-card">
          <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#f1f5f9", marginBottom: "var(--space-md)", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "10px" }}>
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
                <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: "1.05rem", marginBottom: "4px" }}>
                  {excelFile.name}
                </div>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  {(excelFile.size / (1024 * 1024)).toFixed(2)} MB — Ready to upload
                </div>
              </div>
            ) : (
              <div>
                <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: "1rem", marginBottom: "4px" }}>
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
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#f1f5f9", marginBottom: "var(--space-md)" }}>
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
  );
}
