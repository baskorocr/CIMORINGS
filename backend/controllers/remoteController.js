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
  getConnectedStations
};