const { connectDB, getConnection } = require('./config/database');

async function insertTestData() {
  try {
    await connectDB();
    const connection = getConnection();
    
    // Insert test charging station
    const [stationResult] = await connection.execute(
      'INSERT IGNORE INTO charging_stations (charge_point_id, name, location) VALUES (?, ?, ?)',
      ['TEST_STATION_01', 'Test Station 1', 'Test Location']
    );
    
    let stationId;
    if (stationResult.insertId) {
      stationId = stationResult.insertId;
    } else {
      const [existing] = await connection.execute(
        'SELECT id FROM charging_stations WHERE charge_point_id = ?',
        ['TEST_STATION_01']
      );
      stationId = existing[0].id;
    }
    
    // Insert connector
    await connection.execute(
      'INSERT IGNORE INTO connectors (charging_station_id, connector_id) VALUES (?, ?)',
      [stationId, 1]
    );
    
    // Insert test transactions
    const transactions = [
      {
        transaction_id: 1001,
        charging_station_id: stationId,
        connector_id: 1,
        id_tag: 'TAG001',
        meter_start: 1000,
        meter_stop: 1250,
        status: 'completed',
        start_timestamp: '2024-01-15 10:00:00',
        stop_timestamp: '2024-01-15 11:30:00'
      },
      {
        transaction_id: 1002,
        charging_station_id: stationId,
        connector_id: 1,
        id_tag: 'TAG002',
        meter_start: 1250,
        meter_stop: 1400,
        status: 'completed',
        start_timestamp: '2024-01-15 14:00:00',
        stop_timestamp: '2024-01-15 15:15:00'
      },
      {
        transaction_id: 1003,
        charging_station_id: stationId,
        connector_id: 1,
        id_tag: 'TAG003',
        meter_start: 1400,
        meter_stop: null,
        status: 'active',
        start_timestamp: '2024-01-15 16:00:00',
        stop_timestamp: null
      }
    ];
    
    for (const tx of transactions) {
      await connection.execute(
        `INSERT IGNORE INTO transactions 
         (transaction_id, charging_station_id, connector_id, id_tag, meter_start, meter_stop, status, start_timestamp, stop_timestamp) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tx.transaction_id, tx.charging_station_id, tx.connector_id, tx.id_tag, 
         tx.meter_start, tx.meter_stop, tx.status, tx.start_timestamp, tx.stop_timestamp]
      );
    }
    
    console.log('Test data inserted successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error inserting test data:', error);
    process.exit(1);
  }
}

insertTestData();