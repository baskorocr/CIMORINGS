CREATE TABLE IF NOT EXISTS diagnostics_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  charge_point_id VARCHAR(50) NOT NULL,
  message_id VARCHAR(36) NULL,
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
);
