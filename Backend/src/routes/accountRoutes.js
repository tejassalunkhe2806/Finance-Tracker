const express = require('express');
const { createAccount, getAccounts, deleteAccount } = require('../controllers/accountController');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/', auth, createAccount);
router.get('/', auth, getAccounts);
router.delete('/:id', auth, deleteAccount);

module.exports = router;