const remoteStartTransaction = async (req, res) => {
  try {
    const { chargePointId, connectorId, idTag } = req.body;
    
    // Get OCPP server instance (we'll need to modify server.js to expose this)
    const success = await global.ocppServer?.sendRemoteStartTransaction(chargePointId, connectorId, idTag);
    
    if (success) {
      res.json({ 
        success: true, 
        message: `Remote start command sent to ${chargePointId}` 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: `Charging station ${chargePointId} not connected` 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

const remoteStopTransaction = async (req, res) => {
  try {
    const { chargePointId, transactionId } = req.body;
    
    const success = await global.ocppServer?.sendRemoteStopTransaction(chargePointId, transactionId);
    
    if (success) {
      res.json({ 
        success: true, 
        message: `Remote stop command sent to ${chargePointId}` 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: `Charging station ${chargePointId} not connected` 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

const unlockConnector = async (req, res) => {
  try {
    const { chargePointId, connectorId } = req.body;
    
    const success = await global.ocppServer?.sendUnlockConnector(chargePointId, connectorId);
    
    if (success) {
      res.json({ 
        success: true, 
        message: `Unlock command sent to ${chargePointId} connector ${connectorId}` 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: `Charging station ${chargePointId} not connected` 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

const resetStation = async (req, res) => {
  try {
    const { chargePointId, type = 'Soft' } = req.body;
    
    const success = await global.ocppServer?.sendReset(chargePointId, type);
    
    if (success) {
      res.json({ 
        success: true, 
        message: `${type} reset command sent to ${chargePointId}` 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: `Charging station ${chargePointId} not connected` 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

const getDiagnostics = async (req, res) => {
  try {
    const { chargePointId, location, retries = 3, retryInterval = 60, startTime, stopTime } = req.body;
    
    // Store diagnostic request in database
    const { getConnection } = require('../config/database');
    const connection = getConnection();
    
    await connection.execute(`
      INSERT INTO diagnostics_requests (charge_point_id, location, retries, retry_interval, start_time, stop_time, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'Requested', NOW(), NOW())
    `, [chargePointId, location, retries, retryInterval, startTime, stopTime]);
    
    const success = await global.ocppServer?.sendGetDiagnostics(chargePointId, location, retries, retryInterval, startTime, stopTime);
    
    if (success) {
      res.json({ 
        success: true, 
        message: `GetDiagnostics command sent to ${chargePointId}`,
        location: location
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
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

const getConnectedStations = async (req, res) => {
  try {
    const connectedStations = Array.from(global.ocppServer?.clients?.keys() || []);
    res.json({ connectedStations });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

module.exports = {
  remoteStartTransaction,
  remoteStopTransaction,
  unlockConnector,
  resetStation,
  getDiagnostics,
  getConnectedStations
};