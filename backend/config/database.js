const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'csms_db'
};

let connection;

const connectDB = async () => {
  try {
    // First connect without database to create it
    const tempConnection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });
    
    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await tempConnection.end();
    
    // Now connect with database
    connection = await mysql.createConnection(dbConfig);
    console.log('MySQL Connected to', dbConfig.database);
    
    // Create tables
    await createTables();
    return connection;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

const createTables = async () => {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin', 'operator') DEFAULT 'operator',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS charging_stations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      charge_point_id VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      location VARCHAR(255),
      status ENUM('Available', 'Occupied', 'Faulted', 'Unavailable', 'Reserved', 'Preparing', 'Charging', 'SuspendedEVSE', 'SuspendedEV', 'Finishing') DEFAULT 'Unavailable',
      last_heartbeat TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS connectors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      charging_station_id INT,
      connector_id INT NOT NULL,
      status ENUM('Available', 'Occupied', 'Reserved', 'Unavailable', 'Faulted', 'Preparing', 'Charging', 'SuspendedEVSE', 'SuspendedEV', 'Finishing') DEFAULT 'Available',
      FOREIGN KEY (charging_station_id) REFERENCES charging_stations(id) ON DELETE CASCADE
    )`,
    
    `CREATE TABLE IF NOT EXISTS transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      transaction_id INT UNIQUE NOT NULL,
      charging_station_id INT,
      connector_id INT,
      id_tag VARCHAR(20) NOT NULL,
      meter_start INT DEFAULT 0,
      meter_stop INT DEFAULT 0,
      start_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      stop_timestamp TIMESTAMP NULL,
      status ENUM('active', 'completed', 'stopped') DEFAULT 'active',
      energy_consumed DECIMAL(10,3) DEFAULT 0.000,
      max_power DECIMAL(8,2) DEFAULT 0.00,
      soc DECIMAL(5,2) DEFAULT NULL,
      FOREIGN KEY (charging_station_id) REFERENCES charging_stations(id) ON DELETE CASCADE
    )`,
    
    `CREATE TABLE IF NOT EXISTS ocpp_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      charge_point_id VARCHAR(50),
      message_type ENUM('Call', 'CallResult', 'CallError'),
      action VARCHAR(50),
      message_id VARCHAR(36),
      payload JSON,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (charge_point_id) REFERENCES charging_stations(charge_point_id) ON DELETE CASCADE
    )`
  ];

  for (const table of tables) {
    await connection.execute(table);
  }
  
  // Add missing columns if they don't exist
  try {
    await connection.execute('ALTER TABLE transactions ADD COLUMN energy_consumed DECIMAL(10,3) DEFAULT 0.000');
  } catch (e) { /* Column already exists */ }
  
  try {
    await connection.execute('ALTER TABLE transactions ADD COLUMN max_power DECIMAL(8,2) DEFAULT 0.00');
  } catch (e) { /* Column already exists */ }
  
  try {
    await connection.execute('ALTER TABLE transactions ADD COLUMN soc DECIMAL(5,2) DEFAULT NULL');
  } catch (e) { /* Column already exists */ }
  
  // Update existing connectors to Available status
  await connection.execute('UPDATE connectors SET status = "Available" WHERE status = "Unavailable"');
  
  // Insert default admin user
  const adminExists = await connection.execute('SELECT id FROM users WHERE username = ?', ['admin']);
  if (adminExists[0].length === 0) {
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await connection.execute(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      ['admin', 'admin@csms.com', hashedPassword, 'admin']
    );
  }
};

const getConnection = () => connection;

module.exports = { connectDB, getConnection };