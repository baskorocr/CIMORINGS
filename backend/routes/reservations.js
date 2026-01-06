const express = require('express');
const router = express.Router();
const reserveController = require('../controllers/reserveController');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

// Get all reservations
router.get('/', authenticateToken, checkPermission('view_reservations'), reserveController.getReservations);

// Get reservation by ID
router.get('/:reservation_id', authenticateToken, checkPermission('view_reservations'), reserveController.getReservation);

// Create reservation (ReserveNow)
router.post('/', authenticateToken, checkPermission('manage_reservations'), reserveController.createReservation);

// Cancel reservation
router.delete('/:reservation_id', authenticateToken, checkPermission('manage_reservations'), reserveController.cancelReservation);

module.exports = router;
