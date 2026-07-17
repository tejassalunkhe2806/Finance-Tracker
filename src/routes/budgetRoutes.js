const express = require('express');
const { getBudgets, upsertBudget, deleteBudget } = require('../controllers/budgetController');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, getBudgets);
router.post('/', auth, upsertBudget);
router.delete('/:id', auth, deleteBudget);

module.exports = router;
