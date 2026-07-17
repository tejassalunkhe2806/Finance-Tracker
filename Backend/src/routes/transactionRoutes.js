const express = require('express');
const { addTransaction, getTransactions } = require('../controllers/transactionController');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/', auth, addTransaction);
router.get('/', auth, getTransactions);

module.exports = router;