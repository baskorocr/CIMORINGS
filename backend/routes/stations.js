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
const { getStationDiagnostics, requestDiagnostics, downloadDiagnosticFile } = require('../controllers/diagnosticsController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Download endpoints without auth middleware (token in query/body)
router.get('/test-diagnostics/:requestId/download', downloadDiagnosticFile);
router.post('/diagnostics/:requestId/download', downloadDiagnosticFile);
router.get('/diagnostics/:requestId/download', downloadDiagnosticFile);
router.get('/stations/:chargePointId/messages', async (req, res) => {
  try {
    const { getConnection } = require('../config/database');
    const db = getConnection();
    const { chargePointId } = req.params;

    console.log('Getting OCPP messages for:', chargePointId);

    const [messages] = await db.execute(
      'SELECT * FROM ocpp_messages WHERE charge_point_id = ? ORDER BY timestamp DESC LIMIT 1000',
      [chargePointId]
    );

    console.log('Found messages:', messages.length);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="ocpp-messages-${chargePointId}.csv"`);

    let csv = 'ID,Charge Point ID,Message Type,Action,Message ID,Payload,Timestamp\n';
    messages.forEach(msg => {
      const payload = typeof msg.payload === 'string' ? msg.payload : JSON.stringify(msg.payload);
      const escapedPayload = payload.replace(/"/g, '""');
      csv += `${msg.id},"${msg.charge_point_id}","${msg.message_type}","${msg.action}","${msg.message_id}","${escapedPayload}","${msg.timestamp}"\n`;
    });

    res.send(csv);
  } catch (error) {
    console.error('OCPP messages error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.use(authenticateToken);

router.get('/stations', getChargingStations);
router.get('/stations/:id', getChargingStation);
router.get('/stations/:id/connectors', getStationConnectors);
router.get('/stations/:id/diagnostics', getStationDiagnostics);
router.post('/stations/:id/diagnostics', requestDiagnostics);
router.post('/stations', createChargingStation);
router.put('/stations/:id', updateChargingStation);
router.delete('/stations/:id', deleteChargingStation);
router.get('/transactions', getTransactions);

module.exports = router;