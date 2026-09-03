import { verifyToken } from '../auth.js';
import logger from '../logger.js';

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authorization token required (Bearer <token>)'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    logger.warn('Token authentication failed', { message: err.message, ip: req.ip });
    return res.status(401).json({
      success: false,
      error: 'Invalid, expired, or revoked token: ' + err.message
    });
  }
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = verifyToken(token);
    } catch {
      // Ignored for optional
    }
  }
  next();
}
