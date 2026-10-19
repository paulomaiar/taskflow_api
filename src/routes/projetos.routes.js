const { Router } = require('express');
const projetosController = require('../controllers/projetos.controller');
const autenticar = require('../middlewares/autenticar');
const validar = require('../middlewares/validar.middleware');
const schemas = require('../schemas/schemas');

const router = Router();
const idValido = validar(schemas.id, 'params');

router.get('/', autenticar, projetosController.listar);
router.post('/', autenticar, validar(schemas.projeto), projetosController.criar);
router.get('/:id', idValido, autenticar, projetosController.buscarPorId);
router.put('/:id', idValido, autenticar, validar(schemas.atualizacaoProjeto), projetosController.atualizar);
router.delete('/:id', idValido, autenticar, projetosController.remover);

module.exports = router;