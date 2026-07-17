const express = require('express');
const { createHousehold, joinHousehold, getHousehold, leaveHousehold } = require('../controllers/householdController');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, getHousehold);
router.post('/create', auth, createHousehold);
router.post('/join', auth, joinHousehold);
router.post('/leave', auth, leaveHousehold);

module.exports = router;
