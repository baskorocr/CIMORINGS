const { getConnection } = require('../config/database');

const reserveController = {
  // Get all reservations
  async getReservations(req, res) {
    try {
      const { page = 1, limit = 10, status, station_id } = req.query;
      const offset = (page - 1) * limit;
      
      let whereClause = '1=1';
      const params = [];
      
      if (status) {
        whereClause += ' AND r.status = ?';
        params.push(status);
      }
      
      if (station_id) {
        whereClause += ' AND r.charging_station_id = ?';
        params.push(station_id);
      }
      
      const query = `
        SELECT r.*, cs.name as station_name, cs.charge_point_id, cs.location,
               u.username as reserved_by
        FROM reservations r
        JOIN charging_stations cs ON r.charging_station_id = cs.id
        LEFT JOIN users u ON r.user_id = u.id
        WHERE ${whereClause}
        ORDER BY r.created_at DESC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;
      
      const countQuery = `
        SELECT COUNT(*) as total
        FROM reservations r
        WHERE ${whereClause}
      `;
      
      const connection = getConnection();
      const [reservations] = await connection.execute(query, params);
      const [countResult] = await connection.execute(countQuery, params);
      
      res.json({
        reservations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limit)
        }
      });
    } catch (error) {
      console.error('Get reservations error:', error);
      res.status(500).json({ error: 'Failed to get reservations' });
    }
  },

  // Create reservation (User Booking)
  async createReservation(req, res) {
    try {
      const { charging_station_id, connector_id, id_tag, phone_number, expiry_minutes = 60 } = req.body;
      const user_id = req.user.id; // From JWT token
      
      // Validate required fields
      if (!charging_station_id || connector_id === undefined || !id_tag || !phone_number) {
        return res.status(400).json({ error: 'Missing required fields: charging_station_id, connector_id, id_tag, phone_number' });
      }
      
      // Validate connector_id (must be >= 0)
      if (connector_id < 0) {
        return res.status(400).json({ error: 'connector_id must be 0 or greater' });
      }
      
      const connection = getConnection();
      
      // Get user info from database
      const [users] = await connection.execute(
        'SELECT username, email FROM users WHERE id = ?',
        [user_id]
      );
      
      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const user_name = users[0].username;
      
      // Check if station exists
      const [stations] = await connection.execute(
        'SELECT * FROM charging_stations WHERE id = ?',
        [charging_station_id]
      );
      
      if (stations.length === 0) {
        return res.status(404).json({ error: 'Station not found' });
      }
      
      // Check if connector is available
      const [connectors] = await connection.execute(
        'SELECT * FROM connectors WHERE charging_station_id = ? AND connector_id = ?',
        [charging_station_id, connector_id]
      );
      
      if (connectors.length === 0) {
        return res.status(404).json({ error: 'Connector not found' });
      }
      
      if (connectors[0].status !== 'Available') {
        return res.status(400).json({ error: 'Connector not available for reservation' });
      }
      
      // Check for existing active reservations on this connector
      const [existingReservations] = await connection.execute(
        'SELECT * FROM reservations WHERE charging_station_id = ? AND connector_id = ? AND status = "Active" AND expiry_date > NOW()',
        [charging_station_id, connector_id]
      );
      
      if (existingReservations.length > 0) {
        return res.status(400).json({ error: 'Connector already reserved' });
      }
      
      // Generate unique reservation ID
      const reservation_id = Math.floor(Math.random() * 1000000) + 1;
      const expiry_date = new Date(Date.now() + expiry_minutes * 60 * 1000);
      
      // Create reservation
      await connection.execute(
        'INSERT INTO reservations (reservation_id, charging_station_id, connector_id, user_id, user_name, phone_number, id_tag, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [reservation_id, charging_station_id, connector_id, user_id, user_name, phone_number, id_tag, expiry_date]
      );
      
      // Update connector status to Reserved
      await connection.execute(
        'UPDATE connectors SET status = "Reserved" WHERE charging_station_id = ? AND connector_id = ?',
        [charging_station_id, connector_id]
      );
      
      // Send OCPP ReserveNow command to station
      const ocppServer = global.ocppServer;
      const station = stations[0];
      
      if (ocppServer && ocppServer.clients.has(station.charge_point_id)) {
        try {
          const success = await ocppServer.sendReserveNow(
            station.charge_point_id,
            connector_id,
            expiry_date.toISOString(),
            id_tag,
            reservation_id
          );
          console.log('ReserveNow sent:', success);
        } catch (ocppError) {
          console.error('OCPP ReserveNow error:', ocppError);
        }
      }
      
      res.json({
        message: 'Booking created successfully',
        reservation_id,
        user_name,
        phone_number,
        expiry_date
      });
    } catch (error) {
      console.error('Create reservation error:', error);
      res.status(500).json({ error: 'Failed to create reservation' });
    }
  },

  // Cancel reservation
  async cancelReservation(req, res) {
    try {
      const { reservation_id } = req.params;
      const connection = getConnection();
      
      // Get reservation details
      const [reservations] = await connection.execute(
        'SELECT r.*, cs.charge_point_id FROM reservations r JOIN charging_stations cs ON r.charging_station_id = cs.id WHERE r.reservation_id = ? AND r.status = "Active"',
        [reservation_id]
      );
      
      if (reservations.length === 0) {
        return res.status(404).json({ error: 'Active reservation not found' });
      }
      
      const reservation = reservations[0];
      
      // Update reservation status
      await connection.execute(
        'UPDATE reservations SET status = "Cancelled" WHERE reservation_id = ?',
        [reservation_id]
      );
      
      // Update connector status back to Available
      await connection.execute(
        'UPDATE connectors SET status = "Available" WHERE charging_station_id = ? AND connector_id = ?',
        [reservation.charging_station_id, reservation.connector_id]
      );
      
      // Send OCPP CancelReservation command
      const ocppServer = global.ocppServer;
      
      if (ocppServer && ocppServer.clients.has(reservation.charge_point_id)) {
        try {
          const success = await ocppServer.sendCancelReservation(reservation.charge_point_id, parseInt(reservation_id));
          if (!success) {
            console.log('CancelReservation rejected by station, but reservation cancelled in CSMS');
          }
        } catch (ocppError) {
          console.error('OCPP CancelReservation error:', ocppError);
          // Continue anyway - reservation is cancelled in CSMS
        }
      }
      
      res.json({ 
        message: 'Reservation cancelled successfully',
        note: 'Station may have rejected the command, but reservation is cancelled in system'
      });
    } catch (error) {
      console.error('Cancel reservation error:', error);
      res.status(500).json({ error: 'Failed to cancel reservation' });
    }
  },

  // Get reservation by ID
  async getReservation(req, res) {
    try {
      const { reservation_id } = req.params;
      const connection = getConnection();
      
      const [reservations] = await connection.execute(
        'SELECT r.*, cs.name as station_name, cs.charge_point_id FROM reservations r JOIN charging_stations cs ON r.charging_station_id = cs.id WHERE r.reservation_id = ?',
        [reservation_id]
      );
      
      if (reservations.length === 0) {
        return res.status(404).json({ error: 'Reservation not found' });
      }
      
      res.json(reservations[0]);
    } catch (error) {
      console.error('Get reservation error:', error);
      res.status(500).json({ error: 'Failed to get reservation' });
    }
  },

  // Cleanup expired reservations (cron job)
  async cleanupExpiredReservations() {
    try {
      const connection = getConnection();
      
      // Get expired reservations
      const [expiredReservations] = await connection.execute(
        'SELECT r.*, cs.charge_point_id FROM reservations r JOIN charging_stations cs ON r.charging_station_id = cs.id WHERE r.status = "Active" AND r.expiry_date < NOW()'
      );
      
      for (const reservation of expiredReservations) {
        // Update reservation status
        await connection.execute(
          'UPDATE reservations SET status = "Expired" WHERE id = ?',
          [reservation.id]
        );
        
        // Update connector status back to Available
        await connection.execute(
          'UPDATE connectors SET status = "Available" WHERE charging_station_id = ? AND connector_id = ?',
          [reservation.charging_station_id, reservation.connector_id]
        );
        
        console.log(`Expired reservation ${reservation.reservation_id} cleaned up`);
      }
      
      return expiredReservations.length;
    } catch (error) {
      console.error('Cleanup expired reservations error:', error);
      return 0;
    }
  }
};

module.exports = reserveController;
