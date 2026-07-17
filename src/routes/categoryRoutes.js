const express = require('express');
const { getCategories, createCategory, deleteCategory } = require('../controllers/categoryController');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, getCategories);
router.post('/', auth, createCategory);
router.delete('/:id', auth, deleteCategory);

module.exports = router;
