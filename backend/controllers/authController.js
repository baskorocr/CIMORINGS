const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/database');
const { getUserWithRolesAndPermissions } = require('./userController');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const connection = getConnection();
    
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Get user with roles and permissions
    const userWithPermissions = await getUserWithRolesAndPermissions(user.id);

    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        roles: userWithPermissions.roles,
        permissions: userWithPermissions.effective_permissions
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: userWithPermissions.roles,
        permissions: userWithPermissions.direct_permissions,
        effectivePermissions: userWithPermissions.effective_permissions
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const register = async (req, res) => {
  try {
    const { username, email, password, role = 'operator' } = req.body;
    const connection = getConnection();
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await connection.execute(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, role]
    );

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id; // From JWT middleware
    const { username, email, currentPassword, newPassword } = req.body;
    const connection = getConnection();
    
    // Get current user data
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Prepare update query
    let updateQuery = 'UPDATE users SET username = ?, email = ?';
    let updateParams = [username, email];

    // If new password is provided, hash it and include in update
    if (newPassword && newPassword.trim() !== '') {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updateQuery += ', password = ?';
      updateParams.push(hashedPassword);
    }

    updateQuery += ' WHERE id = ?';
    updateParams.push(userId);

    // Update user
    await connection.execute(updateQuery, updateParams);

    // Get updated user with roles and permissions
    const updatedUser = await getUserWithRolesAndPermissions(userId);

    // Generate new token with updated info
    const token = jwt.sign(
      { 
        id: userId, 
        username: username, 
        roles: updatedUser.roles,
        permissions: updatedUser.effective_permissions
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Profile updated successfully',
      token,
      user: {
        id: userId,
        username: username,
        email: email,
        roles: updatedUser.roles,
        permissions: updatedUser.direct_permissions,
        effectivePermissions: updatedUser.effective_permissions
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { login, register, updateProfile };