
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const fs = require("fs");

const pool = require("./db");
const authRoutes = require("./routes/authRoutes");
const visitasRoutes = require("./routes/visitasRoutes");

const app = express();
const PORT = process.env.PORT || 3032;

// Directorio del frontend compilado por Vite
const frontendPath = path.join(__dirname, "../frontend/dist");

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "100kb" }));

// RUTAS DE AUTENTICACION
app.use("/api/auth", authRoutes);

// RUTAS DE VISITAS Y TRABAJOS
app.use("/api/visitas", visitasRoutes);

// VERIFICACION DEL BACKEND Y BASE DE DATOS
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

// SERVIR FRONTEND REACT
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  console.log("Frontend React encontrado:", frontendPath);
} else {
  console.warn("ADVERTENCIA: No se encontro frontend/dist");
}

// RUTAS API NO ENCONTRADAS
app.use("/api", (req, res) => {
  res.status(404).json({
    ok: false,
    mensaje: "Ruta API no encontrada"
  });
});

// FALLBACK PARA REACT
app.use((req, res, next) => {
  if (req.method !== "GET" || !req.accepts("html")) {
    return next();
  }

  const indexPath = path.join(frontendPath, "index.html");

  if (!fs.existsSync(indexPath)) {
    return res.status(404).send(
      "Frontend no compilado. Ejecutar npm run build."
    );
  }

  res.sendFile(indexPath);
});

// ERROR 404 GENERAL
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    mensaje: "Ruta no encontrada"
  });
});

app.listen(PORT, () => {
  console.log(`GOMERIA360 ejecutandose en puerto ${PORT}`);
});
