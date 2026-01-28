const { connectDB } = require('../config/database');

async function createDiagnosticsTable() {
  try {
    const connection = await connectDB();
    
    // Drop existing table if it exists
    await connection.execute('DROP TABLE IF EXISTS diagnostics_requests');
    
    // Create diagnostics_requests table with correct schema
    await connection.execute(`
      CREATE TABLE diagnostics_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        charge_point_id VARCHAR(50) NOT NULL,
        location TEXT NOT NULL,
        retries INT DEFAULT 3,
        retry_interval INT DEFAULT 60,
        start_time DATETIME NULL,
        stop_time DATETIME NULL,
        status ENUM('Requested', 'Uploading', 'Uploaded', 'UploadFailed', 'Failed') DEFAULT 'Requested',
        file_name VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_charge_point_id (charge_point_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      )
    `);
    
    console.log('✅ Diagnostics table recreated successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating diagnostics table:', error);
    process.exit(1);
  }
}

createDiagnosticsTable();
