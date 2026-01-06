const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'csms_db',
    password: process.env.DB_PASSWORD || 'Dahrma777',
    database: process.env.DB_NAME || 'csms_db'
  });

  try {
    console.log('Running reservations table migration...');
    
    const sqlFile = path.join(__dirname, 'create-reservations-table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await connection.execute(statement);
        console.log('Executed:', statement.substring(0, 50) + '...');
      }
    }
    
    console.log('Reservations table migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
