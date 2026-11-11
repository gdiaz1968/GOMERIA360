
const jwt = require("jsonwebtoken");

function verificarToken(req, res, next) {
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

    req.usuario = {
      id: Number(decoded.sub),
      rol: decoded.rol,
      usuario: decoded.usuario
    };

    next();

  } catch (error) {
    return res.status(401).json({
      ok: false,
      mensaje: "Token inválido o vencido"
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
