
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

const TODOS_LOS_ROLES = [
  "ADMINISTRADOR",
  "OPERADOR"
];

// =====================================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// =====================================================

router.use(verificarToken);

// =====================================================
// CATÁLOGO DE TRABAJOS
// ADMINISTRADOR Y OPERADOR
// =====================================================

router.get(
  "/tipos-trabajo",
  permitirRoles(...TODOS_LOS_ROLES),
  obtenerTiposTrabajo
);

// =====================================================
// DASHBOARD
// EXCLUSIVO ADMINISTRADOR
// =====================================================

router.get(
  "/dashboard/resumen",
  permitirRoles("ADMINISTRADOR"),
  obtenerResumenDashboard
);

// =====================================================
// REGISTRAR VISITA
// ADMINISTRADOR Y OPERADOR
// =====================================================

router.post(
  "/",
  permitirRoles(...TODOS_LOS_ROLES),
  crearVisita
);

// =====================================================
// CONSULTAR VISITAS
// El servicio determina qué registros puede consultar
// cada usuario.
// =====================================================

router.get(
  "/",
  permitirRoles(...TODOS_LOS_ROLES),
  listarVisitas
);

module.exports = router;
