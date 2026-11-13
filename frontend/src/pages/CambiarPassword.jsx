
import { useState } from "react";
import { KeyRound, LockKeyhole, CheckCircle2, AlertCircle } from "lucide-react";
import { cambiarPassword } from "../services/authService";
import "./CambiarPassword.css";

export default function CambiarPassword({ usuario, onPasswordCambiada, onLogout }) {
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (passwordNueva.length < 10) {
      setError("La nueva contraseña debe tener al menos 10 caracteres.");
      return;
    }

    if (passwordNueva.length > 72) {
      setError("La nueva contraseña no puede superar los 72 caracteres.");
      return;
    }

    if (passwordNueva !== confirmacion) {
      setError("Las nuevas contraseñas no coinciden.");
      return;
    }

    if (passwordActual === passwordNueva) {
      setError("La nueva contraseña debe ser diferente de la actual.");
      return;
    }

    setCargando(true);

    try {
      const usuarioActualizado = await cambiarPassword(
        passwordActual,
        passwordNueva
      );

      setMensaje("Contraseña actualizada correctamente.");

      onPasswordCambiada(usuarioActualizado);

    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="cambiar-password-container">
      <form className="cambiar-password-card" onSubmit={handleSubmit}>
        <div className="cambiar-password-icon">
          <KeyRound size={32} />
        </div>

        <h1>Cambio obligatorio de contraseña</h1>

        <p className="cambiar-password-subtitle">
          Hola {usuario?.nombre || usuario?.usuario}.
          Para continuar utilizando GOMERIA360,
          necesitás establecer una nueva contraseña.
        </p>

        <label htmlFor="passwordActual">
          Contraseña actual
        </label>

        <input
          id="passwordActual"
          type="password"
          value={passwordActual}
          onChange={(e) => setPasswordActual(e.target.value)}
          autoComplete="current-password"
          required
        />

        <label htmlFor="passwordNueva">
          Nueva contraseña
        </label>

        <input
          id="passwordNueva"
          type="password"
          value={passwordNueva}
          onChange={(e) => setPasswordNueva(e.target.value)}
          autoComplete="new-password"
          minLength={10}
          maxLength={72}
          required
        />

        <label htmlFor="confirmacion">
          Confirmar nueva contraseña
        </label>

        <input
          id="confirmacion"
          type="password"
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value)}
          autoComplete="new-password"
          minLength={10}
          maxLength={72}
          required
        />

        {error && (
          <div className="cambiar-password-error">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {mensaje && (
          <div className="cambiar-password-success">
            <CheckCircle2 size={18} />
            {mensaje}
          </div>
        )}

        <button type="submit" disabled={cargando}>
          {cargando ? (
            "Actualizando..."
          ) : (
            <>
              <LockKeyhole size={18} />
              CAMBIAR CONTRASEÑA
            </>
          )}
        </button>

        <button
          type="button"
          className="cambiar-password-logout"
          onClick={onLogout}
          disabled={cargando}
        >
          Cerrar sesión
        </button>

        <small>GOMERIA360 · Gestión integral</small>
      </form>
    </main>
  );
}
