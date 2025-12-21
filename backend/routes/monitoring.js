const express = require('express');
const {
  getDashboardStats,
  getActiveTransactions,
  getTransactionDetail,
  getStationConnectors,
  getOCPPMessages
} = require('../controllers/monitoringController');

const {
  remoteStartTransaction,
  remoteStopTransaction,
  unlockConnector,
  resetStation,
  getConnectedStations
} = require('../controllers/remoteController');

const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// Monitoring endpoints
router.get('/dashboard/stats', getDashboardStats);
router.get('/transactions/active', getActiveTransactions);
router.get('/transactions/:id/detail', getTransactionDetail);
router.get('/connected-stations', getConnectedStations);
router.get('/stations/:chargePointId/connectors', getStationConnectors);
router.get('/stations/:chargePointId/messages', getOCPPMessages);

// Remote command endpoints
router.post('/remote/start', remoteStartTransaction);
router.post('/remote/stop', remoteStopTransaction);
router.post('/remote/unlock', unlockConnector);
router.post('/remote/reset', resetStation);

module.exports = router;