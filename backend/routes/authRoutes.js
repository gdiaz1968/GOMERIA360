
const express = require("express");

const {
  bootstrap,
  login,
  crearOperador,
  cambiarPassword
} = require("../controllers/authController");

const {
  verificarToken,
  permitirRoles
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/bootstrap", bootstrap);

router.post("/login", login);

// Cambio obligatorio de contraseña.
router.patch(
  "/cambiar-password",
  verificarToken,
  cambiarPassword
);

router.get("/me", verificarToken, (req, res) => {
  res.json({
    ok: true,
    usuario: req.usuario
  });
});

// Crear operadores: exclusivamente administrador.
router.post(
  "/usuarios",
  verificarToken,
  permitirRoles("ADMINISTRADOR"),
  crearOperador
);

module.exports = router;
