
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../db");

const ROLES_VALIDOS = [
  "ADMINISTRADOR",
  "OPERADOR"
];

const PASSWORD_MIN = 10;
const PASSWORD_MAX = 72;

function compararSecretos(a, b) {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }

  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufferA, bufferB);
}

// =====================================================
// CREAR PRIMER ADMINISTRADOR
// =====================================================

async function bootstrap(req, res) {
  const { nombre, usuario, password } = req.body;
  const tokenInicial = req.headers["x-bootstrap-token"];

  if (!process.env.BOOTSTRAP_TOKEN) {
    return res.status(500).json({
      ok: false,
      mensaje: "Falta configurar BOOTSTRAP_TOKEN"
    });
  }

  if (!compararSecretos(tokenInicial, process.env.BOOTSTRAP_TOKEN)) {
    return res.status(403).json({
      ok: false,
      mensaje: "Autorización inválida"
    });
  }

  if (
    typeof nombre !== "string" ||
    typeof usuario !== "string" ||
    typeof password !== "string"
  ) {
    return res.status(400).json({
      ok: false,
      mensaje: "Datos incompletos"
    });
  }

  const nombreLimpio = nombre.trim();
  const usuarioLimpio = usuario.trim();

  if (
    nombreLimpio.length < 2 ||
    nombreLimpio.length > 100 ||
    usuarioLimpio.length < 3 ||
    usuarioLimpio.length > 50 ||
    !/^[a-zA-Z0-9._-]+$/.test(usuarioLimpio) ||
    password.length < PASSWORD_MIN ||
    password.length > PASSWORD_MAX
  ) {
    return res.status(400).json({
      ok: false,
      mensaje: "Datos inválidos. La contraseña debe tener entre 10 y 72 caracteres."
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      "SELECT pg_advisory_xact_lock($1)",
      [36001111]
    );

    const existentes = await client.query(
      "SELECT COUNT(*)::int AS cantidad FROM usuarios"
    );

    if (existentes.rows[0].cantidad > 0) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        ok: false,
        mensaje: "El alta inicial ya fue realizada"
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const resultado = await client.query(
      `INSERT INTO usuarios
        (nombre, usuario, password_hash, rol, activo)
       VALUES ($1, $2, $3, 'ADMINISTRADOR', TRUE)
       RETURNING id, nombre, usuario, rol, activo`,
      [nombreLimpio, usuarioLimpio, passwordHash]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      ok: true,
      mensaje: "Usuario ADMINISTRADOR creado correctamente",
      usuario: resultado.rows[0]
    });

  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Error en alta inicial:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo crear el usuario inicial"
    });

  } finally {
    client.release();
  }
}

// =====================================================
// INICIAR SESIÓN
// =====================================================

async function login(req, res) {
  const { usuario, password } = req.body;

  if (
    typeof usuario !== "string" ||
    typeof password !== "string" ||
    usuario.trim() === "" ||
    password.length === 0 ||
    password.length > PASSWORD_MAX
  ) {
    return res.status(400).json({
      ok: false,
      mensaje: "Usuario y contraseña son obligatorios"
    });
  }

  try {
    const resultado = await pool.query(
      `SELECT id, nombre, usuario, password_hash, rol, activo,
              debe_cambiar_password
       FROM usuarios
       WHERE LOWER(usuario) = LOWER($1)
       LIMIT 1`,
      [usuario.trim()]
    );

    const usuarioEncontrado = resultado.rows[0];

    if (!usuarioEncontrado || !usuarioEncontrado.activo) {
      return res.status(401).json({
        ok: false,
        mensaje: "Usuario o contraseña incorrectos"
      });
    }

    const passwordCorrecta = await bcrypt.compare(
      password,
      usuarioEncontrado.password_hash
    );

    if (!passwordCorrecta) {
      return res.status(401).json({
        ok: false,
        mensaje: "Usuario o contraseña incorrectos"
      });
    }

    if (!ROLES_VALIDOS.includes(usuarioEncontrado.rol)) {
      return res.status(403).json({
        ok: false,
        mensaje: "El usuario tiene un rol no válido"
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("Falta configurar JWT_SECRET");
    }

    const token = jwt.sign(
      {
        rol: usuarioEncontrado.rol,
        usuario: usuarioEncontrado.usuario,
        debe_cambiar_password: usuarioEncontrado.debe_cambiar_password
      },
      process.env.JWT_SECRET,
      {
        subject: String(usuarioEncontrado.id),
        expiresIn: "8h"
      }
    );

    return res.json({
      ok: true,
      mensaje: "Inicio de sesión correcto",
      token,
      usuario: {
        id: usuarioEncontrado.id,
        nombre: usuarioEncontrado.nombre,
        usuario: usuarioEncontrado.usuario,
        rol: usuarioEncontrado.rol,
        debe_cambiar_password: usuarioEncontrado.debe_cambiar_password
      }
    });

  } catch (error) {
    console.error("Error en login:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "Error al iniciar sesión"
    });
  }
}

// =====================================================
// CREAR OPERADOR
// =====================================================

async function crearOperador(req, res) {
  const { nombre, usuario, password } = req.body;

  if (
    typeof nombre !== "string" ||
    typeof usuario !== "string" ||
    typeof password !== "string"
  ) {
    return res.status(400).json({
      ok: false,
      mensaje: "Todos los campos son obligatorios"
    });
  }

  const nombreLimpio = nombre.trim();
  const usuarioLimpio = usuario.trim().toLowerCase();

  if (
    nombreLimpio.length < 2 ||
    nombreLimpio.length > 100 ||
    usuarioLimpio.length < 3 ||
    usuarioLimpio.length > 50 ||
    !/^[a-zA-Z0-9._-]+$/.test(usuarioLimpio) ||
    password.length < PASSWORD_MIN ||
    password.length > PASSWORD_MAX
  ) {
    return res.status(400).json({
      ok: false,
      mensaje: "Datos inválidos. La contraseña debe tener entre 10 y 72 caracteres."
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const resultado = await pool.query(
      `INSERT INTO usuarios
        (nombre, usuario, password_hash, rol, activo,
         debe_cambiar_password)
       VALUES ($1, $2, $3, 'OPERADOR', TRUE, TRUE)
       RETURNING id, nombre, usuario, rol, activo,
                 debe_cambiar_password`,
      [nombreLimpio, usuarioLimpio, passwordHash]
    );

    return res.status(201).json({
      ok: true,
      mensaje: "Operador creado correctamente",
      usuario: resultado.rows[0]
    });

  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        ok: false,
        mensaje: "El nombre de usuario ya existe"
      });
    }

    console.error("Error al crear operador:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo crear el operador"
    });
  }
}

// =====================================================
// CAMBIAR CONTRASEÑA
// =====================================================

async function cambiarPassword(req, res) {
  const { passwordActual, passwordNueva } = req.body;

  if (
    typeof passwordActual !== "string" ||
    typeof passwordNueva !== "string"
  ) {
    return res.status(400).json({
      ok: false,
      mensaje: "Debés ingresar la contraseña actual y la nueva"
    });
  }

  if (
    passwordActual.length === 0 ||
    passwordActual.length > PASSWORD_MAX ||
    passwordNueva.length < PASSWORD_MIN ||
    passwordNueva.length > PASSWORD_MAX
  ) {
    return res.status(400).json({
      ok: false,
      mensaje: "La nueva contraseña debe tener entre 10 y 72 caracteres"
    });
  }

  try {
    const resultado = await pool.query(
      `SELECT password_hash
       FROM usuarios
       WHERE id = $1 AND activo = TRUE`,
      [req.usuario.id]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({
        ok: false,
        mensaje: "Usuario inexistente o inactivo"
      });
    }

    const passwordCorrecta = await bcrypt.compare(
      passwordActual,
      resultado.rows[0].password_hash
    );

    if (!passwordCorrecta) {
      return res.status(400).json({
        ok: false,
        mensaje: "La contraseña actual es incorrecta"
      });
    }

    if (passwordActual === passwordNueva) {
      return res.status(400).json({
        ok: false,
        mensaje: "La nueva contraseña debe ser diferente de la actual"
      });
    }

    const passwordHash = await bcrypt.hash(passwordNueva, 12);

    const actualizacion = await pool.query(
      `UPDATE usuarios
       SET password_hash = $1,
           debe_cambiar_password = FALSE
       WHERE id = $2 AND activo = TRUE
       RETURNING id, nombre, usuario, rol, debe_cambiar_password`,
      [passwordHash, req.usuario.id]
    );

    if (actualizacion.rows.length === 0) {
      return res.status(401).json({
        ok: false,
        mensaje: "No se pudo actualizar la contraseña"
      });
    }

    return res.json({
      ok: true,
      mensaje: "Contraseña cambiada correctamente",
      usuario: actualizacion.rows[0]
    });

  } catch (error) {
    console.error("Error al cambiar contraseña:", error.message);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo cambiar la contraseña"
    });
  }
}

module.exports = {
  bootstrap,
  login,
  crearOperador,
  cambiarPassword
};
