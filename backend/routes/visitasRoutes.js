
const express = require("express");

const {
  verificarToken,
  permitirRoles
} = require("../middleware/authMiddleware");

const {
  obtenerTiposTrabajo,
  crearVisita,
  listarVisitas,
  obtenerResumenDashboard
} = require("../controllers/visitasController");

const router = express.Router();

const todosLosRoles = [
  "DUENA",
  "OPERADOR_LOCAL",
  "OPERADOR_MOVIL"
];

// Todas las rutas requieren autenticación.
router.use(verificarToken);

// Catálogo de trabajos.
router.get(
  "/tipos-trabajo",
  permitirRoles(...todosLosRoles),
  obtenerTiposTrabajo
);

// Dashboard exclusivo de la dueña.
router.get(
  "/dashboard/resumen",
  permitirRoles("DUENA"),
  obtenerResumenDashboard
);

// Registrar visita.
router.post(
  "/",
  permitirRoles(...todosLosRoles),
  crearVisita
);

// Consultar visitas.
// El servicio limita automáticamente las consultas
// de los operadores a sus propias visitas.
router.get(
  "/",
  permitirRoles(...todosLosRoles),
  listarVisitas
);

module.exports = router;
