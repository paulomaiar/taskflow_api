const { Router } = require('express');
const usuarioController = require('../controllers/usuarios.controller');
const validar = require('../middlewares/validar.middleware');
const schemas = require('../schemas/schemas');
const autenticar = require('../middlewares/autenticar');

const router = Router();
const idValido = validar(schemas.id, 'params');

router.get('/', autenticar, usuarioController.listar);
router.get('/:id', idValido, usuarioController.buscarPorId);
router.post('/', validar(schemas.usuario), usuarioController.criar);
router.put('/:id', idValido, validar(schemas.atualizacaoUsuario), usuarioController.atualizar);
router.delete('/:id', idValido, usuarioController.deletar);

module.exports = router;