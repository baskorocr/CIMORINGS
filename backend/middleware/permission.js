const { getConnection } = require('../config/database');

const getUserPermissions = async (user) => {
  try {
    const connection = getConnection();
    const permissions = new Set();
    
    // Get permissions from user_roles table (new system)
    const [rolePerms] = await connection.execute(`
      SELECT DISTINCT p.name 
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = ?
    `, [user.id]);
    
    rolePerms.forEach(perm => permissions.add(perm.name));
    
    // Get direct permissions
    const [directPerms] = await connection.execute(`
      SELECT p.name 
      FROM permissions p
      JOIN user_permissions up ON p.id = up.permission_id
      WHERE up.user_id = ?
    `, [user.id]);
    
    directPerms.forEach(perm => permissions.add(perm.name));
    
    return Array.from(permissions);
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
};

const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Use permissions from JWT token if available
      if (user.permissions && user.permissions.includes(requiredPermission)) {
        return next();
      }
      
      // Fallback: query database for permissions
      const userPermissions = await getUserPermissions(user);
      
      if (userPermissions.includes(requiredPermission)) {
        next();
      } else {
        console.log(`Permission denied for user ${user.username}: required ${requiredPermission}, has:`, userPermissions);
        res.status(403).json({ 
          message: 'Insufficient permissions',
          required: requiredPermission,
          userPermissions
        });
      }
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ message: 'Permission check failed', error: error.message });
    }
  };
};

module.exports = { checkPermission, getUserPermissions };