const express = require('express');
const { getTags, createTag, deleteTag } = require('../controllers/tagController');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, getTags);
router.post('/', auth, createTag);
router.delete('/:id', auth, deleteTag);

module.exports = router;
