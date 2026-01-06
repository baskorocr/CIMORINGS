const bcrypt = require('bcryptjs');
const { getConnection } = require('../config/database');

const getUserWithRolesAndPermissions = async (userId) => {
  const connection = getConnection();
  
  // Get user with roles and permissions
  const [users] = await connection.execute(`
    SELECT u.id, u.username, u.email, u.created_at,
           GROUP_CONCAT(DISTINCT r.name) as roles,
           GROUP_CONCAT(DISTINCT p1.name) as role_permissions,
           GROUP_CONCAT(DISTINCT p2.name) as direct_permissions
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    LEFT JOIN role_permissions rp ON r.id = rp.role_id
    LEFT JOIN permissions p1 ON rp.permission_id = p1.id
    LEFT JOIN user_permissions up ON u.id = up.user_id
    LEFT JOIN permissions p2 ON up.permission_id = p2.id
    WHERE u.id = ?
    GROUP BY u.id
  `, [userId]);
  
  if (users.length === 0) return null;
  
  const user = users[0];
  return {
    ...user,
    roles: user.roles ? user.roles.split(',') : [],
    role_permissions: user.role_permissions ? user.role_permissions.split(',') : [],
    direct_permissions: user.direct_permissions ? user.direct_permissions.split(',') : [],
    effective_permissions: [...new Set([
      ...(user.role_permissions ? user.role_permissions.split(',') : []),
      ...(user.direct_permissions ? user.direct_permissions.split(',') : [])
    ])]
  };
};

const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const connection = getConnection();
    
    if (!connection) {
      return res.status(500).json({ message: 'Database connection not available' });
    }
    
    // Get users with their roles from user_roles table
    const [users] = await connection.execute(
      `SELECT u.id, u.username, u.email, u.created_at,
             GROUP_CONCAT(DISTINCT r.name) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      GROUP BY u.id
      ORDER BY u.id
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`
    );
    
    const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM users');
    const total = countResult[0].total;
    
    const parsedUsers = users.map(user => ({
      ...user,
      roles: user.roles ? user.roles.split(',') : []
    }));
    
    res.json({
      data: parsedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('getUsers error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { username, email, password, roles = ['operator'] } = req.body;
    const connection = getConnection();
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert user without roles/permissions columns
    const [result] = await connection.execute(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );
    
    const userId = result.insertId;
    
    // Assign roles
    for (const roleName of roles) {
      const [roleResult] = await connection.execute('SELECT id FROM roles WHERE name = ?', [roleName]);
      if (roleResult.length > 0) {
        await connection.execute(
          'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
          [userId, roleResult[0].id]
        );
      }
    }
    
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, password, roles } = req.body;
    const connection = getConnection();
    
    console.log('Update user request:', { id, username, email, hasPassword: !!password, roles });
    
    // Prepare update query based on whether password is provided
    let updateQuery = 'UPDATE users SET username = ?, email = ?';
    let updateParams = [username, email];
    
    // If password is provided, hash it and include in update
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += ', password = ?';
      updateParams.push(hashedPassword);
      console.log('Password will be updated for user', id);
    }
    
    updateQuery += ' WHERE id = ?';
    updateParams.push(id);
    
    // Update user basic info (and password if provided)
    await connection.execute(updateQuery, updateParams);
    
    // Only update roles if explicitly provided in request
    if (roles && Array.isArray(roles)) {
      console.log('Updating roles for user', id, 'to:', roles);
      
      // Remove existing roles
      await connection.execute('DELETE FROM user_roles WHERE user_id = ?', [id]);
      
      // Assign new roles
      for (const roleName of roles) {
        const [roleResult] = await connection.execute('SELECT id FROM roles WHERE name = ?', [roleName]);
        if (roleResult.length > 0) {
          await connection.execute(
            'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
            [id, roleResult[0].id]
          );
          console.log('Assigned role', roleName, 'to user', id);
        } else {
          console.log('Role not found:', roleName);
        }
      }
    } else {
      console.log('No roles provided or roles is not an array');
    }
    
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = getConnection();
    
    await connection.execute('DELETE FROM users WHERE id = ?', [id]);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const assignRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { roles } = req.body;
    const connection = getConnection();
    
    // Remove existing roles
    await connection.execute('DELETE FROM user_roles WHERE user_id = ?', [userId]);
    
    // Assign new roles
    for (const roleName of roles) {
      const [roleResult] = await connection.execute('SELECT id FROM roles WHERE name = ?', [roleName]);
      if (roleResult.length > 0) {
        await connection.execute(
          'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
          [userId, roleResult[0].id]
        );
      }
    }
    
    res.json({ message: 'Roles assigned successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const revokeRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { roles } = req.body;
    const connection = getConnection();
    
    // Remove specific roles
    for (const roleName of roles) {
      const [roleResult] = await connection.execute('SELECT id FROM roles WHERE name = ?', [roleName]);
      if (roleResult.length > 0) {
        await connection.execute(
          'DELETE FROM user_roles WHERE user_id = ? AND role_id = ?',
          [userId, roleResult[0].id]
        );
      }
    }
    
    res.json({ message: 'Roles revoked successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const givePermission = async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissions } = req.body;
    const connection = getConnection();
    
    // Remove existing direct permissions
    await connection.execute('DELETE FROM user_permissions WHERE user_id = ?', [userId]);
    
    // Assign new permissions
    for (const permissionName of permissions) {
      const [permResult] = await connection.execute('SELECT id FROM permissions WHERE name = ?', [permissionName]);
      if (permResult.length > 0) {
        await connection.execute(
          'INSERT INTO user_permissions (user_id, permission_id) VALUES (?, ?)',
          [userId, permResult[0].id]
        );
      }
    }
    
    res.json({ message: 'Permissions granted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const revokePermission = async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissions } = req.body;
    const connection = getConnection();
    
    // Remove specific permissions
    for (const permissionName of permissions) {
      const [permResult] = await connection.execute('SELECT id FROM permissions WHERE name = ?', [permissionName]);
      if (permResult.length > 0) {
        await connection.execute(
          'DELETE FROM user_permissions WHERE user_id = ? AND permission_id = ?',
          [userId, permResult[0].id]
        );
      }
    }
    
    res.json({ message: 'Permissions revoked successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  assignRole,
  revokeRole,
  givePermission,
  revokePermission,
  getUserWithRolesAndPermissions
};