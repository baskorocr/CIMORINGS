const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkStatus() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'csms_db'
  });

  try {
    // Check connector status
    const [connectors] = await connection.execute(`
      SELECT cs.charge_point_id, c.connector_id, c.status 
      FROM connectors c 
      JOIN charging_stations cs ON c.charging_station_id = cs.id 
      WHERE cs.charge_point_id = ?
    `, ['ADVANCED_TEST_01']);
    
    console.log('Connector Status:');
    console.table(connectors);

    // Check active reservations
    const [reservations] = await connection.execute(`
      SELECT r.*, cs.charge_point_id 
      FROM reservations r 
      JOIN charging_stations cs ON r.charging_station_id = cs.id 
      WHERE cs.charge_point_id = ? AND r.status = 'Active' AND r.expiry_date > NOW()
    `, ['ADVANCED_TEST_01']);
    
    console.log('\nActive Reservations:');
    console.table(reservations);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkStatus();
