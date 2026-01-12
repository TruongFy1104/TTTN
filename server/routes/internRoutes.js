const express = require('express');
const router = express.Router();
const internController = require('../controllers/internController');

router.get('/', internController.getAllInterns);
router.post('/', internController.createIntern);
router.delete('/:id', internController.deleteIntern);
router.put('/:id', internController.updateIntern);

module.exports = router;
