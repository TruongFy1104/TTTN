const express = require('express');
const router = express.Router();
const schoolController = require('../controllers/schoolController');

router.get('/', schoolController.getAllSchools);
router.post('/', schoolController.createSchool);
router.delete('/:id', schoolController.deleteSchool);
router.put('/:id', schoolController.updateSchool);

module.exports = router;
