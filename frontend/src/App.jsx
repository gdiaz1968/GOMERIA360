
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
import { obtenerUsuario, cerrarSesion } from "./services/authService";
import "./App.css";

const menus = {
  DUENA: [
    { id: "panel", label: "Panel principal", icon: LayoutDashboard },
    { id: "nueva-visita", label: "Nueva visita", icon: PlusCircle },
    { id: "historial", label: "Historial de visitas", icon: ClipboardList },
    { id: "reportes", label: "Reportes", icon: ChartNoAxesColumn },
    { id: "trabajos", label: "Tipos de trabajo", icon: Wrench },
    { id: "usuarios", label: "Usuarios", icon: Users },
    { id: "configuracion", label: "Configuración", icon: Settings },
  ],

  OPERADOR_LOCAL: [
    { id: "nueva-visita", label: "Nueva visita", icon: PlusCircle },
    { id: "historial", label: "Mis visitas", icon: ClipboardList },
  ],

  OPERADOR_MOVIL: [
    { id: "nueva-visita", label: "Nueva visita", icon: PlusCircle },
    { id: "historial", label: "Mis visitas", icon: ClipboardList },
  ],
};

const nombresModulos = {
  panel: "Panel principal",
  "nueva-visita": "Nueva visita",
  historial: "Historial de visitas",
  reportes: "Reportes",
  trabajos: "Tipos de trabajo",
  usuarios: "Usuarios",
  configuracion: "Configuración",
};

function App() {
  const [usuario, setUsuario] = useState(obtenerUsuario);

  const [moduloActivo, setModuloActivo] = useState(
    usuario?.rol === "DUENA" ? "panel" : "nueva-visita"
  );

  const [menuAbierto, setMenuAbierto] = useState(false);

  function handleLogin(datosUsuario) {
    setUsuario(datosUsuario);

    setModuloActivo(
      datosUsuario.rol === "DUENA" ? "panel" : "nueva-visita"
    );
  }

  function handleLogout() {
    cerrarSesion();
    setUsuario(null);
    setMenuAbierto(false);
  }

  function navegar(id) {
    setModuloActivo(id);
    setMenuAbierto(false);
  }

  if (!usuario) {
    return <Login onLogin={handleLogin} />;
  }

  const opcionesMenu = menus[usuario.rol] || [];

  const nombreRol = {
    DUENA: "Dueña",
    OPERADOR_LOCAL: "Operador de gomería",
    OPERADOR_MOVIL: "Operador móvil",
  }[usuario.rol] || usuario.rol;

  const IconoModulo =
    opcionesMenu.find((item) => item.id === moduloActivo)?.icon ||
    Construction;

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
              <p>Gestión de actividades de GOMERIA360</p>
            </div>

          </div>

          {moduloActivo === "panel" && usuario.rol === "DUENA" ? (

            <Dashboard />

          ) : (

            <section className="module-placeholder">

              <div className="placeholder-icon">
                <Construction size={34} />
              </div>

              <h2>{nombresModulos[moduloActivo]}</h2>

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
