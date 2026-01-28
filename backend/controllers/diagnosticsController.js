const { getConnection } = require('../config/database');
const { preDownloadDiagnosticFile } = require('../utils/fileManager');
const fs = require('fs');
const path = require('path');

// Get diagnostics requests for a station
const getStationDiagnostics = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = getConnection();
    
    // Get station info
    const [stations] = await connection.execute(
      'SELECT charge_point_id FROM charging_stations WHERE id = ?',
      [id]
    );
    
    if (stations.length === 0) {
      return res.status(404).json({ message: 'Station not found' });
    }
    
    const chargePointId = stations[0].charge_point_id;
    
    // Get diagnostics requests without pagination
    const [requests] = await connection.execute(
      'SELECT * FROM diagnostics_requests WHERE charge_point_id = ? ORDER BY created_at DESC',
      [chargePointId]
    );
    
    res.json({
      data: requests,
      total: requests.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Request diagnostics from a station
const requestDiagnostics = async (req, res) => {
  try {
    const { id } = req.params;
    const { startTime, stopTime, retries = 3, retryInterval = 60 } = req.body;
    const connection = getConnection();
    
    // Get station info
    const [stations] = await connection.execute(
      'SELECT charge_point_id FROM charging_stations WHERE id = ?',
      [id]
    );
    
    if (stations.length === 0) {
      return res.status(404).json({ message: 'Station not found' });
    }
    
    const chargePointId = stations[0].charge_point_id;
    
    // Generate FTP location and message_id
    const messageId = `${chargePointId}_${Date.now()}`;
    const location = `ftp://ftpadmin:Dharmap77@8.215.34.200:2121/ftp/diagnostic/DC/DPM120kw/${chargePointId}/${messageId}`;
    
    // Store diagnostic request in database - handle null values properly
    await connection.execute(`
      INSERT INTO diagnostics_requests (charge_point_id, message_id, location, retries, retry_interval, start_time, stop_time, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Requested', NOW(), NOW())
    `, [chargePointId, messageId, location, retries, retryInterval, startTime || null, stopTime || null]);
    
    // Send GetDiagnostics command
    const success = await global.ocppServer?.sendGetDiagnostics(chargePointId, location, retries, retryInterval, startTime, stopTime);
    
    if (success) {
      res.json({ 
        success: true,
        message: 'Diagnostics request sent successfully',
        location 
      });
    } else {
      // Update status to failed if station not connected
      await connection.execute(
        'UPDATE diagnostics_requests SET status = "Failed" WHERE charge_point_id = ? ORDER BY created_at DESC LIMIT 1',
        [chargePointId]
      );
      
      res.status(404).json({ 
        success: false,
        message: `Charging station ${chargePointId} not connected` 
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Download diagnostic file
const downloadDiagnosticFile = async (req, res) => {
  try {
    const { requestId } = req.params;
    const connection = getConnection();
    
    // Get request info
    const [requests] = await connection.execute(
      'SELECT * FROM diagnostics_requests WHERE id = ?',
      [requestId]
    );
    
    if (requests.length === 0) {
      return res.status(404).json({ message: 'Diagnostic request not found' });
    }
    
    const request = requests[0];
    
    if (request.status !== 'Uploaded') {
      return res.status(400).json({ message: 'File not yet uploaded or upload failed' });
    }
    
    const fileName = request.file_name || `${request.message_id}.zip`;
    
    // Check if file exists in local storage
    const storageDir = path.join(__dirname, '../storage/diagnostics');
    const localPath = path.join(storageDir, `${request.id}_${fileName}`);
    
    if (!fs.existsSync(localPath)) {
      return res.status(404).json({ message: 'File not found in local storage' });
    }
    
    const fileStats = fs.statSync(localPath);
    
    // Set response headers for file download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', fileStats.size);
    
    // Stream file directly from local storage
    const fileStream = fs.createReadStream(localPath);
    fileStream.pipe(res);
    
    console.log(`✅ Diagnostic file served: ${fileName}`);
    
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Trigger pre-download when status becomes 'Uploaded'
const handleDiagnosticsStatusUpdate = async (chargePointId, status, fileName = null) => {
  try {
    const connection = getConnection();
    
    // Update status in database
    await connection.execute(
      'UPDATE diagnostics_requests SET status = ?, file_name = COALESCE(?, file_name), updated_at = NOW() WHERE charge_point_id = ? ORDER BY created_at DESC LIMIT 1',
      [status, fileName, chargePointId]
    );
    
    // If status is 'Uploaded', trigger pre-download
    if (status === 'Uploaded') {
      const [requests] = await connection.execute(
        'SELECT * FROM diagnostics_requests WHERE charge_point_id = ? ORDER BY created_at DESC LIMIT 1',
        [chargePointId]
      );
      
      if (requests.length > 0) {
        const request = requests[0];
        console.log(`🔄 Pre-downloading diagnostic file for ${chargePointId}`);
        
        try {
          await preDownloadDiagnosticFile(request);
          console.log(`✅ Pre-download completed for ${chargePointId}`);
        } catch (error) {
          console.error(`❌ Pre-download failed for ${chargePointId}:`, error.message);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error handling diagnostics status update:', error);
    return false;
  }
};

module.exports = {
  getStationDiagnostics,
  requestDiagnostics,
  downloadDiagnosticFile,
  handleDiagnosticsStatusUpdate
};
