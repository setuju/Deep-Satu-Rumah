import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'deepterm_jwt_secret_key_2026';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `${JWT_SECRET}_refresh`;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

// In-memory users and token revocation store
export const usersDb = new Map([
  ['admin', { id: 'usr_admin', username: 'admin', passwordHash: bcrypt.hashSync('deepterm2026', 10), role: 'admin' }]
]);
export const revokedTokens = new Set();
export const refreshTokensDb = new Map(); // token -> userId

export function generateToken(userId, username, role = 'user') {
  return jwt.sign(
    { sub: userId, username, role, type: 'access' },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

export function generateRefreshToken(userId, username) {
  const token = jwt.sign(
    { sub: userId, username, type: 'refresh' },
    REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
  refreshTokensDb.set(token, userId);
  return token;
}

export function verifyToken(token) {
  if (revokedTokens.has(token)) {
    throw new Error('Token has been revoked');
  }
  return jwt.verify(token, JWT_SECRET);
}

export function verifyRefreshToken(token) {
  if (!refreshTokensDb.has(token) || revokedTokens.has(token)) {
    throw new Error('Refresh token invalid or revoked');
  }
  return jwt.verify(token, REFRESH_SECRET);
}

export function revokeToken(token) {
  revokedTokens.add(token);
  refreshTokensDb.delete(token);
}

export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, 10);
}

export async function comparePassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}
