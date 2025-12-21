const express = require('express');
const {
  getChargingStations,
  getChargingStation,
  createChargingStation,
  getTransactions
} = require('../controllers/stationController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/stations', getChargingStations);
router.get('/stations/:id', getChargingStation);
router.post('/stations', createChargingStation);
router.get('/transactions', getTransactions);

module.exports = router;