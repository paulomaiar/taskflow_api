const { Router } = require('express');
const projetosController = require('../controllers/projetos.controller');

const router = Router();

router.get('/', projetosController.listar);
router.post('/', projetosController.criar);
router.get('/:id', projetosController.buscarPorId);
router.put('/:id', projetosController.atualizar);
router.delete('/:id', projetosController.remover);

module.exports = router;