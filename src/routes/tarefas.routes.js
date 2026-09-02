const { Router } = require('express');
const tarefaController = require('../controllers/tarefas.controller');

const router = Router();

router.get('/', tarefaController.listar);
router.get('/:id', tarefaController.buscarPorId);
router.post('/', tarefaController.criar);
router.put('/:id', tarefaController.atualizar);
router.delete('/:id', tarefaController.deletar);

module.exports = router;