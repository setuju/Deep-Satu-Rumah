import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import * as core from './deepterm-core.js';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 3000;
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || process.cwd();

async function safePath(reqPath) {
    const resolved = path.resolve(WORKSPACE_ROOT, reqPath);
    if (!resolved.startsWith(WORKSPACE_ROOT)) {
        throw new Error('Access denied: path outside workspace');
    }
    return resolved;
}

app.use(cors());
app.use(express.json());

// ------------------- Sesi Chat Endpoints -------------------
app.get('/sessions', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Missing token' });
    try {
        const data = await core.fetchAllChatSessions(token);
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/sessions', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Missing token' });
    try {
        const data = await core.createChatSession(token);
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/completion', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
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
        res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
    } finally {
        res.end();
    }
});

// ------------------- File System Endpoints -------------------
app.get('/file/list', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Missing token' });
    const dir = req.query.dir || '';
    try {
        const target = await safePath(dir);
        const entries = await fs.readdir(target, { withFileTypes: true });
        const items = entries.map(e => ({
            name: e.name,
            type: e.isDirectory() ? 'dir' : 'file',
            path: path.join(dir, e.name)
        }));
        res.json({ success: true, items });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/file/read', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Missing token' });
    const { path: filePath } = req.query;
    if (!filePath) return res.status(400).json({ error: 'Missing path' });
    try {
        const real = await safePath(filePath);
        const content = await fs.readFile(real, 'utf-8');
        res.json({ success: true, content });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/file/write', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Missing token' });
    const { path: filePath, content } = req.body;
    if (!filePath) return res.status(400).json({ error: 'Missing path' });
    try {
        const real = await safePath(filePath);
        await fs.mkdir(path.dirname(real), { recursive: true });
        await fs.writeFile(real, content || '', 'utf-8');
        res.json({ success: true, message: 'File written' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/file/edit', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Missing token' });
    const { path: filePath, old_str, new_str } = req.body;
    if (!filePath || old_str === undefined) {
        return res.status(400).json({ error: 'Missing path or old_str' });
    }
    try {
        const real = await safePath(filePath);
        let data = await fs.readFile(real, 'utf-8');
        if (!data.includes(old_str)) throw new Error('old_str not found');
        data = data.replace(old_str, new_str);
        await fs.writeFile(real, data, 'utf-8');
        res.json({ success: true, message: 'File edited' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/file/execute', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Missing token' });
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
        else throw new Error('Unsupported file type for execution');
        const { stdout, stderr } = await execAsync(command, { cwd: path.dirname(real) });
        res.json({ success: true, stdout, stderr });
    } catch (e) {
        res.json({ success: false, error: e.message, stdout: e.stdout || '', stderr: e.stderr || '' });
    }
});

app.post('/exec', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Missing token' });
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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 deepterm API server running on port ${PORT}`);
});
