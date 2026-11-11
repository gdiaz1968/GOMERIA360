
const API_URL = import.meta.env.VITE_API_URL || "";

export async function iniciarSesion(usuario, password) {
  const respuesta = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ usuario, password }),
  });

  const datos = await respuesta.json();

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No se pudo iniciar sesión");
  }

  if (!datos.token || !datos.usuario) {
    throw new Error("El servidor no devolvió los datos de sesión esperados");
  }

  localStorage.setItem("gomeria360_token", datos.token);
  localStorage.setItem("gomeria360_usuario", JSON.stringify(datos.usuario));

  return datos.usuario;
}

export function cerrarSesion() {
  localStorage.removeItem("gomeria360_token");
  localStorage.removeItem("gomeria360_usuario");
}

export function obtenerUsuario() {
  const usuario = localStorage.getItem("gomeria360_usuario");

  return usuario ? JSON.parse(usuario) : null;
}
