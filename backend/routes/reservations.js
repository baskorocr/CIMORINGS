const express = require('express');
const router = express.Router();
const reserveController = require('../controllers/reserveController');
const { authenticateToken } = require('../middleware/auth');

// Get all reservations
router.get('/', authenticateToken, reserveController.getReservations);

// Get reservation by ID
router.get('/:reservation_id', authenticateToken, reserveController.getReservation);

// Create reservation (ReserveNow)
router.post('/', authenticateToken, reserveController.createReservation);

// Cancel reservation
router.delete('/:reservation_id', authenticateToken, reserveController.cancelReservation);

module.exports = router;
