const { getConnection } = require('../config/database');

const getDashboardStats = async (req, res) => {
  try {
    const connection = getConnection();
    
    // Get station stats
    const [stationStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_stations,
        SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'Charging' THEN 1 ELSE 0 END) as charging,
        SUM(CASE WHEN status = 'Faulted' THEN 1 ELSE 0 END) as faulted
      FROM charging_stations
    `);
    
    // Get transaction stats
    const [transactionStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(meter_stop - meter_start) as total_energy
      FROM transactions
    `);
    
    // Get recent activity
    const [recentActivity] = await connection.execute(`
      SELECT om.*, cs.name as station_name
      FROM ocpp_messages om
      JOIN charging_stations cs ON om.charge_point_id = cs.charge_point_id
      ORDER BY om.timestamp DESC
      LIMIT 10
    `);
    
    res.json({
      stations: stationStats[0],
      transactions: transactionStats[0],
      recentActivity
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getActiveTransactions = async (req, res) => {
  try {
    const connection = getConnection();
    const [transactions] = await connection.execute(`
      SELECT 
        t.*,
        cs.name as station_name,
        cs.charge_point_id,
        c.status as connector_status,
        TIMESTAMPDIFF(SECOND, t.start_timestamp, NOW()) as duration_seconds,
        COALESCE(t.energy_consumed, 0) as energy_consumed,
        COALESCE(t.max_power, 0) as max_power
      FROM transactions t
      JOIN charging_stations cs ON t.charging_station_id = cs.id
      JOIN connectors c ON cs.id = c.charging_station_id AND t.connector_id = c.connector_id
      WHERE t.status = 'active'
      ORDER BY t.start_timestamp DESC
    `);
    
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getTransactionDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = getConnection();
    
    // Get transaction info
    const [transactions] = await connection.execute(`
      SELECT 
        t.*,
        cs.name as station_name,
        cs.charge_point_id,
        cs.location,
        TIMESTAMPDIFF(SECOND, t.start_timestamp, COALESCE(t.stop_timestamp, NOW())) as duration_seconds
      FROM transactions t
      JOIN charging_stations cs ON t.charging_station_id = cs.id
      WHERE t.transaction_id = ?
    `, [id]);
    
    if (transactions.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    // Get meter values for this transaction
    const [meterValues] = await connection.execute(`
      SELECT *
      FROM ocpp_messages
      WHERE charge_point_id = ? 
        AND action = 'MeterValues'
        AND JSON_EXTRACT(payload, '$.transactionId') = ?
      ORDER BY timestamp ASC
    `, [transactions[0].charge_point_id, id]);
    
    res.json({
      transaction: transactions[0],
      meterValues
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getStationConnectors = async (req, res) => {
  try {
    const { chargePointId } = req.params;
    const connection = getConnection();
    
    const [connectors] = await connection.execute(`
      SELECT c.*, cs.name as station_name, cs.charge_point_id
      FROM connectors c
      JOIN charging_stations cs ON c.charging_station_id = cs.id
      WHERE cs.charge_point_id = ?
      ORDER BY c.connector_id
    `, [chargePointId]);
    
    res.json(connectors);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getOCPPMessages = async (req, res) => {
  try {
    const { chargePointId } = req.params;
    const { limit = 50 } = req.query;
    const connection = getConnection();
    
    const [messages] = await connection.execute(`
      SELECT *
      FROM ocpp_messages
      WHERE charge_point_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `, [chargePointId, parseInt(limit)]);
    
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getActiveTransactions,
  getTransactionDetail,
  getStationConnectors,
  getOCPPMessages
};