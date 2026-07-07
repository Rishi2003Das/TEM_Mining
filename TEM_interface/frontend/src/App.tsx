import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { AdminPage } from "./pages/AdminPage";
import logoImg from "./assets/srk-logo-06-feb-2020.webp";

function AppContent({ theme, toggleTheme }: { theme: string; toggleTheme: () => void }) {
  const location = useLocation();
  const isSharedView = location.pathname.startsWith("/project/");

  return (
    <div className="app-layout">
      {/* ── Header ─────────────────────────────────────── */}
      <header className="app-header">
        <div className="app-header__logo">
          <img src={logoImg} alt="TEM Logo" style={{ height: "42px", objectFit: "contain", borderRadius: "6px" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
          {!isSharedView && (
            <nav className="app-header__nav">
              <NavLink
                to="/"
                className={({ isActive }) => (isActive ? "active" : "")}
                end
              >
                📊 Dashboard
              </NavLink>
              <NavLink
                to="/admin"
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                🔧 Admin
              </NavLink>
            </nav>
          )}
          <button 
            className="theme-toggle-btn" 
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────── */}
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/project/:projectId" element={<Dashboard />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <BrowserRouter>
      <AppContent theme={theme} toggleTheme={toggleTheme} />
    </BrowserRouter>
  );
}

export default App;
