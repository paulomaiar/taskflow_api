const { Router } = require('express');
const prioridadesController = require('../controllers/prioridades.controller');
const autenticar = require('../middlewares/autenticar');

const router = Router();

router.get('/', autenticar, prioridadesController.listar);

module.exports = router;
