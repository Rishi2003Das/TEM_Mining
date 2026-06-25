import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { AdminPage } from "./pages/AdminPage";
import logoImg from "./assets/srk-logo-06-feb-2020.webp";

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        {/* ── Header ─────────────────────────────────────── */}
        <header className="app-header">
          <div className="app-header__logo">
            <img src={logoImg} alt="TEM Logo" style={{ height: "42px", objectFit: "contain", borderRadius: "6px" }} />
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
