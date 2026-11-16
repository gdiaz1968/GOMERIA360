
import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  Wrench,
  DollarSign,
  CheckCircle2,
  Clock,
  Store,
  Truck,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import "./Dashboard.css";

const API_URL = import.meta.env.VITE_API_URL || "";

// =====================================================
// FECHA LOCAL
// =====================================================

function fechaLocal() {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

// =====================================================
// FORMATO MONETARIO
// =====================================================

function moneda(valor) {
  const numero = Number(valor || 0);

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numero);
}

// =====================================================
// ROLES
// =====================================================

const roles = {
  ADMINISTRADOR: "Administrador",
  OPERADOR: "Operador"
};

// =====================================================
// COMPONENTE INDICADOR
// =====================================================

function Indicador({ titulo, valor, icono: Icono, variante }) {
  return (
    <article className={`dashboard-card ${variante || ""}`}>
      <div className="dashboard-card-info">
        <span>{titulo}</span>
        <strong>{valor}</strong>
      </div>

      <div className="dashboard-card-icon">
        <Icono size={23} />
      </div>
    </article>
  );
}

// =====================================================
// RESUMEN POR UBICACIÓN
// =====================================================

function ResumenUbicacion({ ubicacion, datos }) {
  const esMovil = ubicacion === "MOVIL";

  return (
    <article className="location-card">
      <div className="location-card-header">
        <div className={`location-icon ${esMovil ? "mobile" : ""}`}>
          {esMovil ? <Truck size={23} /> : <Store size={23} />}
        </div>

        <div>
          <h3>{esMovil ? "Unidad móvil" : "Gomería"}</h3>
          <span>
            {esMovil ? "Trabajos en ruta" : "Trabajos en el local"}
          </span>
        </div>
      </div>

      <div className="location-metrics">
        <div>
          <span>Visitas</span>
          <strong>{datos?.visitas ?? 0}</strong>
        </div>

        <div>
          <span>Trabajos</span>
          <strong>{datos?.trabajos ?? 0}</strong>
        </div>
      </div>

      <div className="location-total">
        <span>Total registrado</span>
        <strong>{moneda(datos?.total_registrado)}</strong>
      </div>

      <div className="location-payment">
        <div>
          <span>Cobrado</span>
          <strong className="text-success">
            {moneda(datos?.total_cobrado)}
          </strong>
        </div>

        <div>
          <span>Pendiente</span>
          <strong className="text-warning">
            {moneda(datos?.total_pendiente)}
          </strong>
        </div>
      </div>
    </article>
  );
}

// =====================================================
// DASHBOARD
// =====================================================

export default function Dashboard() {
  const [fecha, setFecha] = useState(fechaLocal);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // ===================================================
  // CONSULTAR DASHBOARD
  // ===================================================

  const cargarDashboard = useCallback(async (fechaConsulta) => {
    setCargando(true);
    setError("");

    try {
      const token = localStorage.getItem("gomeria360_token");

      if (!token) {
        throw new Error(
          "No se encontró la sesión. Cerrá sesión e ingresá nuevamente."
        );
      }

      const respuesta = await fetch(
        `${API_URL}/api/visitas/dashboard/resumen?fecha=${encodeURIComponent(fechaConsulta)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok || !resultado.ok) {
        throw new Error(
          resultado.mensaje ||
          `Error al consultar el Dashboard (${respuesta.status})`
        );
      }

      setDatos(resultado);

    } catch (err) {
      console.error("Error al cargar Dashboard:", err);

      setDatos(null);
      setError(err.message || "No se pudo cargar el Dashboard.");

    } finally {
      setCargando(false);
    }
  }, []);

  // ===================================================
  // CARGA INICIAL Y CAMBIO DE FECHA
  // ===================================================

  useEffect(() => {
    const temporizador = setTimeout(() => {
      cargarDashboard(fecha);
    }, 0);

    return () => {
      clearTimeout(temporizador);
    };
  }, [fecha, cargarDashboard]);

  // ===================================================
  // DATOS DEL DASHBOARD
  // ===================================================

  const resumen = datos?.resumen || {};
  const ubicaciones = datos?.ubicaciones || [];
  const operadores = datos?.operadores || [];

  const ubicacionGomeria = ubicaciones.find(
    item => item.ubicacion === "GOMERIA"
  );

  const ubicacionMovil = ubicaciones.find(
    item => item.ubicacion === "MOVIL"
  );

  // ===================================================
  // INTERFAZ
  // ===================================================

  return (
    <section className="dashboard">

      <div className="dashboard-toolbar">
        <div>
          <h2>Resumen de actividad</h2>
          <p>Control diario de visitas, trabajos e ingresos.</p>
        </div>

        <div className="dashboard-date">
          <CalendarDays size={19} />

          <input
            type="date"
            value={fecha}
            onChange={event => setFecha(event.target.value)}
            aria-label="Seleccionar fecha del Dashboard"
          />

          <button
            type="button"
            onClick={() => cargarDashboard(fecha)}
            disabled={cargando}
            title="Actualizar información"
            aria-label="Actualizar información"
          >
            <RefreshCw
              size={18}
              className={cargando ? "spinning" : ""}
            />
          </button>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="dashboard-error">
          <AlertCircle size={21} />

          <div>
            <strong>No se pudo cargar el Dashboard</strong>
            <p>{error}</p>

            <button
              type="button"
              onClick={() => cargarDashboard(fecha)}
              disabled={cargando}
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* CARGANDO */}

      {cargando && !datos ? (
        <div className="dashboard-loading">
          <RefreshCw size={25} className="spinning" />
          <span>Consultando información...</span>
        </div>
      ) : datos ? (
        <>

          {/* INDICADORES GENERALES */}

          <div className="dashboard-section-title">
            <h3>Indicadores generales</h3>

            <span>
              {fecha.split("-").reverse().join("/")}
            </span>
          </div>

          <div className="dashboard-indicators">
            <Indicador
              titulo="Visitas registradas"
              valor={resumen.visitas ?? 0}
              icono={ClipboardList}
              variante="blue"
            />

            <Indicador
              titulo="Trabajos realizados"
              valor={resumen.trabajos ?? 0}
              icono={Wrench}
              variante="purple"
            />

            <Indicador
              titulo="Total registrado"
              valor={moneda(resumen.total_registrado)}
              icono={DollarSign}
              variante="navy"
            />

            <Indicador
              titulo="Total cobrado"
              valor={moneda(resumen.total_cobrado)}
              icono={CheckCircle2}
              variante="green"
            />

            <Indicador
              titulo="Total pendiente"
              valor={moneda(resumen.total_pendiente)}
              icono={Clock}
              variante="orange"
            />
          </div>

          {/* ACTIVIDAD POR UBICACIÓN */}

          <div className="dashboard-section-title">
            <h3>Actividad por ubicación</h3>
          </div>

          <div className="dashboard-locations">
            <ResumenUbicacion
              ubicacion="GOMERIA"
              datos={ubicacionGomeria}
            />

            <ResumenUbicacion
              ubicacion="MOVIL"
              datos={ubicacionMovil}
            />
          </div>

          {/* ACTIVIDAD POR OPERADOR */}

          <div className="dashboard-section-title">
            <div>
              <h3>Actividad por operador</h3>
              <p>
                Detalle de visitas, trabajos e importes registrados.
              </p>
            </div>
          </div>

          <div className="dashboard-table-container">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Visitas</th>
                  <th>Trabajos</th>
                  <th>Total registrado</th>
                  <th>Cobrado</th>
                  <th>Pendiente</th>
                </tr>
              </thead>

              <tbody>
                {operadores.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="dashboard-empty">
                      No hay usuarios activos para mostrar.
                    </td>
                  </tr>
                ) : (
                  operadores.map(operador => (
                    <tr key={operador.id_usuario}>
                      <td>
                        <strong>
                          {operador.nombre || operador.usuario}
                        </strong>
                      </td>

                      <td>
                        <span className="role-label">
                          {roles[operador.rol] || operador.rol}
                        </span>
                      </td>

                      <td>{operador.visitas}</td>
                      <td>{operador.trabajos}</td>

                      <td>
                        {moneda(operador.total_registrado)}
                      </td>

                      <td className="text-success">
                        {moneda(operador.total_cobrado)}
                      </td>

                      <td className="text-warning">
                        {moneda(operador.total_pendiente)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </>
      ) : !error ? (
        <div className="dashboard-empty-state">
          No hay información disponible para la fecha seleccionada.
        </div>
      ) : null}

    </section>
  );
}
