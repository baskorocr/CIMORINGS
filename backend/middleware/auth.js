const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get fresh user data from database
    const connection = getConnection();
    const [users] = await connection.execute(
      'SELECT id, username, email, roles, permissions FROM users WHERE id = ?',
      [decoded.id]
    );
    
    if (users.length === 0) {
      return res.status(403).json({ message: 'User not found' });
    }
    
    const user = users[0];
    user.roles = Array.isArray(user.roles) ? user.roles : (user.roles ? JSON.parse(user.roles) : []);
    user.permissions = Array.isArray(user.permissions) ? user.permissions : (user.permissions ? JSON.parse(user.permissions) : []);
    
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user.roles || (!req.user.roles.includes('admin') && !req.user.roles.includes('super-admin'))) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

module.exports = { authenticateToken, requireAdmin };