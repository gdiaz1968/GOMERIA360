
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const pool = require("./db");

const authRoutes = require("./routes/authRoutes");

const app = express();
const PORT = process.env.PORT || 3032;

app.use(helmet());

app.use(cors());

app.use(express.json({ limit: "100kb" }));

// Rutas de autenticacion
app.use("/api/auth", authRoutes);

// Verificacion de servidor y PostgreSQL
app.get("/api/health", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        current_database() AS base_datos,
        current_user AS usuario,
        NOW() AS fecha_servidor
    `);

    res.json({
      ok: true,
      mensaje: "Backend conectado correctamente a PostgreSQL",
      baseDatos: resultado.rows[0].base_datos,
      usuario: resultado.rows[0].usuario,
      fechaServidor: resultado.rows[0].fecha_servidor
    });

  } catch (error) {
    console.error("Error de conexion:", error.message);

    res.status(500).json({
      ok: false,
      mensaje: "No se pudo conectar con PostgreSQL"
    });
  }
});

// Manejo de rutas inexistentes
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    mensaje: "Ruta no encontrada"
  });
});

app.listen(PORT, () => {
  console.log(`GOMERIA360 API ejecutandose en puerto ${PORT}`);
});
