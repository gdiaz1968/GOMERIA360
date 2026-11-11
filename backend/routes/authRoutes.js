
const express = require("express");

const {
  bootstrap,
  login
} = require("../controllers/authController");

const {
  verificarToken
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/bootstrap", bootstrap);

router.post("/login", login);

router.get("/me", verificarToken, (req, res) => {
  res.json({
    ok: true,
    usuario: req.usuario
  });
});

module.exports = router;
