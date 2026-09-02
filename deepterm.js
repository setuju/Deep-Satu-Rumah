#!/usr/bin/env node

import readline from 'readline';
import readlinePrompt from 'readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { spawn } from 'child_process';
import fs from 'fs';
import * as core from './deepterm-core.js';
import fsPromises from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const args = process.argv.slice(2);
const TOKEN = process.env.DEEPSEEK_TOKEN;
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || process.cwd();

if (!TOKEN) {
  console.error('❌ Environment variable DEEPSEEK_TOKEN is not set.');
  console.error('   Please set it using: export DEEPSEEK_TOKEN="ey..." or in .env file');
  process.exit(1);
}

let promptArg = null;
let outputFile = null;
let interactive = false;
let asciiLogo = `
⠀⠀⠀⠀⠀⠀⠀⠀⠀⡀⠀⠀⠀⠀⠀⠀⠀⢀⣠⣴⣶⣾⣷⣶⣦⣄⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⣠⣾⡇⠀⠀⠀⠀⠀⢀⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣆⠀
⢀⣀⣀⣀⣠⣴⣾⣿⣿⠃⠀⠀⠀⣠⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡆
⠈⠻⢿⣿⣿⣿⡿⣟⠃⠀⣀⣴⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡧
⠀⠀⠀⠀⠈⠀⠀⢻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣼⣿⣿⣿⣿⣿⣿⠇
⠀⠀⠀⠀⠀⠀⠀⠈⠙⢻⠿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠟⠛⡙⠛⢛⡻⠋⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠁⠒⠄⠬⢉⣡⣠⣿⣿⣿⣇⡌⠲⠠⠋⠈⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⡿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠉⠁⠀DeepTerm
`;

let currentSessionTitle = 'unknown_session';

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '-p':
    case '--prompt':
      promptArg = args[++i];
      break;
    case '-i':
    case '--interactive':
      interactive = true;
      break;
    case '-o':
    case '--output':
      outputFile = args[++i];
      break;
    case '-h':
    case '--help':
      console.log(`Usage: deepterm [options]

Options:
  -p, --prompt "<text>"     Send one-shot prompt via CLI
  -i, --interactive         Start an interactive session
  -o, --output <file>       Save the response to a file
  -h, --help                Show this help message
`);
      process.exit(0);
  }
}

async function safePath(reqPath) {
    const resolved = path.resolve(WORKSPACE_ROOT, reqPath);
    if (!resolved.startsWith(WORKSPACE_ROOT)) throw new Error('Access denied');
    return resolved;
}

function parseQuotedArgs(inputStr) {
    const parsed = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < inputStr.length; i++) {
        const ch = inputStr[i];
        if (ch === '"' && (i === 0 || inputStr[i-1] !== '\\')) {
            inQuote = !inQuote;
        } else if (ch === ' ' && !inQuote) {
            if (current) parsed.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    if (current) parsed.push(current);
    return parsed;
}

async function executeFileCommand(cmd, cmdArgs) {
    try {
        if (cmd === 'list') {
            const dir = cmdArgs[0] || '.';
            const target = await safePath(dir);
            const entries = await fsPromises.readdir(target, { withFileTypes: true });
            return entries.map(e => `${e.isDirectory() ? '📁' : '📄'} ${e.name}`).join('\n');
        } else if (cmd === 'read') {
            if (!cmdArgs[0]) return 'Usage: /file read <path>';
            const target = await safePath(cmdArgs[0]);
            return await fsPromises.readFile(target, 'utf-8');
        } else if (cmd === 'write') {
            if (cmdArgs.length < 2) return 'Usage: /file write <path> <content>';
            const target = await safePath(cmdArgs[0]);
            const content = cmdArgs.slice(1).join(' ');
            await fsPromises.mkdir(path.dirname(target), { recursive: true });
            await fsPromises.writeFile(target, content, 'utf-8');
            return `File written: ${cmdArgs[0]}`;
        } else if (cmd === 'edit') {
            if (cmdArgs.length < 3) return 'Usage: /file edit <path> <old_str> <new_str>';
            const target = await safePath(cmdArgs[0]);
            const oldStr = cmdArgs[1];
            const newStr = cmdArgs.slice(2).join(' ');
            let data = await fsPromises.readFile(target, 'utf-8');
            if (!data.includes(oldStr)) return 'old_str not found';
            data = data.replace(oldStr, newStr);
            await fsPromises.writeFile(target, data, 'utf-8');
            return `File edited: ${cmdArgs[0]}`;
        } else if (cmd === 'exec') {
            if (cmdArgs.length < 1) return 'Usage: /exec <command> [args...]';
            const fullCommand = cmdArgs.join(' ');
            const { exec: runExec } = await import('child_process');
            return new Promise((resolve) => {
                runExec(fullCommand, { cwd: WORKSPACE_ROOT, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
                    if (error) {
                        resolve(`❌ Error (code ${error.code}):\n${stderr || error.message}\n${stdout ? 'STDOUT:\n' + stdout : ''}`);
                    } else {
                        resolve(`✅ Exit code 0\n${stdout}${stderr ? 'STDERR:\n' + stderr : ''}`);
                    }
                });
            });
        }
        return 'Unknown command. Use: list, read, write, edit, exec';
    } catch (err) {
        return `Error: ${err.message}`;
    }
}

function aiBannerPrompt() {
  const line = '━'.repeat(60);
  const banner = `
Type or paste your prompt below
[ESC] to send, [Ctrl+L] list, [Ctrl+D] delete, [Ctrl+E] export, [Ctrl+S] summarize, [Ctrl+B] menu
${line}
`;
  console.log(banner);
}

function displayWithPager(content, promptHint = '') {
  const lines = content.split('\n').length;
  const terminalHeight = process.stdout.rows || 24;

  const saveToFile = () => {
    try {
      const safeSession = currentSessionTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'session';
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
      
      let topicHint = '';
      if (promptHint) {
        topicHint = promptHint.replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '_').substring(0, 30).toLowerCase();
      }
      if (!topicHint) topicHint = 'response';
      
      const dirPath = `./saved_chats/${safeSession}/${dateStr}`;
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      const filePath = `${dirPath}/${timeStr}-${topicHint}.txt`;
      fs.writeFileSync(filePath, content);
      console.log(`\n💾 Response automatically saved to: ${filePath}`);
    } catch (err) {
      console.error(`\n⚠️ Gagal menyimpan file: ${err.message}`);
    }
  };

  if (lines > terminalHeight) {
    console.log('\n📖 Output is long. Opening in pager (less).');
    saveToFile();
    const less = spawn('less', ['-R'], { stdio: ['pipe', process.stdout, process.stderr] });
    less.stdin.write(content);
    less.stdin.end();
    return new Promise((resolve) => {
      less.on('close', resolve);
    });
  } else {
    process.stdout.write(content);
    return Promise.resolve();
  }
}

let statusMessage = '';
let statusInterval = null;

function startStatusAnimation() {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  statusInterval = setInterval(() => {
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(`\r${frames[i++ % frames.length]} ${statusMessage}`);
  }, 80);
}

function updateStatus(message) {
  statusMessage = message;
  if (!statusInterval) startStatusAnimation();
}

function stopStatusAnimation() {
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
    readline.cursorTo(process.stdout, 0);
    process.stdout.write('\r\x1b[K');
  }
}

export async function interactiveCLI(CHAT_SESSION_ID, LAST_CHAT_ID) {
  let buffer = [];
  let currentLine = '';
  let currentParentId = LAST_CHAT_ID ? parseInt(LAST_CHAT_ID, 10) : null;

  aiBannerPrompt();

  process.stdin.setRawMode(true);
  process.stdin.resume();
  readline.emitKeypressEvents(process.stdin);

  const keypressHandler = async (str, key) => {
    try {
      if (key.ctrl && key.name === 'l') {
        stopStatusAnimation();
        console.log('\n📋 Fetching session list...\n');
        try {
          const pages = await core.fetchAllChatSessions(TOKEN);
          const chats = pages?.data?.biz_data?.chat_sessions;
          if (Array.isArray(chats) && chats.length > 0) {
            console.log("💬 Available chat sessions:\n");
            chats.forEach((chat, i) => {
              const title = chat.title || "(untitled)";
              console.log(`  [${i + 1}] ${title}`);
            });
          } else {
            console.log('❌ No sessions found.');
          }
        } catch (e) {
          console.error('❌ Failed to fetch sessions:', e.message);
        }
        aiBannerPrompt();
        if (currentLine) process.stdout.write(currentLine);
        return;
      }

      if (key.ctrl && key.name === 'b') {
        stopStatusAnimation();
        console.log('\n🏠 Returning to session menu...\n');
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('keypress', keypressHandler);
        await runInteractiveMode();
        return;
      }

      if (key.name === 'return' || key.sequence === '\r') {
        buffer.push(currentLine);
        currentLine = '';
        process.stdout.write('\n');
      } else if (key.name === 'backspace') {
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
          process.stdout.write(currentLine);
        }
      } else if (key.name === 'escape') {
        buffer.push(currentLine);
        let prompt = buffer.join('\n').trim();
        currentLine = '';
        buffer = [];

        if (prompt) {
          if (prompt.startsWith('/file')) {
              const parts = prompt.split(/\s+/);
              const cmd = parts[1];
              const argsLine = parts.slice(2).join(' ');
              const cmdArgs = parseQuotedArgs(argsLine);
              const result = await executeFileCommand(cmd, cmdArgs);
              console.log(`\n${result}\n`);
              aiBannerPrompt();
              return;
          }
          if (prompt.startsWith('/exec')) {
              const parts = prompt.split(/\s+/);
              const cmdArgs = parts.slice(1);
              const result = await executeFileCommand('exec', cmdArgs);
              console.log(`\n${result}\n`);
              aiBannerPrompt();
              return;
          }

          console.log('\n\n🤖 Response:\n');
          updateStatus('Connecting...');

          let currentParent = currentParentId;
          const MAX_ITER = 5;

          for (let iter = 0; iter < MAX_ITER; iter++) {
            let thinkingText = '';
            let searchText = '';
            let answerText = '';
            let newParentId = currentParent;
            let toolCall = null;
            let fullResponse = '';

            for await (let token of core.completion(TOKEN, prompt, CHAT_SESSION_ID, currentParent, true, true, true)) {
              if (token.startsWith('__STATUS__:')) {
                const status = token.replace('__STATUS__:', '').trim();
                updateStatus(status);
                if (status.toLowerCase().includes('thinking')) thinkingText += status + '\n';
                else if (status.toLowerCase().includes('search')) searchText += status + '\n';
              } else if (token.startsWith('__MESSAGE_ID__:')) {
                newParentId = parseInt(token.replace('__MESSAGE_ID__:', '').trim(), 10);
              } else {
                if (statusInterval) { stopStatusAnimation(); statusInterval = null; }
                answerText += token;
                fullResponse += token;

                const match = fullResponse.match(/\[TOOL\]\s*(\{.*?\})/s);
                if (match) {
                  try {
                    toolCall = JSON.parse(match[1]);
                    break;
                  } catch (e) {}
                }
              }
            }

            if (toolCall) {
              const toolName = toolCall.tool;
              let result;
              if (toolName === 'read_file') {
                result = await executeFileCommand('read', [toolCall.path]);
              } else if (toolName === 'write_file') {
                result = await executeFileCommand('write', [toolCall.path, toolCall.content]);
              } else if (toolName === 'edit_file') {
                result = await executeFileCommand('edit', [toolCall.path, toolCall.old_str, toolCall.new_str]);
              } else if (toolName === 'run_shell') {
                result = await executeFileCommand('exec', [toolCall.command]);
              } else {
                result = `Unknown tool: ${toolName}`;
              }
              prompt = `[TOOL_RESULT] ${result}\n\nContinue your response.`;
              currentParent = newParentId;
              continue;
            }

            stopStatusAnimation();
            if (newParentId !== currentParentId) currentParentId = newParentId;

            if (thinkingText.trim()) {
              console.log('━'.repeat(60));
              console.log(thinkingText.trim());
            }
            if (searchText.trim()) {
              console.log('━'.repeat(60));
              console.log(searchText.trim());
            }
            if (answerText.trim()) {
              console.log('━'.repeat(60));
              console.log('Answer:\n');
              await displayWithPager(answerText, prompt.substring(0, 40));
            } else if (!thinkingText.trim() && !searchText.trim()) {
              console.log('⚠️ No response received.');
            }
            console.log('\n' + '━'.repeat(60) + '\n');
            break;
          }
        }
      } else if (key.ctrl && key.name === 'c') {
        stopStatusAnimation();
        console.log('\n👋 Exiting.\n');
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.exit();
      } else if (typeof str === 'string' && str !== '\u0000') {
        currentLine += str;
        process.stdout.write(str);
      }
    } catch (e) {
      stopStatusAnimation();
      console.error("❌ Error:", e.message);
    }
  };

  process.stdin.on('keypress', keypressHandler);
}

async function sendPrompt(promptText) {
  const session = await core.createChatSession(TOKEN);
  const chatId = session?.data?.biz_data?.id;
  const parentId = null;
  if (!chatId) { console.error('❌ Failed to create chat session.'); process.exit(1); }

  updateStatus('Connecting...');
  let thinkingText = '', searchText = '', answerText = '';
  for await (const token of core.completion(TOKEN, promptText, chatId, parentId, true, true, true)) {
    if (token.startsWith('__STATUS__:')) {
      const status = token.replace('__STATUS__:', '').trim();
      updateStatus(status);
      if (status.toLowerCase().includes('thinking')) thinkingText += status + '\n';
      else if (status.toLowerCase().includes('search')) searchText += status + '\n';
    } else if (!token.startsWith('__MESSAGE_ID__:')) {
      if (statusInterval) { stopStatusAnimation(); statusInterval = null; }
      answerText += token;
    }
  }
  stopStatusAnimation();

  if (thinkingText.trim()) { console.log('━'.repeat(60)); console.log(thinkingText.trim()); }
  if (searchText.trim()) { console.log('━'.repeat(60)); console.log(searchText.trim()); }
  if (answerText.trim()) {
    console.log('━'.repeat(60) + '\nAnswer:\n');
    if (outputFile) {
      fs.writeFileSync(outputFile, answerText);
      console.log(`✅ Response saved to ${outputFile}`);
    } else {
      await displayWithPager(answerText, promptText.substring(0, 40));
    }
  } else if (!thinkingText.trim() && !searchText.trim()) {
    console.log('⚠️ No response received.');
  }
}

async function runInteractiveMode() {
  console.clear();
  console.log(`${asciiLogo}\n`);
  let profile;
  try { profile = await core.getCurrentProfile(TOKEN); } catch (e) { console.error('❌ Gagal mengambil profil:', e.message); return; }
  if (!profile || typeof profile !== "object") {
    console.log('❌ Gagal mengambil profil pengguna. Token mungkin tidak valid atau kedaluwarsa.');
    return;
  }
  const email = profile?.data?.biz_data?.email || 'unknown';
  console.log(`Logged in as: ${email}\n`);
  
  let pages;
  try { pages = await core.fetchAllChatSessions(TOKEN); } catch (e) { console.error('❌ Gagal mengambil sesi chat:', e.message); return; }
  const chats = pages?.data?.biz_data?.chat_sessions;
  if (!Array.isArray(chats) || chats.length === 0) { console.log('❌ Tidak ada sesi chat yang ditemukan.'); return; }

  console.log("💬 Sesi chat yang tersedia:\n");
  chats.forEach((chat, i) => { const title = chat.title || "(tanpa judul)"; console.log(`[${i + 1}] ${title}`); });
  console.log('[+] Mulai sesi chat baru');

  const rl = readlinePrompt.createInterface({ input, output });
  let ans;
  try { ans = await rl.question("\n➡️ Pilih sesi atau ketik + untuk membuat baru:  "); } catch { return; }
  rl.close();

  if (ans === '+') {
    const newChat = await core.createChatSession(TOKEN);
    const newChatId = newChat?.data?.biz_data?.id;
    if (!newChatId) { console.log('❌ Gagal membuat sesi baru.'); return; }
    console.clear();
    console.log(`${asciiLogo}\n\n✅ Sesi baru dimulai.`);
    currentSessionTitle = 'new_session_' + newChatId.substring(0, 8);
    await interactiveCLI(newChatId, null);
  } else {
    const idx = parseInt(ans.trim(), 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= chats.length) { console.log("❌ Pilihan tidak valid."); return; }
    const selectedChat = chats[idx];
    console.clear();
    console.log(`${asciiLogo}\n\n✅ Menggunakan sesi: ${selectedChat.title}`);
    currentSessionTitle = selectedChat.title || 'untitled';
    await interactiveCLI(selectedChat.id, null);
  }
}

(async () => {
  if (interactive || (!promptArg && process.stdin.isTTY)) {
    await runInteractiveMode();
  } else if (promptArg) {
    let finalPrompt = promptArg;
    if (!process.stdin.isTTY) {
      let inputText = '';
      for await (const chunk of process.stdin) inputText += chunk;
      finalPrompt += '\n\n' + inputText.trim();
    }
    await sendPrompt(finalPrompt);
  } else {
    let piped = '';
    for await (const chunk of process.stdin) piped += chunk;
    await sendPrompt(piped.trim());
  }
})();
