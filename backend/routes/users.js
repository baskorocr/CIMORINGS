const express = require('express');
const {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  assignRole,
  revokeRole,
  givePermission,
  revokePermission
} = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// User management routes with permission checks
router.get('/', checkPermission('users.view'), getUsers);
router.post('/', checkPermission('users.create'), createUser);
router.put('/:id', checkPermission('users.edit'), updateUser);
router.delete('/:id', checkPermission('users.delete'), deleteUser);

// Role management routes
router.post('/:userId/roles', checkPermission('users.edit'), assignRole);
router.delete('/:userId/roles', checkPermission('users.edit'), revokeRole);

// Permission management routes
router.post('/:userId/permissions', checkPermission('users.edit'), givePermission);
router.delete('/:userId/permissions', checkPermission('users.edit'), revokePermission);

module.exports = router;