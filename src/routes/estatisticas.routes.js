const { Router } = require('express');
const estatisticasController = require('../controllers/estatisticas.controller');

const router = Router();

router.get('/', estatisticasController.obterGeral);
router.get('/resumo', estatisticasController.obterResumo);

module.exports = router;
