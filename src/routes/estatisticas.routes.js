const { Router } = require('express');
const estatisticasController = require('../controllers/estatisticas.controller');
const autenticar = require('../middlewares/autenticar');

const router = Router();

router.use(autenticar);
router.get('/', estatisticasController.obterGeral);
router.get('/resumo', estatisticasController.obterResumo);

module.exports = router;
