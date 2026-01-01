const { getConnection } = require('../config/database');

const getRoles = async (req, res) => {
  try {
    const connection = getConnection();
    
    const [roles] = await connection.execute(`
      SELECT r.*, 
             GROUP_CONCAT(p.name) as permissions,
             COUNT(ur.user_id) as user_count
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      LEFT JOIN user_roles ur ON r.id = ur.role_id
      GROUP BY r.id
      ORDER BY r.name
    `);
    
    const formattedRoles = roles.map(role => ({
      ...role,
      permissions: role.permissions ? role.permissions.split(',') : []
    }));
    
    res.json(formattedRoles);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createRole = async (req, res) => {
  try {
    const { name, display_name, description, permissions = [] } = req.body;
    const connection = getConnection();
    
    // Insert role
    const [result] = await connection.execute(
      'INSERT INTO roles (name, display_name, description) VALUES (?, ?, ?)',
      [name, display_name, description]
    );
    
    const roleId = result.insertId;
    
    // Assign permissions
    for (const permissionName of permissions) {
      const [permResult] = await connection.execute('SELECT id FROM permissions WHERE name = ?', [permissionName]);
      if (permResult.length > 0) {
        await connection.execute(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
          [roleId, permResult[0].id]
        );
      }
    }
    
    res.status(201).json({ message: 'Role created successfully', id: roleId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Role name already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { display_name, description, permissions = [] } = req.body;
    const connection = getConnection();
    
    // Update role
    await connection.execute(
      'UPDATE roles SET display_name = ?, description = ? WHERE id = ?',
      [display_name, description, id]
    );
    
    // Remove existing permissions
    await connection.execute('DELETE FROM role_permissions WHERE role_id = ?', [id]);
    
    // Assign new permissions
    for (const permissionName of permissions) {
      const [permResult] = await connection.execute('SELECT id FROM permissions WHERE name = ?', [permissionName]);
      if (permResult.length > 0) {
        await connection.execute(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
          [id, permResult[0].id]
        );
      }
    }
    
    res.json({ message: 'Role updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = getConnection();
    
    // Check if role is in use
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM user_roles WHERE role_id = ?', [id]);
    if (users[0].count > 0) {
      return res.status(400).json({ message: 'Cannot delete role that is assigned to users' });
    }
    
    await connection.execute('DELETE FROM roles WHERE id = ?', [id]);
    
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getPermissions = async (req, res) => {
  try {
    const connection = getConnection();
    
    const [permissions] = await connection.execute(`
      SELECT * FROM permissions 
      ORDER BY name
    `);
    
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createPermission = async (req, res) => {
  try {
    const { name, description } = req.body;
    const connection = getConnection();
    
    const [result] = await connection.execute(
      'INSERT INTO permissions (name, description) VALUES (?, ?)',
      [name, description]
    );
    
    res.status(201).json({ 
      message: 'Permission created successfully', 
      id: result.insertId 
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Permission already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deletePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = getConnection();
    
    // Check if permission is in use
    const [rolePerms] = await connection.execute('SELECT COUNT(*) as count FROM role_permissions WHERE permission_id = ?', [id]);
    const [userPerms] = await connection.execute('SELECT COUNT(*) as count FROM user_permissions WHERE permission_id = ?', [id]);
    
    if (rolePerms[0].count > 0 || userPerms[0].count > 0) {
      return res.status(400).json({ message: 'Cannot delete permission that is in use' });
    }
    
    await connection.execute('DELETE FROM permissions WHERE id = ?', [id]);
    
    res.json({ message: 'Permission deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getPermissions,
  createPermission,
  deletePermission
};