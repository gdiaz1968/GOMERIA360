
import { useState } from "react";
import Login from "./pages/Login";
import { obtenerUsuario, cerrarSesion } from "./services/authService";
import "./App.css";

function App() {
  const [usuario, setUsuario] = useState(obtenerUsuario);

  function handleLogin(datosUsuario) {
    setUsuario(datosUsuario);
  }

  function handleLogout() {
    cerrarSesion();
    setUsuario(null);
  }

  if (!usuario) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <main style={{ padding: "30px" }}>
      <h1>GOMERIA360</h1>
      <h2>Bienvenido/a, {usuario.nombre}</h2>
      <p>Rol: {usuario.rol}</p>

      {usuario.rol === "DUENA" && (
        <h3>Panel de administración</h3>
      )}

      {usuario.rol === "OPERADOR_LOCAL" && (
        <h3>Registro de trabajos - Gomería</h3>
      )}

      {usuario.rol === "OPERADOR_MOVIL" && (
        <h3>Registro de trabajos - Unidad móvil</h3>
      )}

      <button onClick={handleLogout}>Cerrar sesión</button>
    </main>
  );
}

export default App;
