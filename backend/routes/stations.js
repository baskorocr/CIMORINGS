const express = require('express');
const {
  getChargingStations,
  getChargingStation,
  createChargingStation,
  updateChargingStation,
  deleteChargingStation,
  getTransactions,
  getStationConnectors
} = require('../controllers/stationController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/stations', getChargingStations);
router.get('/stations/:id', getChargingStation);
router.get('/stations/:id/connectors', getStationConnectors);
router.post('/stations', createChargingStation);
router.put('/stations/:id', updateChargingStation);
router.delete('/stations/:id', deleteChargingStation);
router.get('/transactions', getTransactions);

module.exports = router;