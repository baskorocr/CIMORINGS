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

router.use(authenticateToken);

router.get('/stations', getChargingStations);
router.get('/stations/:id', getChargingStation);
router.get('/stations/:id/connectors', getStationConnectors);
router.get('/stations/:id/diagnostics', getStationDiagnostics);
router.post('/stations/:id/diagnostics', requestDiagnostics);
router.get('/diagnostics/:requestId/download', downloadDiagnosticFile);
router.get('/stations/:id/ocpp-messages/download', async (req, res) => {
  try {
    const { getConnection } = require('../config/database');
    const db = getConnection();
    const { id } = req.params;

    const [station] = await db.execute('SELECT charge_point_id FROM charging_stations WHERE id = ?', [id]);
    if (station.length === 0) return res.status(404).json({ error: 'Station not found' });

    const [messages] = await db.execute(
      'SELECT * FROM ocpp_messages WHERE charge_point_id = ? ORDER BY timestamp DESC',
      [station[0].charge_point_id]
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="ocpp-messages-${station[0].charge_point_id}.csv"`);

    let csv = 'ID,Charge Point ID,Message Type,Action,Message ID,Payload,Timestamp\n';
    messages.forEach(msg => {
      csv += `${msg.id},"${msg.charge_point_id}","${msg.message_type}","${msg.action}","${msg.message_id}","${JSON.stringify(msg.payload).replace(/"/g, '""')}","${msg.timestamp}"\n`;
    });

    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.post('/stations', createChargingStation);
router.put('/stations/:id', updateChargingStation);
router.delete('/stations/:id', deleteChargingStation);
router.get('/transactions', getTransactions);

module.exports = router;