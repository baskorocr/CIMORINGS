const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const { getConnection } = require('../config/database');

class OCPPServer {
  constructor(port, io) {
    this.port = port;
    this.io = io; // Socket.IO instance for real-time updates
    this.clients = new Map();
    this.messageHandlers = this.initializeMessageHandlers();
  }

  start() {
    this.wss = new WebSocket.Server({
      port: this.port,
      host: '0.0.0.0'
    });

    
    this.wss.on('connection', (ws, req) => {
      const chargePointId = this.extractChargePointId(req.url);
      
      if (!chargePointId) {
        ws.close(1002, 'Invalid charge point ID');
        return;
      }

      this.clients.set(chargePointId, ws);
      console.log(`Charge Point ${chargePointId} connected`);
      
      // Emit real-time update
      this.io?.emit('station_connected', { chargePointId, timestamp: new Date() });

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('Raw message received:', message);
          
          // Validate message format
          if (!Array.isArray(message) || message.length < 3) {
            console.error('Invalid message format:', message);
            return;
          }
          
          await this.handleMessage(chargePointId, message, ws);
        } catch (error) {
          console.error('Message parsing error:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(chargePointId);
        console.log(`Charge Point ${chargePointId} disconnected`);
        
        // Emit real-time update
        this.io?.emit('station_disconnected', { chargePointId, timestamp: new Date() });
      });

      // Send initial message
      // this.sendMessage(ws, [2, uuidv4(), 'GetConfiguration', {}]);
    });

    console.log(`OCPP Server started on port ${this.port}`);
  }

  extractChargePointId(url) {
    const match = url.match(/\/([^\/]+)$/);
    return match ? match[1] : null;
  }

  async handleMessage(chargePointId, message, ws) {
    try {
      console.log('Full message array:', JSON.stringify(message));
      
      const [messageType, messageId, actionOrPayload, payload] = message;
      
      console.log('Parsed values:', {
        messageType,
        messageId, 
        actionOrPayload,
        payload: payload ? JSON.stringify(payload) : 'undefined'
      });
      
      // Handle different message types
      if (messageType === 2) {
        // CALL - Request from charging station
        const action = actionOrPayload;
        
        // Validate required fields
        if (!action || typeof action !== 'string') {
          console.error('Invalid action:', action);
          return;
        }
        
        console.log(`📨 Received from ${chargePointId}: ${action}`, payload);
        
        // Ensure charging station exists FIRST
        await this.ensureStationExists(chargePointId);
        
        if (this.messageHandlers[action]) {
          const response = await this.messageHandlers[action](chargePointId, payload);
          console.log(`📤 Sending response to ${chargePointId}:`, response);
          this.sendCallResult(ws, messageId, response);
          
          // Log message AFTER successful processing
          await this.logMessage(chargePointId, 'Call', action, messageId, payload);
        } else {
          console.error(`❌ Unknown action: ${action}`);
          this.sendCallError(ws, messageId, 'NotSupported', `Action ${action} is not supported`);
        }
        
      } else if (messageType === 3) {
        // CALLRESULT - Response from charging station to our command
        const responsePayload = actionOrPayload;
        console.log(`✅ Received response from ${chargePointId} for message ${messageId}:`, responsePayload);
        
        // Handle the response (e.g., update pending requests, notify frontend)
        this.handleCallResult(chargePointId, messageId, responsePayload);
        
      } else if (messageType === 4) {
        // CALLERROR - Error response from charging station
        const [errorCode, errorDescription, errorDetails] = [actionOrPayload, payload, message[4]];
        console.error(`❌ Error from ${chargePointId} for message ${messageId}:`, {
          errorCode,
          errorDescription,
          errorDetails
        });
        
        // Handle the error
        this.handleCallError(chargePointId, messageId, errorCode, errorDescription, errorDetails);
        
      } else {
        console.error('❌ Unknown message type:', messageType);
      }
      
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  initializeMessageHandlers() {
    return {
      // Core Profile
      BootNotification: async (chargePointId, payload) => {
        await this.updateStationStatus(chargePointId, 'Available');
        console.log(`🔌 ${chargePointId} booted: ${payload.chargePointVendor} ${payload.chargePointModel}`);
        return {
          status: 'Accepted',
          currentTime: new Date().toISOString(),
          interval: 300
        };
      },

      Heartbeat: async (chargePointId, payload) => {
        await this.updateHeartbeat(chargePointId);
        console.log(`💓 Heartbeat from ${chargePointId}`);
        return { currentTime: new Date().toISOString() };
      },

      StatusNotification: async (chargePointId, payload) => {
        // Check if connector has active reservation before updating status
        const connection = getConnection();
        const [stations] = await connection.execute(
          'SELECT id FROM charging_stations WHERE charge_point_id = ?',
          [chargePointId]
        );
        
        if (stations.length > 0) {
          const stationId = stations[0].id;
          console.log(`🔍 StatusNotification debug - stationId: ${stationId}, connectorId: ${payload.connectorId}, newStatus: ${payload.status}`);
          
          // Check for active reservation
          const [reservations] = await connection.execute(`
            SELECT * FROM reservations 
            WHERE charging_station_id = ? AND connector_id = ? 
            AND status = 'Active' AND expiry_date > NOW()
          `, [stationId, payload.connectorId]);
          
          console.log(`🔍 Found ${reservations.length} active reservations`);
          
          // If there's an active reservation and status is being set to Available, keep it Reserved
          if (reservations.length > 0 && payload.status === 'Available') {
            console.log(`🔒 Connector ${payload.connectorId} has active reservation, keeping status as Reserved`);
            await this.updateConnectorStatus(chargePointId, payload.connectorId, 'Reserved');
          } else {
            console.log(`✅ Updating connector status to ${payload.status}`);
            await this.updateConnectorStatus(chargePointId, payload.connectorId, payload.status);
          }
        } else {
          await this.updateConnectorStatus(chargePointId, payload.connectorId, payload.status);
        }
        
        console.log(`📊 ${chargePointId} connector ${payload.connectorId}: ${payload.status}`);
        
        // Update station status based on connector status
        await this.updateStationStatusBasedOnConnectors(chargePointId, payload.status, payload.errorCode);
        
        return {};
      },

      Authorize: async (chargePointId, payload) => {
        console.log(`🔐 Authorization request from ${chargePointId} for ${payload.idTag}`);
        
        const connection = getConnection();
        
        // First, check if there are ANY active reservations on this station
        const [allReservations] = await connection.execute(`
          SELECT r.* FROM reservations r
          JOIN charging_stations cs ON r.charging_station_id = cs.id
          WHERE cs.charge_point_id = ? AND r.status = 'Active' AND r.expiry_date > NOW()
        `, [chargePointId]);
        
        if (allReservations.length > 0) {
          // If there are reservations, only accept ID tags that have reservations
          const hasReservation = allReservations.some(r => r.id_tag === payload.idTag);
          
          if (hasReservation) {
            console.log(`✅ ID tag ${payload.idTag} has active reservation`);
            return {
              idTagInfo: {
                status: 'Accepted'
              }
            };
          } else {
            console.log(`❌ ID tag ${payload.idTag} rejected - station has reservations but not for this ID tag`);
            return {
              idTagInfo: {
                status: 'Rejected'
              }
            };
          }
        }
        
        // No reservations - check if any connector is available
        const [availableConnectors] = await connection.execute(`
          SELECT c.* FROM connectors c
          JOIN charging_stations cs ON c.charging_station_id = cs.id
          WHERE cs.charge_point_id = ? AND c.status = 'Available'
        `, [chargePointId]);
        
        if (availableConnectors.length > 0) {
          console.log(`✅ ID tag ${payload.idTag} authorized - no reservations, available connectors found`);
          return {
            idTagInfo: {
              status: 'Accepted'
            }
          };
        }
        
        console.log(`❌ ID tag ${payload.idTag} rejected - no available connectors`);
        return {
          idTagInfo: {
            status: 'Rejected'
          }
        };
      },

      StartTransaction: async (chargePointId, payload) => {
        console.log(`🔍 StartTransaction debug - chargePointId: ${chargePointId}, payload:`, payload);
        
        const connection = getConnection();
        
        // Get station ID
        const [stations] = await connection.execute(
          'SELECT id FROM charging_stations WHERE charge_point_id = ?',
          [chargePointId]
        );
        
        if (stations.length === 0) {
          console.log(`❌ No station found for ${chargePointId}`);
          return {
            transactionId: 0,
            idTagInfo: { status: 'Rejected' }
          };
        }
        
        const stationId = stations[0].id;
        
        // Check for active reservation on this connector
        const [reservations] = await connection.execute(`
          SELECT * FROM reservations 
          WHERE charging_station_id = ? AND connector_id = ? 
          AND status = 'Active' AND expiry_date > NOW()
        `, [stationId, payload.connectorId]);
        
        // If there are active reservations, find one that matches the ID tag
        if (reservations.length > 0) {
          console.log(`🔍 Found ${reservations.length} active reservations for connector ${payload.connectorId}`);
          
          // Find reservation that matches the provided ID tag
          const matchingReservation = reservations.find(r => r.id_tag === payload.idTag);
          
          if (!matchingReservation) {
            console.log(`❌ No reservation found for ID tag: ${payload.idTag}`);
            console.log(`Available reservations:`, reservations.map(r => r.id_tag));
            return {
              transactionId: 0,
              idTagInfo: { status: 'Rejected' }
            };
          }
          
          console.log(`✅ Reservation validated for ID tag: ${payload.idTag}`);
          
          // Update reservation status to Used
          await connection.execute(
            'UPDATE reservations SET status = "Used" WHERE id = ?',
            [matchingReservation.id]
          );
        }
        
        // Check connector status
        const [connectors] = await connection.execute(`
          SELECT c.status FROM connectors c
          JOIN charging_stations cs ON c.charging_station_id = cs.id
          WHERE cs.charge_point_id = ? AND c.connector_id = ?
        `, [chargePointId, payload.connectorId]);
        
        if (connectors.length === 0) {
          console.log(`❌ No connector found for ${chargePointId} connector ${payload.connectorId}`);
          return {
            transactionId: 0,
            idTagInfo: { status: 'Rejected' }
          };
        }
        
        // Accept Available, Preparing, or Reserved status for StartTransaction
        const acceptableStatuses = ['Available', 'Preparing', 'Reserved'];
        if (!acceptableStatuses.includes(connectors[0].status)) {
          console.log(`❌ Connector status is ${connectors[0].status}, not acceptable`);
          return {
            transactionId: 0,
            idTagInfo: { status: 'Rejected' }
          };
        }
        
        console.log(`✅ Creating transaction for ${chargePointId}`);
        const transactionId = await this.createTransaction(chargePointId, payload);
        
        // Update connector status to Occupied
        await this.updateConnectorStatus(chargePointId, payload.connectorId, 'Occupied');
        
        // Emit real-time update
        this.io?.emit('transaction_started', {
          chargePointId,
          transactionId,
          connectorId: payload.connectorId,
          idTag: payload.idTag,
          meterStart: payload.meterStart,
          timestamp: new Date()
        });
        
        return {
          transactionId,
          idTagInfo: { status: 'Accepted' }
        };
      },

      StopTransaction: async (chargePointId, payload) => {
        await this.stopTransaction(payload.transactionId, payload);
        console.log(`🛑 ${chargePointId} stopped transaction ${payload.transactionId}`);
        
        // Update connector status to Available
        const connection = getConnection();
        const [transactions] = await connection.execute(
          'SELECT connector_id FROM transactions WHERE transaction_id = ?',
          [payload.transactionId]
        );
        
        if (transactions.length > 0) {
          await this.updateConnectorStatus(chargePointId, transactions[0].connector_id, 'Available');
        }
        
        // Emit real-time update
        this.io?.emit('transaction_stopped', {
          chargePointId,
          transactionId: payload.transactionId,
          meterStop: payload.meterStop,
          reason: payload.reason,
          timestamp: new Date()
        });
        
        return {
          idTagInfo: { status: 'Accepted' }
        };
      },

      MeterValues: async (chargePointId, payload) => {
        // Check if transaction is still active
        const connection = getConnection();
        const [transactions] = await connection.execute(
          'SELECT status, meter_start FROM transactions WHERE transaction_id = ?',
          [payload.transactionId]
        );
        
        if (transactions.length === 0 || transactions[0].status !== 'active') {
          console.log(`❌ Rejected meter values for inactive transaction ${payload.transactionId}`);
          return { status: 'Rejected' };
        }
        
        const energy = payload.meterValue?.[0]?.sampledValue?.find(v => v.measurand === 'Energy.Active.Import.Register')?.value;
        const power = payload.meterValue?.[0]?.sampledValue?.find(v => v.measurand === 'Power.Active.Import')?.value;
        const soc = payload.meterValue?.[0]?.sampledValue?.find(v => v.measurand === 'SoC')?.value; // State of Charge (battery %)
        console.log(`⚡ ${chargePointId} meter: ${energy}Wh, ${power}kW, SoC: ${soc}%`);
        
        // Update max power and energy consumed
        if (power) {
          await connection.execute(`
            UPDATE transactions 
            SET max_power = GREATEST(COALESCE(max_power, 0), ?)
            WHERE transaction_id = ?
          `, [parseFloat(power), payload.transactionId]);
        }
        
        // Update SoC (State of Charge) if provided
        if (soc) {
          await connection.execute(`
            UPDATE transactions 
            SET soc = ?
            WHERE transaction_id = ?
          `, [parseFloat(soc), payload.transactionId]);
          console.log(`🔋 Updated SoC: ${soc}% for transaction ${payload.transactionId}`);
        }
        
        // Update energy consumed if energy value is provided
        if (energy && transactions[0].meter_start) {
          const energyConsumed = ((parseFloat(energy) - transactions[0].meter_start) / 1000).toFixed(3);
          await connection.execute(`
            UPDATE transactions 
            SET energy_consumed = ?
            WHERE transaction_id = ?
          `, [energyConsumed, payload.transactionId]);
          console.log(`🔋 Updated energy consumed: ${energyConsumed}kWh for transaction ${payload.transactionId}`);
        }
        
        // Emit real-time meter values
        this.io?.emit('meter_values', {
          chargePointId,
          transactionId: payload.transactionId,
          connectorId: payload.connectorId,
          energy,
          power,
          soc,
          meterValue: payload.meterValue,
          timestamp: new Date()
        });
        
        return {};
      },

      // Firmware Management Profile
      FirmwareStatusNotification: async (chargePointId, payload) => {
        return {};
      },

      // Local Auth List Management Profile
      SendLocalList: async (chargePointId, payload) => {
        return { status: 'Accepted' };
      },

      // Remote Trigger Profile
      TriggerMessage: async (chargePointId, payload) => {
        return { status: 'Accepted' };
      },

      // Remote commands responses
      RemoteStartTransaction: async (chargePointId, payload) => {
        return { status: 'Accepted' };
      },

      RemoteStopTransaction: async (chargePointId, payload) => {
        return { status: 'Accepted' };
      },

      UnlockConnector: async (chargePointId, payload) => {
        return { status: 'Unlocked' };
      },

      Reset: async (chargePointId, payload) => {
        return { status: 'Accepted' };
      },

      // Smart Charging Profile
      SetChargingProfile: async (chargePointId, payload) => {
        return { status: 'Accepted' };
      },

      ClearChargingProfile: async (chargePointId, payload) => {
        return { status: 'Accepted' };
      },

      GetCompositeSchedule: async (chargePointId, payload) => {
        return {
          status: 'Accepted',
          connectorId: payload.connectorId
        };
      },

      // Reservation Profile
      ReserveNow: async (chargePointId, payload) => {
        // This would be a request FROM station TO csms (rare)
        // Usually CSMS sends ReserveNow TO station
        return { status: 'Accepted' };
      },

      CancelReservation: async (chargePointId, payload) => {
        // This would be a request FROM station TO csms (rare)
        return { status: 'Accepted' };
      },

      // Configuration Profile
      GetConfiguration: async (chargePointId, payload) => {
        return {
          configurationKey: [
            { key: 'HeartbeatInterval', readonly: false, value: '300' },
            { key: 'MeterValueSampleInterval', readonly: false, value: '60' },
            { key: 'ClockAlignedDataInterval', readonly: false, value: '900' },
            { key: 'ConnectionTimeOut', readonly: false, value: '60' }
          ]
        };
      },

      ChangeConfiguration: async (chargePointId, payload) => {
        return { status: 'Accepted' };
      },

      // Data Transfer Profile
      DataTransfer: async (chargePointId, payload) => {
        console.log(`📊 DataTransfer from ${chargePointId}:`, payload);
        return { 
          status: 'Accepted',
          data: payload.data || ''
        };
      }
    };
  }

  async updateStationStatus(chargePointId, status) {
    const connection = getConnection();
    await connection.execute(
      'UPDATE charging_stations SET status = ?, last_heartbeat = NOW() WHERE charge_point_id = ?',
      [status, chargePointId]
    );
  }

  async updateStationStatusBasedOnConnectors(chargePointId, connectorStatus, errorCode) {
    const connection = getConnection();
    
    // If any connector is Faulted or has error, mark station as Faulted
    if (connectorStatus === 'Faulted' || (errorCode && errorCode !== 'NoError')) {
      await this.updateStationStatus(chargePointId, 'Faulted');
      console.log(`🚨 Station ${chargePointId} marked as Faulted due to connector status: ${connectorStatus}, error: ${errorCode}`);
      return;
    }
    
    // Check all connectors status to determine station status
    const [connectors] = await connection.execute(`
      SELECT c.status FROM connectors c
      JOIN charging_stations cs ON c.charging_station_id = cs.id
      WHERE cs.charge_point_id = ?
    `, [chargePointId]);
    
    if (connectors.length === 0) {
      await this.updateStationStatus(chargePointId, 'Available');
      return;
    }
    
    // Determine station status based on connector statuses
    const statuses = connectors.map(c => c.status);
    
    if (statuses.some(s => s === 'Faulted')) {
      await this.updateStationStatus(chargePointId, 'Faulted');
    } else if (statuses.some(s => s === 'Occupied' || s === 'Charging')) {
      await this.updateStationStatus(chargePointId, 'Occupied');
    } else if (statuses.some(s => s === 'Preparing')) {
      await this.updateStationStatus(chargePointId, 'Preparing');
    } else if (statuses.every(s => s === 'Available')) {
      await this.updateStationStatus(chargePointId, 'Available');
    } else {
      await this.updateStationStatus(chargePointId, 'Unavailable');
    }
  }

  async updateHeartbeat(chargePointId) {
    const connection = getConnection();
    await connection.execute(
      'UPDATE charging_stations SET last_heartbeat = NOW() WHERE charge_point_id = ?',
      [chargePointId]
    );
  }

  async updateConnectorStatus(chargePointId, connectorId, status) {
    const connection = getConnection();
    
    // First, ensure the connector exists
    const [existing] = await connection.execute(`
      SELECT c.id FROM connectors c
      JOIN charging_stations cs ON c.charging_station_id = cs.id
      WHERE cs.charge_point_id = ? AND c.connector_id = ?
    `, [chargePointId, connectorId]);
    
    if (existing.length === 0) {
      // Auto-create connector if it doesn't exist
      const [station] = await connection.execute(
        'SELECT id FROM charging_stations WHERE charge_point_id = ?',
        [chargePointId]
      );
      
      if (station.length > 0) {
        await connection.execute(
          'INSERT INTO connectors (charging_station_id, connector_id, status) VALUES (?, ?, ?)',
          [station[0].id, connectorId, status]
        );
        console.log(`Auto-created connector ${connectorId} for station ${chargePointId}`);
      }
    } else {
      // Update existing connector
      await connection.execute(`
        UPDATE connectors c
        JOIN charging_stations cs ON c.charging_station_id = cs.id
        SET c.status = ?
        WHERE cs.charge_point_id = ? AND c.connector_id = ?
      `, [status, chargePointId, connectorId]);
    }
  }

  async createTransaction(chargePointId, payload) {
    const connection = getConnection();
    const transactionId = Math.floor(Math.random() * 1000000);
    
    console.log(`🔍 Creating transaction - chargePointId: ${chargePointId}, transactionId: ${transactionId}`);
    console.log(`🔍 Payload:`, JSON.stringify(payload));
    
    try {
      const [station] = await connection.execute(
        'SELECT id FROM charging_stations WHERE charge_point_id = ?',
        [chargePointId]
      );

      console.log(`🔍 Station query result:`, station);

      if (station.length > 0) {
        console.log(`🔍 Inserting transaction into database...`);
        console.log(`🔍 Insert params: transactionId=${transactionId}, stationId=${station[0].id}, connectorId=${payload.connectorId}, idTag=${payload.idTag}, meterStart=${payload.meterStart}`);
        
        const result = await connection.execute(`
          INSERT INTO transactions (transaction_id, charging_station_id, connector_id, id_tag, meter_start)
          VALUES (?, ?, ?, ?, ?)
        `, [transactionId, station[0].id, payload.connectorId, payload.idTag, payload.meterStart]);
        
        console.log(`✅ Transaction inserted successfully:`, result[0]);
        
        // Verify insertion
        const [verify] = await connection.execute(
          'SELECT * FROM transactions WHERE transaction_id = ?',
          [transactionId]
        );
        console.log(`🔍 Verification - transaction in DB:`, verify[0]);
        
      } else {
        console.log(`❌ No station found for chargePointId: ${chargePointId}`);
      }
    } catch (error) {
      console.error(`❌ Error creating transaction:`, error);
    }

    return transactionId;
  }

  async stopTransaction(transactionId, payload) {
    const connection = getConnection();
    
    // Get transaction start data
    const [transactions] = await connection.execute(
      'SELECT meter_start FROM transactions WHERE transaction_id = ?',
      [transactionId]
    );
    
    let energyConsumed = 0;
    if (transactions.length > 0 && payload.meterStop) {
      // Calculate energy consumed (meterStop - meterStart) in kWh
      energyConsumed = ((payload.meterStop - transactions[0].meter_start) / 1000).toFixed(3);
    }
    
    console.log(`🔍 StopTransaction - transactionId: ${transactionId}, meterStart: ${transactions[0]?.meter_start}, meterStop: ${payload.meterStop}, energyConsumed: ${energyConsumed}kWh`);
    
    await connection.execute(`
      UPDATE transactions 
      SET meter_stop = ?, stop_timestamp = NOW(), status = 'completed', energy_consumed = ?
      WHERE transaction_id = ?
    `, [payload.meterStop || 0, energyConsumed, transactionId]);
  }

  async ensureStationExists(chargePointId) {
    const connection = getConnection();
    const [existing] = await connection.execute(
      'SELECT id FROM charging_stations WHERE charge_point_id = ?',
      [chargePointId]
    );

    if (existing.length === 0) {
      // Auto-create charging station (without connectors)
      const [result] = await connection.execute(
        'INSERT INTO charging_stations (charge_point_id, name, location, status) VALUES (?, ?, ?, ?)',
        [chargePointId, `Station ${chargePointId}`, 'Auto-created', 'Available']
      );
      
      console.log(`Auto-created station: ${chargePointId} (connectors will be created dynamically)`);
    }
  }

  async logMessage(chargePointId, messageType, action, messageId, payload) {
    try {
      const connection = getConnection();
      
      // Validate parameters and ensure correct ENUM values
      const safeChargePointId = chargePointId || 'UNKNOWN';
      const safeMessageType = messageType === 'Call' ? 'Call' : 
                             messageType === 'CallResult' ? 'CallResult' : 
                             messageType === 'CallError' ? 'CallError' : 'Call';
      const safeAction = action || 'Unknown';
      const safeMessageId = messageId || uuidv4();
      const safePayload = payload ? JSON.stringify(payload) : '{}';
      
      console.log(`📝 Logging message: ${safeChargePointId}, ${safeMessageType}, ${safeAction}`);
      
      // Check if charging station exists first
      const [station] = await connection.execute(
        'SELECT charge_point_id FROM charging_stations WHERE charge_point_id = ?',
        [safeChargePointId]
      );
      
      if (station.length > 0) {
        await connection.execute(`
          INSERT INTO ocpp_messages (charge_point_id, message_type, action, message_id, payload)
          VALUES (?, ?, ?, ?, ?)
        `, [safeChargePointId, safeMessageType, safeAction, safeMessageId, safePayload]);
        console.log(`📝 Logged message: ${safeAction}`);
      } else {
        console.log(`⚠️ Skipping message log - station ${safeChargePointId} not found`);
      }
    } catch (error) {
      console.error('Failed to log message:', error.message);
    }
  }

  sendMessage(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  sendCallResult(ws, messageId, payload) {
    this.sendMessage(ws, [3, messageId, payload]);
  }

  sendCallError(ws, messageId, errorCode, errorDescription) {
    this.sendMessage(ws, [4, messageId, errorCode, errorDescription, {}]);
  }

  // Handle CALLRESULT responses
  handleCallResult(chargePointId, messageId, payload) {
    console.log(`✅ Command response from ${chargePointId}:`, payload);
    
    // You can store pending requests and match them with responses
    // For now, just log the successful response
    if (payload.status === 'Accepted') {
      console.log(`✅ Command accepted by ${chargePointId}`);
    } else if (payload.status === 'Rejected') {
      console.log(`❌ Command rejected by ${chargePointId}`);
    }
  }

  // Handle CALLERROR responses  
  handleCallError(chargePointId, messageId, errorCode, errorDescription, errorDetails) {
    console.error(`❌ Command error from ${chargePointId}:`, {
      messageId,
      errorCode,
      errorDescription,
      errorDetails
    });
  }

  // Remote commands
  async sendRemoteStartTransaction(chargePointId, connectorId, idTag) {
    const ws = this.clients.get(chargePointId);
    if (ws) {
      const messageId = uuidv4();
      this.sendMessage(ws, [2, messageId, 'RemoteStartTransaction', {
        connectorId,
        idTag
      }]);
      return true;
    }
    return false;
  }

  async sendRemoteStopTransaction(chargePointId, transactionId) {
    const ws = this.clients.get(chargePointId);
    if (ws) {
      const messageId = uuidv4();
      this.sendMessage(ws, [2, messageId, 'RemoteStopTransaction', {
        transactionId
      }]);
      return true;
    }
    return false;
  }

  async sendUnlockConnector(chargePointId, connectorId) {
    const ws = this.clients.get(chargePointId);
    if (ws) {
      const messageId = uuidv4();
      this.sendMessage(ws, [2, messageId, 'UnlockConnector', {
        connectorId
      }]);
      return true;
    }
    return false;
  }

  async sendReset(chargePointId, type = 'Soft') {
    const ws = this.clients.get(chargePointId);
    if (ws) {
      const messageId = uuidv4();
      this.sendMessage(ws, [2, messageId, 'Reset', {
        type
      }]);
      return true;
    }
    return false;
  }

  async sendReserveNow(chargePointId, connectorId, expiryDate, idTag, reservationId) {
    const ws = this.clients.get(chargePointId);
    if (ws) {
      const messageId = uuidv4();
      this.sendMessage(ws, [2, messageId, 'ReserveNow', {
        connectorId,
        expiryDate,
        idTag,
        reservationId
      }]);
      return true;
    }
    return false;
  }

  async sendCancelReservation(chargePointId, reservationId) {
    const ws = this.clients.get(chargePointId);
    if (ws) {
      const messageId = uuidv4();
      this.sendMessage(ws, [2, messageId, 'CancelReservation', {
        reservationId
      }]);
      return true;
    }
    return false;
  }
}

module.exports = OCPPServer;