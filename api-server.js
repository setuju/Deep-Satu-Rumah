import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import morgan from 'morgan';
import * as core from './deepterm-core.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import logger from './logger.js';
import {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  revokeToken,
  usersDb,
  hashPassword,
  comparePassword
} from './auth.js';
import { authenticate, optionalAuth } from './middleware/auth.js';
import { notFoundHandler, globalErrorHandler, AppError } from './middleware/errorHandler.js';

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 3000;
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || process.cwd();

async function safePath(reqPath) {
  const resolved = path.resolve(WORKSPACE_ROOT, reqPath || '');
  if (!resolved.startsWith(WORKSPACE_ROOT)) {
    throw new AppError('Access denied: path outside workspace', 403);
  }
  return resolved;
}

// Global Middlewares
app.use(cors());
app.use(express.json());

// Morgan HTTP request logging integrated with Winston
app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms', {
    stream: {
      write: (message) => logger.info(message.trim(), { category: 'http-access' })
    }
  })
);

// Tracing request ID middleware
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'deepterm-api',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ------------------- Authentication Routes (JWT) -------------------
app.post('/auth/register', async (req, res, next) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) {
      throw new AppError('Username and password are required', 400);
    }
    if (usersDb.has(username)) {
      throw new AppError('Username already exists', 409);
    }

    const passwordHash = await hashPassword(password);
    const userId = `usr_${Date.now()}`;
    const newUser = { id: userId, username, passwordHash, role: role || 'user' };
    usersDb.set(username, newUser);

    const accessToken = generateToken(userId, username, newUser.role);
    const refreshToken = generateRefreshToken(userId, username);

    logger.info('User registered successfully', { username, userId });
    res.status(201).json({
      success: true,
      message: 'User registered',
      user: { id: userId, username, role: newUser.role },
      accessToken,
      refreshToken
    });
  } catch (err) {
    next(err);
  }
});

app.post('/auth/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      throw new AppError('Username and password are required', 400);
    }

    const user = usersDb.get(username);
    if (!user) {
      throw new AppError('Invalid username or password', 401);
    }

    const match = await comparePassword(password, user.passwordHash);
    if (!match) {
      throw new AppError('Invalid username or password', 401);
    }

    const accessToken = generateToken(user.id, user.username, user.role);
    const refreshToken = generateRefreshToken(user.id, user.username);

    logger.info('User login successful', { username: user.username, userId: user.id });
    res.json({
      success: true,
      user: { id: user.id, username: user.username, role: user.role },
      accessToken,
      refreshToken
    });
  } catch (err) {
    next(err);
  }
});

app.post('/auth/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new AppError('Refresh token required', 400);
    }

    const decoded = verifyRefreshToken(refreshToken);
    const newAccessToken = generateToken(decoded.sub, decoded.username);

    res.json({
      success: true,
      accessToken: newAccessToken
    });
  } catch (err) {
    next(new AppError('Invalid or expired refresh token', 401));
  }
});

app.post('/auth/logout', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    revokeToken(token);
  }
  const { refreshToken } = req.body;
  if (refreshToken) {
    revokeToken(refreshToken);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// ------------------- DeepSeek Chat Endpoints -------------------
app.get('/auth/verify', async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || process.env.DEEPSEEK_TOKEN;
  if (!token) return res.status(401).json({ success: false, error: 'Missing token' });
  try {
    const data = await core.getCurrentProfile(token);
    if (data && (data.code === 0 || data.data)) {
      res.json({ success: true, profile: data.data || data });
    } else if (data && data.msg) {
      res.status(400).json({ success: false, error: data.msg });
    } else {
      res.status(400).json({ success: false, error: 'Invalid token or unauthorized' });
    }
  } catch (e) {
    next(e);
  }
});

app.get('/sessions', async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || process.env.DEEPSEEK_TOKEN;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const data = await core.fetchAllChatSessions(token);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

app.post('/sessions', async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || process.env.DEEPSEEK_TOKEN;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const data = await core.createChatSession(token);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

app.delete('/sessions/:id', async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || process.env.DEEPSEEK_TOKEN;
  const { id } = req.params;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    res.json({ success: true, message: `Session ${id} deleted` });
  } catch (e) {
    next(e);
  }
});

app.post('/completion', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1] || process.env.DEEPSEEK_TOKEN;
  const { prompt, chat_session_id, parent_message_id } = req.body;
  if (!token || !prompt || !chat_session_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    for await (const tokenChunk of core.completion(token, prompt, chat_session_id, parent_message_id, true, true, true)) {
      res.write(`data: ${JSON.stringify({ token: tokenChunk })}\n\n`);
    }
  } catch (e) {
    logger.error('Completion stream error', { message: e.message });
    res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
  } finally {
    res.end();
  }
});

// ------------------- File System Endpoints -------------------
app.get('/file/list', async (req, res, next) => {
  const dir = req.query.dir || '';
  try {
    const target = await safePath(dir);
    const entries = await fs.readdir(target, { withFileTypes: true });
    const items = entries.map((e) => ({
      name: e.name,
      type: e.isDirectory() ? 'dir' : 'file',
      path: path.join(dir, e.name)
    }));
    res.json({ success: true, items });
  } catch (e) {
    next(e);
  }
});

app.get('/file/read', async (req, res, next) => {
  const { path: filePath } = req.query;
  if (!filePath) return res.status(400).json({ error: 'Missing path' });
  try {
    const real = await safePath(filePath);
    const content = await fs.readFile(real, 'utf-8');
    res.json({ success: true, content });
  } catch (e) {
    next(e);
  }
});

app.post('/file/write', async (req, res, next) => {
  const { path: filePath, content } = req.body;
  if (!filePath) return res.status(400).json({ error: 'Missing path' });
  try {
    const real = await safePath(filePath);
    await fs.mkdir(path.dirname(real), { recursive: true });
    await fs.writeFile(real, content || '', 'utf-8');
    res.json({ success: true, message: 'File written' });
  } catch (e) {
    next(e);
  }
});

app.post('/file/edit', async (req, res, next) => {
  const { path: filePath, old_str, new_str } = req.body;
  if (!filePath || old_str === undefined) {
    return res.status(400).json({ error: 'Missing path or old_str' });
  }
  try {
    const real = await safePath(filePath);
    let data = await fs.readFile(real, 'utf-8');
    if (!data.includes(old_str)) throw new AppError('old_str not found in file', 400);
    data = data.replace(old_str, new_str);
    await fs.writeFile(real, data, 'utf-8');
    res.json({ success: true, message: 'File edited' });
  } catch (e) {
    next(e);
  }
});

app.post('/file/execute', async (req, res) => {
  const { path: filePath, args = [] } = req.body;
  if (!filePath) return res.status(400).json({ error: 'Missing path' });
  try {
    const real = await safePath(filePath);
    const ext = path.extname(real).toLowerCase();
    let command = '';
    if (ext === '.py') command = `python3 "${real}" ${args.join(' ')}`;
    else if (ext === '.js') command = `node "${real}" ${args.join(' ')}`;
    else if (ext === '.sh') command = `bash "${real}" ${args.join(' ')}`;
    else if (ext === '.php') command = `php "${real}" ${args.join(' ')}`;
    else throw new AppError('Unsupported file type for execution', 400);

    const { stdout, stderr } = await execAsync(command, { cwd: path.dirname(real) });
    res.json({ success: true, stdout, stderr });
  } catch (e) {
    res.json({ success: false, error: e.message, stdout: e.stdout || '', stderr: e.stderr || '' });
  }
});

app.post('/exec', async (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: 'Missing command' });
  exec(command, { cwd: WORKSPACE_ROOT, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
    if (error) {
      res.json({ success: false, error: error.message, stderr, stdout });
    } else {
      res.json({ success: true, stdout, stderr });
    }
  });
});

// Centralized error handling
app.use(notFoundHandler);
app.use(globalErrorHandler);

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 DeepTerm API server running on port ${PORT}`, {
    port: PORT,
    workspace: WORKSPACE_ROOT
  });
});
