import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { AdminPage } from "./pages/AdminPage";

function App() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("theme");
    return (saved as "dark" | "light") || "dark";
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
      <div className="app-layout">
        {/* ── Header ─────────────────────────────────────── */}
        <header className="app-header">
          <div className="app-header__logo">
            <div className="app-header__logo-icon">T</div>
            <div>
              <div className="app-header__title">TEM Dashboard</div>
              <div className="app-header__subtitle">
                Techno-Economic Model — Option 3 · 15 Mtpa
              </div>
            </div>
          </div>
          <div className="app-header__right">
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
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle Theme"
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
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
