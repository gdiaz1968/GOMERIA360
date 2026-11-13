
import { useEffect, useState } from "react";
import {
  obtenerTiposTrabajo,
  crearVisita,
} from "../services/visitasService";

import "./NuevaVisita.css";

const VEHICULOS = [
  { value: "AUTO", label: "Auto" },
  { value: "CAMIONETA", label: "Camioneta" },
  { value: "CAMION", label: "Camión" },
  { value: "MOTO", label: "Moto" },
  { value: "OTRO", label: "Otro" },
];

function nuevoTrabajo() {
  return {
    id_tipo_trabajo: "",
    observacion: "",
    importe: "",
    estado_pago: "PENDIENTE",
  };
}

export default function NuevaVisita() {
  const [tiposTrabajo, setTiposTrabajo] = useState([]);
  const [cargandoTipos, setCargandoTipos] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [visita, setVisita] = useState({
    ubicacion: "GOMERIA",
    patente: "",
    tipo_vehiculo: "AUTO",
    observaciones: "",
    nombre_cliente_contacto: "",
    whatsapp_contacto: "",
    detalles: [nuevoTrabajo()],
  });

  useEffect(() => {
    let activo = true;

    async function cargarTipos() {
      try {
        setCargandoTipos(true);

        const tipos = await obtenerTiposTrabajo();

        if (activo) {
          setTiposTrabajo(Array.isArray(tipos) ? tipos : []);
        }
      } catch (err) {
        if (activo) {
          setError(err.message);
        }
      } finally {
        if (activo) {
          setCargandoTipos(false);
        }
      }
    }

    cargarTipos();

    return () => {
      activo = false;
    };
  }, []);

  function actualizarCampo(campo, valor) {
    setVisita((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  function actualizarTrabajo(indice, campo, valor) {
    setVisita((actual) => ({
      ...actual,
      detalles: actual.detalles.map((detalle, i) =>
        i === indice
          ? { ...detalle, [campo]: valor }
          : detalle
      ),
    }));
  }

  function agregarTrabajo() {
    if (visita.detalles.length >= 30) {
      setError("La visita admite un máximo de 30 trabajos.");
      return;
    }

    setError("");

    setVisita((actual) => ({
      ...actual,
      detalles: [...actual.detalles, nuevoTrabajo()],
    }));
  }

  function quitarTrabajo(indice) {
    if (visita.detalles.length === 1) {
      setError("La visita debe tener al menos un trabajo.");
      return;
    }

    setError("");

    setVisita((actual) => ({
      ...actual,
      detalles: actual.detalles.filter((_, i) => i !== indice),
    }));
  }

  function obtenerImporteNumerico(valor) {
    return Number(String(valor).replace(",", "."));
  }

  const total = visita.detalles.reduce((suma, detalle) => {
    const importe = detalle.importe.trim();

    if (!importe || !/^\d+([.,]\d{1,2})?$/.test(importe)) {
      return suma;
    }

    return suma + obtenerImporteNumerico(importe);
  }, 0);

  async function guardarVisita(evento) {
    evento.preventDefault();

    setError("");
    setMensaje("");

    if (cargandoTipos || tiposTrabajo.length === 0) {
      setError("No hay tipos de trabajo disponibles.");
      return;
    }

    for (let i = 0; i < visita.detalles.length; i++) {
      const detalle = visita.detalles[i];

      if (!detalle.id_tipo_trabajo) {
        setError(`Seleccioná el tipo de trabajo número ${i + 1}.`);
        return;
      }

      const importe = detalle.importe.trim().replace(",", ".");

      if (!/^\d{1,12}(\.\d{1,2})?$/.test(importe)) {
        setError(`El importe del trabajo número ${i + 1} no es válido.`);
        return;
      }

      if (
        !Number.isFinite(Number(importe)) ||
        Number(importe) > 999999999999
      ) {
        setError(`El importe del trabajo número ${i + 1} está fuera de rango.`);
        return;
      }
    }

    const datos = {
      ubicacion: visita.ubicacion,
      patente: visita.patente.trim(),
      tipo_vehiculo: visita.tipo_vehiculo,
      observaciones: visita.observaciones.trim(),
      nombre_cliente_contacto: visita.nombre_cliente_contacto.trim(),
      whatsapp_contacto: visita.whatsapp_contacto.trim(),
      detalles: visita.detalles.map((detalle) => ({
        id_tipo_trabajo: Number(detalle.id_tipo_trabajo),
        observacion: detalle.observacion.trim(),
        importe: detalle.importe.trim().replace(",", "."),
        estado_pago: detalle.estado_pago,
      })),
    };

    try {
      setGuardando(true);

      const resultado = await crearVisita(datos);

      setMensaje(
        resultado.mensaje || "Visita registrada correctamente."
      );

      setVisita({
        ubicacion: "GOMERIA",
        patente: "",
        tipo_vehiculo: "AUTO",
        observaciones: "",
        nombre_cliente_contacto: "",
        whatsapp_contacto: "",
        detalles: [nuevoTrabajo()],
      });
    } catch (err) {
      setError(err.message || "No se pudo registrar la visita.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="nueva-visita">
      <div className="nueva-visita-encabezado">
        <div>
          <h1>Nueva visita</h1>
          <p>Registrar un vehículo y los trabajos realizados.</p>
        </div>
      </div>

      {error && (
        <div className="visita-alerta visita-error">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="visita-alerta visita-exito">
          {mensaje}
        </div>
      )}

      <form onSubmit={guardarVisita}>
        <section className="visita-seccion">
          <h2>Datos del vehículo</h2>

          <div className="visita-grid">
            <div className="visita-campo">
              <label>Ubicación del trabajo *</label>
              <select
                value={visita.ubicacion}
                onChange={(e) =>
                  actualizarCampo("ubicacion", e.target.value)
                }
                required
              >
                <option value="GOMERIA">Gomería</option>
                <option value="MOVIL">Móvil</option>
              </select>
            </div>

            <div className="visita-campo">
              <label>Tipo de vehículo *</label>
              <select
                value={visita.tipo_vehiculo}
                onChange={(e) =>
                  actualizarCampo("tipo_vehiculo", e.target.value)
                }
                required
              >
                {VEHICULOS.map((vehiculo) => (
                  <option
                    key={vehiculo.value}
                    value={vehiculo.value}
                  >
                    {vehiculo.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="visita-campo">
              <label>Patente</label>
              <input
                type="text"
                maxLength={15}
                value={visita.patente}
                onChange={(e) =>
                  actualizarCampo(
                    "patente",
                    e.target.value.toUpperCase()
                  )
                }
                placeholder="Ej.: AB123CD"
              />
            </div>
          </div>
        </section>

        <section className="visita-seccion">
          <h2>Datos de contacto</h2>

          <div className="visita-grid">
            <div className="visita-campo">
              <label>Nombre del cliente</label>
              <input
                type="text"
                maxLength={100}
                value={visita.nombre_cliente_contacto}
                onChange={(e) =>
                  actualizarCampo(
                    "nombre_cliente_contacto",
                    e.target.value
                  )
                }
                placeholder="Nombre del cliente"
              />
            </div>

            <div className="visita-campo">
              <label>WhatsApp</label>
              <input
                type="tel"
                maxLength={30}
                value={visita.whatsapp_contacto}
                onChange={(e) =>
                  actualizarCampo(
                    "whatsapp_contacto",
                    e.target.value
                  )
                }
                placeholder="Número de contacto"
              />
            </div>
          </div>
        </section>

        <section className="visita-seccion">
          <div className="visita-seccion-titulo">
            <div>
              <h2>Trabajos realizados</h2>
              <p>Podés agregar varios trabajos al mismo vehículo.</p>
            </div>

            <button
              type="button"
              className="visita-boton-secundario"
              onClick={agregarTrabajo}
              disabled={visita.detalles.length >= 30}
            >
              + Agregar trabajo
            </button>
          </div>

          {cargandoTipos ? (
            <p>Cargando tipos de trabajo...</p>
          ) : tiposTrabajo.length === 0 ? (
            <p>No hay tipos de trabajo disponibles.</p>
          ) : (
            visita.detalles.map((detalle, indice) => (
              <div className="visita-trabajo" key={indice}>
                <div className="visita-trabajo-titulo">
                  <h3>Trabajo {indice + 1}</h3>

                  {visita.detalles.length > 1 && (
                    <button
                      type="button"
                      className="visita-boton-eliminar"
                      onClick={() => quitarTrabajo(indice)}
                    >
                      Quitar
                    </button>
                  )}
                </div>

                <div className="visita-grid">
                  <div className="visita-campo">
                    <label>Tipo de trabajo *</label>
                    <select
                      value={detalle.id_tipo_trabajo}
                      onChange={(e) =>
                        actualizarTrabajo(
                          indice,
                          "id_tipo_trabajo",
                          e.target.value
                        )
                      }
                      required
                    >
                      <option value="">Seleccionar trabajo</option>

                      {tiposTrabajo.map((tipo) => (
                        <option key={tipo.id} value={tipo.id}>
                          {tipo.descripcion}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="visita-campo">
                    <label>Importe *</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={detalle.importe}
                      onChange={(e) =>
                        actualizarTrabajo(
                          indice,
                          "importe",
                          e.target.value
                        )
                      }
                      placeholder="Ej.: 15000,00"
                      required
                    />
                  </div>

                  <div className="visita-campo">
                    <label>Estado de pago *</label>
                    <select
                      value={detalle.estado_pago}
                      onChange={(e) =>
                        actualizarTrabajo(
                          indice,
                          "estado_pago",
                          e.target.value
                        )
                      }
                    >
                      <option value="PENDIENTE">Pendiente</option>
                      <option value="PAGADO">Pagado</option>
                    </select>
                  </div>

                  <div className="visita-campo">
                    <label>Observación del trabajo</label>
                    <input
                      type="text"
                      maxLength={1000}
                      value={detalle.observacion}
                      onChange={(e) =>
                        actualizarTrabajo(
                          indice,
                          "observacion",
                          e.target.value
                        )
                      }
                      placeholder="Detalle adicional"
                    />
                  </div>
                </div>
              </div>
            ))
          )}

          <div className="visita-total">
            <span>Total de la visita</span>
            <strong>
              {total.toLocaleString("es-AR", {
                style: "currency",
                currency: "ARS",
              })}
            </strong>
          </div>
        </section>

        <section className="visita-seccion">
          <div className="visita-campo">
            <label>Observaciones generales</label>
            <textarea
              rows={3}
              maxLength={2000}
              value={visita.observaciones}
              onChange={(e) =>
                actualizarCampo("observaciones", e.target.value)
              }
              placeholder="Observaciones generales de la visita..."
            />
          </div>
        </section>

        <div className="visita-acciones">
          <button
            type="submit"
            className="visita-boton-guardar"
            disabled={guardando || cargandoTipos || tiposTrabajo.length === 0}
          >
            {guardando ? "Registrando..." : "Registrar visita"}
          </button>
        </div>
      </form>
    </div>
  );
}
