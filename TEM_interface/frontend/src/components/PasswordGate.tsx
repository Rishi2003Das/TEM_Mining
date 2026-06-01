import { useState, type FormEvent } from "react";

interface PasswordGateProps {
  onAuthenticated: () => void;
}

const ADMIN_PASSWORD = "srk@admin2024";

export function PasswordGate({ onAuthenticated }: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      onAuthenticated();
    } else {
      setError("Incorrect password. Please try again.");
      setPassword("");
    }
  }

  return (
    <div className="password-gate">
      <form className="password-gate__card" onSubmit={handleSubmit}>
        <div className="password-gate__icon">🔒</div>
        <h2 className="password-gate__title">Admin Access</h2>
        <p className="password-gate__subtitle">
          Enter the admin password to view and manage hard inputs
        </p>
        {error && <div className="password-gate__error">{error}</div>}
        <input
          type="password"
          className="password-gate__input"
          placeholder="Enter password…"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          autoFocus
        />
        <button type="submit" className="btn btn--primary" style={{ width: "100%" }}>
          Unlock Dashboard
        </button>
      </form>
    </div>
  );
}
