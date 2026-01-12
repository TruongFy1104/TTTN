const express = require('express');
const router = express.Router();
const mapController = require('../controllers/mapController');

router.post('/find-closest-intern', mapController.findClosestIntern);

module.exports = router;
