
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../db");

const ROLES_VALIDOS = [
  "DUENA",
  "OPERADOR_LOCAL",
  "OPERADOR_MOVIL"
];

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

// CREAR PRIMERA DUENA
async function bootstrap(req, res) {
  const { nombre, usuario, password } = req.body;
  const tokenInicial = req.headers["x-bootstrap-token"];

  if (!process.env.BOOTSTRAP_TOKEN) {
    return res.status(500).json({
      ok: false,
      mensaje: "Falta configurar BOOTSTRAP_TOKEN"
    });
  }

  if (!compararSecretos(
    tokenInicial,
    process.env.BOOTSTRAP_TOKEN
  )) {
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
    password.length < 10 ||
    password.length > 72
  ) {
    return res.status(400).json({
      ok: false,
      mensaje: "Datos inválidos. La contraseña debe tener entre 10 y 72 caracteres."
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Evita altas iniciales simultáneas.
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
       VALUES ($1, $2, $3, 'DUENA', TRUE)
       RETURNING id, nombre, usuario, rol, activo`,
      [nombreLimpio, usuarioLimpio, passwordHash]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      ok: true,
      mensaje: "Usuario dueña creado correctamente",
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

// INICIAR SESION
async function login(req, res) {
  const { usuario, password } = req.body;

  if (
    typeof usuario !== "string" ||
    typeof password !== "string" ||
    usuario.trim() === "" ||
    password.length === 0 ||
    password.length > 72
  ) {
    return res.status(400).json({
      ok: false,
      mensaje: "Usuario y contraseña son obligatorios"
    });
  }

  try {
    const resultado = await pool.query(
      `SELECT id, nombre, usuario, password_hash, rol, activo
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
        usuario: usuarioEncontrado.usuario
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
        rol: usuarioEncontrado.rol
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

module.exports = {
  bootstrap,
  login
};
