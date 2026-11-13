
const jwt = require("jsonwebtoken");
const pool = require("../db");

async function verificarToken(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      ok: false,
      mensaje: "No autorizado. Falta el token."
    });
  }

  const token = authorization.substring(7);

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const resultado = await pool.query(
      `SELECT id, nombre, usuario, rol, activo,
              debe_cambiar_password
       FROM usuarios
       WHERE id = $1`,
      [decoded.sub]
    );

    const usuario = resultado.rows[0];

    if (!usuario || !usuario.activo) {
      return res.status(401).json({
        ok: false,
        mensaje: "Usuario inexistente o inactivo"
      });
    }

    req.usuario = {
      id: Number(usuario.id),
      nombre: usuario.nombre,
      usuario: usuario.usuario,
      rol: usuario.rol,
      debe_cambiar_password: usuario.debe_cambiar_password
    };

    // Permitir únicamente el cambio de contraseña
    // mientras el usuario tenga el cambio pendiente.
    if (
      usuario.debe_cambiar_password &&
      req.path !== "/cambiar-password"
    ) {
      return res.status(403).json({
        ok: false,
        codigo: "CAMBIO_PASSWORD_OBLIGATORIO",
        mensaje: "Debés cambiar tu contraseña antes de continuar"
      });
    }

    next();

  } catch (error) {
    console.error("Error verificando token:", error.message);

    return res.status(401).json({
      ok: false,
      mensaje: "Token inválido o error de autenticación"
    });
  }
}

function permitirRoles(...roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return res.status(403).json({
        ok: false,
        mensaje: "No tenés permisos para realizar esta operación"
      });
    }

    next();
  };
}

module.exports = {
  verificarToken,
  permitirRoles
};
