const express = require('express');
const router = express.Router();
const controller = require('../controllers/internFreeScheduleController');


router.get('/', controller.getByWeek);
router.post('/import', controller.importMany);
router.put('/', controller.updateCell);
router.delete('/delete-week', controller.deleteByWeek);

module.exports = router;
