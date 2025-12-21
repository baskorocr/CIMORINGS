const { getConnection } = require('../config/database');

const getChargingStations = async (req, res) => {
  try {
    const connection = getConnection();
    const [stations] = await connection.execute(`
      SELECT cs.*, 
             COUNT(c.id) as connector_count,
             COUNT(CASE WHEN c.status = 'Available' THEN 1 END) as available_connectors
      FROM charging_stations cs
      LEFT JOIN connectors c ON cs.id = c.charging_station_id
      GROUP BY cs.id
      ORDER BY cs.created_at DESC
    `);
    
    res.json(stations);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getChargingStation = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = getConnection();
    
    const [stations] = await connection.execute(
      'SELECT * FROM charging_stations WHERE id = ?',
      [id]
    );
    
    if (stations.length === 0) {
      return res.status(404).json({ message: 'Charging station not found' });
    }
    
    const [connectors] = await connection.execute(
      'SELECT * FROM connectors WHERE charging_station_id = ?',
      [id]
    );
    
    res.json({ ...stations[0], connectors });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createChargingStation = async (req, res) => {
  try {
    const { charge_point_id, name, location, connector_count = 1 } = req.body;
    const connection = getConnection();
    
    const [result] = await connection.execute(
      'INSERT INTO charging_stations (charge_point_id, name, location) VALUES (?, ?, ?)',
      [charge_point_id, name, location]
    );
    
    const stationId = result.insertId;
    
    // Create connectors
    for (let i = 1; i <= connector_count; i++) {
      await connection.execute(
        'INSERT INTO connectors (charging_station_id, connector_id) VALUES (?, ?)',
        [stationId, i]
      );
    }
    
    res.status(201).json({ message: 'Charging station created successfully', id: stationId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Charge point ID already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const limitNum = parseInt(limit);
    const offsetNum = (parseInt(page) - 1) * limitNum;
    
    const connection = getConnection();
    
    // Get total count
    const [countResult] = await connection.execute(
      'SELECT COUNT(*) as total FROM transactions'
    );
    const total = countResult[0].total;
    
    // Get paginated transactions using string interpolation to avoid parameter binding issues
    const query = `SELECT t.*, 
                          COALESCE(cs.name, 'Unknown Station') as station_name, 
                          COALESCE(cs.charge_point_id, 'Unknown') as charge_point_id
                   FROM transactions t
                   LEFT JOIN charging_stations cs ON t.charging_station_id = cs.id
                   ORDER BY t.start_timestamp DESC
                   LIMIT ${limitNum} OFFSET ${offsetNum}`;
    
    const [transactions] = await connection.execute(query);
    
    res.json({
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Transaction fetch error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getChargingStations,
  getChargingStation,
  createChargingStation,
  getTransactions
};