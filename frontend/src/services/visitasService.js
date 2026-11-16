
const API_URL = import.meta.env.VITE_API_URL || "";

// =====================================================
// FUNCIÓN CENTRAL PARA PETICIONES AUTENTICADAS
// =====================================================

async function peticionVisitas(endpoint, opciones = {}) {
  const token = localStorage.getItem("gomeria360_token");

  if (!token) {
    throw new Error("No hay una sesión activa. Iniciá sesión nuevamente.");
  }

  const respuesta = await fetch(`${API_URL}/api/visitas${endpoint}`, {
    ...opciones,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...opciones.headers,
    },
  });

  const datos = await respuesta.json();

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "Error al comunicarse con el servidor");
  }

  return datos;
}

// =====================================================
// OBTENER TIPOS DE TRABAJO
// =====================================================

export async function obtenerTiposTrabajo() {
  const datos = await peticionVisitas("/tipos-trabajo");

  return datos.tipos;
}

// =====================================================
// REGISTRAR NUEVA VISITA
// =====================================================

export async function crearVisita(visita) {
  return await peticionVisitas("", {
    method: "POST",
    body: JSON.stringify(visita),
  });
}

// =====================================================
// LISTAR VISITAS
// =====================================================

export async function listarVisitas(filtros = {}) {
  const parametros = new URLSearchParams();

  if (filtros.ubicacion) {
    parametros.set("ubicacion", filtros.ubicacion);
  }

 if (filtros.limite) {
  parametros.set("limite", filtros.limite);
}

  if (filtros.offset !== undefined) {
    parametros.set("offset", filtros.offset);
  }

  const query = parametros.toString();

  const datos = await peticionVisitas(
    query ? `?${query}` : ""
  );

  return datos.visitas;
}
