
import { useState } from "react";
import { iniciarSesion } from "../services/authService";
import "./Login.css";

export default function Login({ onLogin }) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setCargando(true);

    try {
      const datosUsuario = await iniciarSesion(usuario, password);
      onLogin(datosUsuario);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="login-container">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-logo">G360</div>

        <h1>GOMERIA360</h1>
        <p className="login-subtitle">
          Sistema de gestión de gomería
        </p>

        <label htmlFor="usuario">Usuario</label>
        <input
          id="usuario"
          type="text"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          placeholder="Ingresá tu usuario"
          autoComplete="username"
          required
        />

        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Ingresá tu contraseña"
          autoComplete="current-password"
          required
        />

        {error && <div className="login-error">{error}</div>}

        <button type="submit" disabled={cargando}>
          {cargando ? "Ingresando..." : "INGRESAR"}
        </button>

        <small>GOMERIA360 · Gestión integral</small>
      </form>
    </main>
  );
}
