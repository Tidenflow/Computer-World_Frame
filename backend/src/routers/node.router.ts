import { Router } from 'express';
import { nodeController } from '../controllers/node.controller';

const router = Router();

router.get('/', nodeController.getAll);
router.get('/:id', nodeController.getById);

export default router;
