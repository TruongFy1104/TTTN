const express = require('express');
const router = express.Router();
const controller = require('../controllers/assignmentController');

router.get('/', controller.getAllAssignments);
router.get('/week', controller.getByWeek);
router.post('/', controller.createAssignment);
router.delete('/:id', controller.deleteAssignment);
router.put('/:id', controller.updateAssignment);

module.exports = router;
