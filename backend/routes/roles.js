const express = require('express');
const {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getPermissions,
  createPermission,
  deletePermission
} = require('../controllers/roleController');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Role management routes
router.get('/', checkPermission('users.view'), getRoles);
router.post('/', checkPermission('users.create'), createRole);
router.put('/:id', checkPermission('users.edit'), updateRole);
router.delete('/:id', checkPermission('users.delete'), deleteRole);

// Permission routes
router.get('/permissions', checkPermission('users.view'), getPermissions);
router.post('/permissions', checkPermission('users.create'), createPermission);
router.delete('/permissions/:id', checkPermission('users.delete'), deletePermission);

module.exports = router;