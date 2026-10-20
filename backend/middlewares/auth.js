const jwt = require('jsonwebtoken');
const db = require('../config/db');

exports.verifyToken = async (req, res, next) => {
  const token = req.headers['authorization'] || req.headers['x-access-token'];
  if (!token) {
    return res.status(403).json({ success: '0', msg: 'No token provided' });
  }

  try {
    const bearer = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;
    const decoded = jwt.verify(bearer, process.env.JWT_SECRET || 'lucky_matka_super_secret_jwt_key_99');

    if (decoded.phone && decoded.role !== 'admin') {
      const [users] = await db.query('SELECT status, betting_status, transfer_status FROM user_info WHERE phone = ?', [decoded.phone]);
      if (users.length > 0) {
        if (users[0].status === '0' || users[0].status === 0) {
          return res.status(401).json({
            success: '0',
            msg: 'Account Inactive! Contact Admin to activate your account.',
            is_inactive: true
          });
        }
        decoded.status = String(users[0].status ?? '1');
        decoded.betting_status = String(users[0].betting_status ?? '1');
        decoded.transfer_status = String(users[0].transfer_status ?? '1');
      }
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: '0', msg: 'Unauthorized: Invalid token' });
  }
};

exports.verifyAdmin = (req, res, next) => {
  const token = req.headers['authorization'] || req.headers['x-access-token'];
  if (!token) {
    return res.status(403).json({ success: '0', msg: 'No token provided' });
  }

  try {
    const bearer = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;
    const decoded = jwt.verify(bearer, process.env.JWT_SECRET || 'lucky_matka_super_secret_jwt_key_99');
    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: '0', msg: 'Require Admin Role' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: '0', msg: 'Admin session expired. Please login again.', expired: true });
    }
    return res.status(401).json({ success: '0', msg: 'Unauthorized: Invalid token' });
  }
};
