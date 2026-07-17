const express = require('express');
const { getRecurring, createRecurring, deleteRecurring } = require('../controllers/recurringController');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, getRecurring);
router.post('/', auth, createRecurring);
router.delete('/:id', auth, deleteRecurring);

module.exports = router;
