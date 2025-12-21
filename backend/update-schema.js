const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateSchema() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'csms_db'
    });

    console.log('Updating database schema...');

    // Update charging_stations table
    await connection.execute(`
      ALTER TABLE charging_stations 
      MODIFY COLUMN status ENUM('Available', 'Occupied', 'Faulted', 'Unavailable', 'Reserved', 'Preparing', 'Charging', 'SuspendedEVSE', 'SuspendedEV', 'Finishing') DEFAULT 'Unavailable'
    `);
    console.log('✅ Updated charging_stations table');

    // Update connectors table  
    await connection.execute(`
      ALTER TABLE connectors 
      MODIFY COLUMN status ENUM('Available', 'Occupied', 'Reserved', 'Unavailable', 'Faulted', 'Preparing', 'Charging', 'SuspendedEVSE', 'SuspendedEV', 'Finishing') DEFAULT 'Unavailable'
    `);
    console.log('✅ Updated connectors table');

    await connection.end();
    console.log('✅ Schema update completed');
    
  } catch (error) {
    console.error('❌ Schema update failed:', error.message);
  }
}

updateSchema();