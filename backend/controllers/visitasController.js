
const visitasService = require("../services/visitasService");

const ROLES_VALIDOS = [
  "ADMINISTRADOR",
  "OPERADOR"
];

const TIPOS_VEHICULO = [
  "AUTO",
  "CAMIONETA",
  "CAMION",
  "MOTO",
  "OTRO"
];

const UBICACIONES_VALIDAS = [
  "GOMERIA",
  "MOVIL"
];

const ESTADOS_PAGO = [
  "PAGADO",
  "PENDIENTE"
];

function textoOpcional(valor, maximo) {
  if (valor === undefined || valor === null) {
    return null;
  }

  if (typeof valor !== "string") {
    return undefined;
  }

  const limpio = valor.trim();

  if (limpio.length === 0) {
    return null;
  }

  if (limpio.length > maximo) {
    return undefined;
  }

  return limpio;
}

function idValido(valor) {
  try {
    return (
      (typeof valor === "number" || typeof valor === "string") &&
      /^\d+$/.test(String(valor)) &&
      BigInt(valor) > 0n
    );
  } catch {
    return false;
  }
}

function validarImporte(valor) {
  if (typeof valor === "number") {
    return Number.isFinite(valor) &&
      valor >= 0 &&
      valor <= 999999999999;
  }

  return (
    typeof valor === "string" &&
    /^\d{1,12}(\.\d{1,2})?$/.test(valor)
  );
}

// =====================================================
// TIPOS DE TRABAJO
// =====================================================

async function obtenerTiposTrabajo(req, res) {
  try {
    const tipos = await visitasService.obtenerTiposTrabajo();

    return res.json({
      ok: true,
      tipos
    });

  } catch (error) {
    console.error("Error al obtener tipos de trabajo:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudieron obtener los tipos de trabajo"
    });
  }
}

// =====================================================
// REGISTRAR VISITA
// =====================================================

async function crearVisita(req, res) {
  try {
    const usuario = req.usuario;

    if (!usuario || !ROLES_VALIDOS.includes(usuario.rol)) {
      return res.status(403).json({
        ok: false,
        mensaje: "Rol no autorizado"
      });
    }

    const {
      ubicacion,
      patente,
      tipo_vehiculo,
      observaciones,
      id_cliente,
      nombre_cliente_contacto,
      whatsapp_contacto,
      detalles
    } = req.body;

    if (!TIPOS_VEHICULO.includes(tipo_vehiculo)) {
      return res.status(400).json({
        ok: false,
        mensaje: "Tipo de vehículo inválido"
      });
    }

    // Ambos roles pueden elegir dónde se realizó el trabajo.
    if (!UBICACIONES_VALIDAS.includes(ubicacion)) {
      return res.status(400).json({
        ok: false,
        mensaje: "Debe seleccionar GOMERIA o MOVIL"
      });
    }

    const ubicacionFinal = ubicacion;

    if (
      !Array.isArray(detalles) ||
      detalles.length === 0 ||
      detalles.length > 30
    ) {
      return res.status(400).json({
        ok: false,
        mensaje: "La visita debe contener entre 1 y 30 trabajos"
      });
    }

    const patenteLimpia = textoOpcional(patente, 15);
    const observacionesLimpias = textoOpcional(observaciones, 2000);
    const nombreLimpio = textoOpcional(nombre_cliente_contacto, 100);
    const whatsappLimpio = textoOpcional(whatsapp_contacto, 30);

    if (
      patenteLimpia === undefined ||
      observacionesLimpias === undefined ||
      nombreLimpio === undefined ||
      whatsappLimpio === undefined
    ) {
      return res.status(400).json({
        ok: false,
        mensaje: "Hay campos de texto inválidos o demasiado extensos"
      });
    }

    if (
      id_cliente !== undefined &&
      id_cliente !== null &&
      id_cliente !== "" &&
      !idValido(id_cliente)
    ) {
      return res.status(400).json({
        ok: false,
        mensaje: "El cliente indicado no es válido"
      });
    }

    const detallesLimpios = [];

    for (const detalle of detalles) {
      if (
        !detalle ||
        typeof detalle !== "object" ||
        !idValido(detalle.id_tipo_trabajo)
      ) {
        return res.status(400).json({
          ok: false,
          mensaje: "Hay un tipo de trabajo inválido"
        });
      }

      if (!validarImporte(detalle.importe)) {
        return res.status(400).json({
          ok: false,
          mensaje: "Cada trabajo debe tener un importe válido"
        });
      }

      const estadoPago = detalle.estado_pago || "PENDIENTE";

      if (!ESTADOS_PAGO.includes(estadoPago)) {
        return res.status(400).json({
          ok: false,
          mensaje: "Estado de pago inválido"
        });
      }

      const observacionDetalle = textoOpcional(
        detalle.observacion,
        1000
      );

      if (observacionDetalle === undefined) {
        return res.status(400).json({
          ok: false,
          mensaje: "La observación de un trabajo es demasiado extensa"
        });
      }

      detallesLimpios.push({
        id_tipo_trabajo: String(detalle.id_tipo_trabajo),
        observacion: observacionDetalle,
        importe: String(detalle.importe),
        estado_pago: estadoPago
      });
    }

    const datos = {
      ubicacion: ubicacionFinal,
      patente: patenteLimpia,
      tipo_vehiculo,
      observaciones: observacionesLimpias,
      id_usuario: usuario.id,
      id_cliente: id_cliente ? String(id_cliente) : null,
      nombre_cliente_contacto: nombreLimpio,
      whatsapp_contacto: whatsappLimpio,
      detalles: detallesLimpios
    };

    const visita = await visitasService.crearVisita(datos);

    return res.status(201).json({
      ok: true,
      mensaje: "Visita registrada correctamente",
      visita
    });

  } catch (error) {
    console.error("Error al registrar visita:", error.message);

    if (error.status) {
      return res.status(error.status).json({
        ok: false,
        mensaje: error.message
      });
    }

    if (error.code === "23503") {
      return res.status(400).json({
        ok: false,
        mensaje: "El cliente o alguno de los datos relacionados no existe"
      });
    }

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo registrar la visita"
    });
  }
}

// =====================================================
// LISTAR VISITAS
// =====================================================

async function listarVisitas(req, res) {
  try {
    const ubicacion = req.query.ubicacion || null;

    if (
      ubicacion !== null &&
      !UBICACIONES_VALIDAS.includes(ubicacion)
    ) {
      return res.status(400).json({
        ok: false,
        mensaje: "Filtro de ubicación inválido"
      });
    }

    const limiteSolicitado = Number.parseInt(req.query.limite, 10);
    const offsetSolicitado = Number.parseInt(req.query.offset, 10);

    const limite = Number.isInteger(limiteSolicitado)
      ? Math.min(Math.max(limiteSolicitado, 1), 100)
      : 50;

    const offset = Number.isInteger(offsetSolicitado)
      ? Math.max(offsetSolicitado, 0)
      : 0;

    const visitas = await visitasService.listarVisitas(
      req.usuario,
      {
        ubicacion,
        limite,
        offset
      }
    );

    return res.json({
      ok: true,
      visitas
    });

  } catch (error) {
    console.error("Error al listar visitas:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudieron obtener las visitas"
    });
  }
}

// =====================================================
// DASHBOARD
// =====================================================

async function obtenerResumenDashboard(req, res) {
  try {
    const fecha = req.query.fecha || null;

    if (
      fecha !== null &&
      (
        typeof fecha !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
        Number.isNaN(Date.parse(`${fecha}T00:00:00Z`)) ||
        new Date(`${fecha}T00:00:00Z`).toISOString().slice(0, 10) !== fecha
      )
    ) {
      return res.status(400).json({
        ok: false,
        mensaje: "La fecha debe tener formato YYYY-MM-DD y ser válida"
      });
    }

    const datos = await visitasService.obtenerResumenDashboard(fecha);

    return res.json({
      ok: true,
      fecha: fecha || null,
      ...datos
    });

  } catch (error) {
    console.error("Error en dashboard:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo obtener el resumen del dashboard"
    });
  }
}

module.exports = {
  obtenerTiposTrabajo,
  crearVisita,
  listarVisitas,
  obtenerResumenDashboard
};
