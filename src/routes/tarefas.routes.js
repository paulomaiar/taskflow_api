const { Router } = require('express');
const tarefaController = require('../controllers/tarefas.controller');
const autenticar = require('../middlewares/autenticar');

const router = Router();

router.get('/', tarefaController.listar);
router.get('/:id', tarefaController.buscarPorId);
router.post('/', autenticar, tarefaController.criar);
router.put('/:id', autenticar, tarefaController.atualizar);
router.delete('/:id', autenticar, tarefaController.deletar);

module.exports = router;