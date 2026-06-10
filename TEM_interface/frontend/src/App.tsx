import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { AdminPage } from "./pages/AdminPage";

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        {/* ── Header ─────────────────────────────────────── */}
        <header className="app-header">
          <div className="app-header__logo">
            <div className="app-header__logo-icon">T</div>
            <div>
              <div className="app-header__title">Techno-Economic model</div>
              <div className="app-header__subtitle">
                Techno-Economic Model — Made by SRK Consulting
              </div>
            </div>
          </div>
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
