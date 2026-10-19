const { Router } = require('express');
const tarefaController = require('../controllers/tarefas.controller');
const autenticar = require('../middlewares/autenticar');
const validar = require('../middlewares/validar.middleware');
const schemas = require('../schemas/schemas');

const router = Router();
const idValido = validar(schemas.id, 'params');

router.get('/', validar(schemas.filtroTarefas, 'query'), autenticar, tarefaController.listar);
router.get('/:id', idValido, autenticar, tarefaController.buscarPorId);
router.post('/:id/avancar', idValido, autenticar, tarefaController.avancar);
router.post('/', autenticar, validar(schemas.tarefa), tarefaController.criar);
router.put('/:id', idValido, autenticar, validar(schemas.atualizacaoTarefa), tarefaController.atualizar);
router.delete('/:id', idValido, autenticar, tarefaController.deletar);

module.exports = router;