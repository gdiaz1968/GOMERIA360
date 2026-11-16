
import { useState } from "react";
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  ChartNoAxesColumn,
  Wrench,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
  CircleUserRound,
  Construction,
} from "lucide-react";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NuevaVisita from "./pages/NuevaVisita";
import { obtenerUsuario, cerrarSesion } from "./services/authService";
import "./App.css";
import CambiarPassword from "./pages/CambiarPassword";

// =====================================================
// MENÚS SEGÚN ROL
// =====================================================

const menus = {
  ADMINISTRADOR: [
    { id: "panel", label: "Panel principal", icon: LayoutDashboard },
    { id: "nueva-visita", label: "Nueva visita", icon: PlusCircle },
    { id: "historial", label: "Historial de visitas", icon: ClipboardList },
    { id: "reportes", label: "Reportes", icon: ChartNoAxesColumn },
    { id: "trabajos", label: "Tipos de trabajo", icon: Wrench },
    { id: "usuarios", label: "Usuarios", icon: Users },
    { id: "configuracion", label: "Configuración", icon: Settings },
  ],

  OPERADOR: [
    { id: "nueva-visita", label: "Nueva visita", icon: PlusCircle },
    { id: "historial", label: "Mis visitas", icon: ClipboardList },
  ],
};

// =====================================================
// NOMBRES DE LOS MÓDULOS
// =====================================================

const nombresModulos = {
  panel: "Panel principal",
  "nueva-visita": "Nueva visita",
  historial: "Historial de visitas",
  reportes: "Reportes",
  trabajos: "Tipos de trabajo",
  usuarios: "Usuarios",
  configuracion: "Configuración",
};

// =====================================================
// APLICACIÓN PRINCIPAL
// =====================================================

function App() {
  const [usuario, setUsuario] = useState(obtenerUsuario);

  const [moduloActivo, setModuloActivo] = useState(() => {
    const usuarioActual = obtenerUsuario();

    return usuarioActual?.rol === "ADMINISTRADOR"
      ? "panel"
      : "nueva-visita";
  });

  const [menuAbierto, setMenuAbierto] = useState(false);

  // ===================================================
  // LOGIN
  // ===================================================

  function handleLogin(datosUsuario) {
  setUsuario(datosUsuario);

  setModuloActivo(
    datosUsuario.rol === "ADMINISTRADOR"
      ? "panel"
      : "nueva-visita"
  );

  setMenuAbierto(false);
}

  // ===================================================
  // CERRAR SESIÓN
  // ===================================================

  function handleLogout() {
    cerrarSesion();
    setUsuario(null);
    setMenuAbierto(false);
    setModuloActivo("nueva-visita");
  }

  // ===================================================
  // NAVEGACIÓN
  // ===================================================

  function navegar(id) {
    // Verificar que el módulo pertenezca al menú del usuario.
    const tienePermiso = menus[usuario?.rol]?.some(
      (item) => item.id === id
    );

    if (!tienePermiso) {
      return;
    }

    setModuloActivo(id);
    setMenuAbierto(false);
  }

  // ===================================================
  // PANTALLA DE LOGIN
  // ===================================================

  if (!usuario) {
  return <Login onLogin={handleLogin} />;
}

// Cambio obligatorio de contraseña
if (usuario.debe_cambiar_password) {
  return (
    <CambiarPassword
      usuario={usuario}
      onPasswordCambiada={(usuarioActualizado) => {
        setUsuario(usuarioActualizado);

        setModuloActivo(
          usuarioActualizado.rol === "ADMINISTRADOR"
            ? "panel"
            : "nueva-visita"
        );
      }}
      onLogout={handleLogout}
    />
  );
}

  // ===================================================
  // DATOS DEL USUARIO
  // ===================================================

  const opcionesMenu = menus[usuario.rol] || [];

  const nombreRol = {
    ADMINISTRADOR: "Administrador",
    OPERADOR: "Operador",
  }[usuario.rol] || usuario.rol;

  const IconoModulo =
    opcionesMenu.find((item) => item.id === moduloActivo)?.icon ||
    Construction;

  const esAdministrador = usuario.rol === "ADMINISTRADOR";

  // ===================================================
  // INTERFAZ PRINCIPAL
  // ===================================================

  return (
    <div className="app-layout">

      {menuAbierto && (
        <button
          className="sidebar-overlay"
          aria-label="Cerrar menú"
          onClick={() => setMenuAbierto(false)}
        />
      )}

      <aside className={`sidebar ${menuAbierto ? "sidebar-open" : ""}`}>

        <div className="sidebar-brand">

          <div className="brand-symbol">
            <Wrench size={29} strokeWidth={2.4} />
          </div>

          <div className="brand-name">
            GOMERIA<span>360</span>
          </div>

          <button
            className="sidebar-close"
            onClick={() => setMenuAbierto(false)}
            aria-label="Cerrar menú"
          >
            <X size={22} />
          </button>

        </div>

        <div className="sidebar-section-label">
          MENÚ PRINCIPAL
        </div>

        <nav className="sidebar-nav">

          {opcionesMenu.map((item) => {
            const Icono = item.icon;

            return (
              <button
                key={item.id}
                className={`nav-item ${
                  moduloActivo === item.id ? "nav-item-active" : ""
                }`}
                onClick={() => navegar(item.id)}
              >
                <Icono size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}

        </nav>

        <div className="sidebar-footer">

          <div className="user-info">

            <div className="user-avatar">
              <CircleUserRound size={30} />
            </div>

            <div className="user-data">
              <strong>
                {usuario.nombre || usuario.usuario}
              </strong>

              <span>{nombreRol}</span>
            </div>

          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            <LogOut size={19} />
            <span>Cerrar sesión</span>
          </button>

        </div>

      </aside>

      <div className="main-area">

        <header className="topbar">

          <button
            className="menu-toggle"
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
          >
            <Menu size={24} />
          </button>

          <div className="topbar-title">
            GOMERIA360
          </div>

          <div className="topbar-user">
            <span className="status-dot" />

            <span>
              {usuario.nombre || usuario.usuario}
            </span>
          </div>

        </header>

        <main className="main-content">

          <div className="page-heading">

            <div className="page-icon">
              <IconoModulo size={25} />
            </div>

            <div>
              <h1>{nombresModulos[moduloActivo]}</h1>

              <p>
                Gestión de actividades de GOMERIA360
              </p>
            </div>

          </div>

          {moduloActivo === "panel" && esAdministrador ? (

            <Dashboard />

          ) : moduloActivo === "nueva-visita" ? (

            <NuevaVisita />

          ) : (

            <section className="module-placeholder">

              <div className="placeholder-icon">
                <Construction size={34} />
              </div>

              <h2>
                {nombresModulos[moduloActivo] || "Módulo"}
              </h2>

              <p>
                Esta pantalla forma parte del próximo desarrollo.
                La estructura general y los permisos de navegación
                ya están preparados.
              </p>

              <span className="module-status">
                Módulo pendiente de implementación
              </span>

            </section>

          )}

        </main>

        <footer className="app-footer">
          GOMERIA360 · Sistema de gestión
        </footer>

      </div>

    </div>
  );
}

export default App;
