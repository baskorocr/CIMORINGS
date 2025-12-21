const mysql = require('mysql2/promise');
require('dotenv').config();

async function addEnergyPowerColumns() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'csms_db'
    });

    console.log('Adding energy and power columns to transactions table...');

    try {
      // Add energy_consumed column
      await connection.execute(`
        ALTER TABLE transactions 
        ADD COLUMN energy_consumed DECIMAL(10,3) DEFAULT 0 COMMENT 'Energy consumed in kWh'
      `);
      console.log('✅ Added energy_consumed column');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ energy_consumed column already exists');
      } else {
        throw error;
      }
    }

    try {
      // Add max_power column
      await connection.execute(`
        ALTER TABLE transactions 
        ADD COLUMN max_power DECIMAL(8,2) DEFAULT 0 COMMENT 'Maximum power in kW'
      `);
      console.log('✅ Added max_power column');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ max_power column already exists');
      } else {
        throw error;
      }
    }

    await connection.end();
    console.log('✅ Database schema updated successfully');
    
  } catch (error) {
    console.error('❌ Schema update failed:', error.message);
  }
}

addEnergyPowerColumns();