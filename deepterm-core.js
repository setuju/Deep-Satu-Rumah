import fs from 'fs';
import { Buffer } from 'buffer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import path from 'path';
import FormData from 'form-data';

const wasmFile = './deepseek.wasm';
const __dirname = dirname(fileURLToPath(import.meta.url));
const wasmPath = join(__dirname, wasmFile);
const wasmBytes = fs.readFileSync(wasmPath);
let wasmInstance, wasmExports, memory, malloc, stack_ptr;

// Debug flag - set to true if you need verbose logs
const DEBUG = false;

async function initWasm() {
    if (wasmInstance) return;
    const { instance } = await WebAssembly.instantiate(wasmBytes, {});
    wasmInstance = instance;
    wasmExports = instance.exports;
    memory = wasmExports.memory;
    malloc = wasmExports.__wbindgen_export_0;
    stack_ptr = wasmExports.__wbindgen_add_to_stack_pointer(-16);
}

function alloc_utf8(str) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    const ptr = malloc(bytes.length, 1);
    const view = new Uint8Array(memory.buffer, ptr, bytes.length);
    view.set(bytes);
    return [ptr, bytes.length];
}

// Memecahkan Proof-of-Work menggunakan WebAssembly
export async function solvePow(challenge, salt, expireAt, difficulty) {
    await initWasm();
    const prefix = `${salt}_${expireAt}_`;
    const [challengePtr, challengeLen] = alloc_utf8(challenge);
    const [prefixPtr, prefixLen] = alloc_utf8(prefix);

    wasmExports.wasm_solve(
        stack_ptr,
        challengePtr,
        challengeLen,
        prefixPtr,
        prefixLen,
        difficulty
    );

    const view = new DataView(memory.buffer, stack_ptr, 16);
    const found = view.getInt32(0, true);
    const answer = view.getFloat64(8, true);

    if (found === 0) {
        if (DEBUG) console.error(`[PoW] solvePow failed: no solution found.`);
        throw new Error("POW not found");
    }
    if (DEBUG) console.error(`[PoW] solvePow success: answer=${Math.floor(answer)}`);
    return Math.floor(answer);
}

// Headers standar untuk permintaan ke API DeepSeek
function headers(TOKEN) {
    return {
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'authorization': `Bearer ${TOKEN}`,
        'priority': 'u=1, i',
        'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Brave";v="138"',
        'sec-ch-ua-arch': '"x86"',
        'sec-ch-ua-bitness': '"64"',
        'sec-ch-ua-full-version-list': '"Not)A;Brand";v="8.0.0.0", "Chromium";v="138.0.0.0", "Brave";v="138.0.0.0"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-model': '""',
        'sec-ch-ua-platform': '"Windows"',
        'sec-ch-ua-platform-version': '"19.0.0"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'sec-gpc': '1',
        'x-app-version': '20241129.1',
        'x-client-locale': 'en_US',
        'x-client-platform': 'web',
        'x-client-version': '1.3.0-auto-resume'
    };
}

export async function getCurrentProfile(TOKEN) {
    const response = await fetch("https://chat.deepseek.com/api/v0/users/current", {
        headers: headers(TOKEN),
        referrer: "https://chat.deepseek.com/",
        credentials: "include"
    });
    try { return await response.json(); } catch { return; }
}

export async function createChatSession(TOKEN) {
    const response = await fetch("https://chat.deepseek.com/api/v0/chat_session/create", {
        method: "POST",
        headers: { ...headers(TOKEN), 'content-type': 'application/json' },
        referrer: "https://chat.deepseek.com/",
        body: JSON.stringify({ character_id: null }),
        credentials: "include"
    });
    try { return await response.json(); } catch { return; }
}

export async function fetchAllChatSessions(TOKEN) {
    const response = await fetch("https://chat.deepseek.com/api/v0/chat_session/fetch_page", {
        headers: headers(TOKEN),
        referrer: "https://chat.deepseek.com/",
        credentials: "include"
    });
    try { return await response.json(); } catch { return; }
}

export async function deleteAllChatSessions(TOKEN, CHAT_SESSION_ID) {
    const response = await fetch("https://chat.deepseek.com/api/v0/chat_session/delete_all", {
        method: "POST",
        headers: {
            ...headers(TOKEN)
        },
        referrer: `https://chat.deepseek.com/a/chat/s/${CHAT_SESSION_ID}`,
        body: null,
        mode: "cors",
        credentials: "include"
    });
    try { return await response.json(); } catch { return; }
}

export async function generatePowHeader(TOKEN, CHAT_SESSION_ID, targetPath) {
    try {
        const res = await fetch('https://chat.deepseek.com/api/v0/chat/create_pow_challenge', {
            method: 'POST',
            headers: {
                ...headers(TOKEN),
                'content-type': 'application/json',
                referer: `https://chat.deepseek.com/a/chat/s/${CHAT_SESSION_ID}`
            },
            body: JSON.stringify({ target_path: targetPath }),
        });

        if (!res.ok) throw new Error(`Challenge request failed: ${res.status}`);
        const json = await res.json();
        if (json.code !== 0) throw new Error(`PoW API error: ${json.msg}`);

        const { challenge, salt, expire_at, difficulty, signature, algorithm, target_path } = json.data.biz_data.challenge;
        const answer = await solvePow(challenge, salt, expire_at, difficulty);

        const payload = { algorithm, challenge, salt, answer, signature, target_path };
        return Buffer.from(JSON.stringify(payload)).toString('base64');
    } catch (error) {
        return "";
    }
}

export async function fetchHistoryMessages(TOKEN, sessionId) {
    const url = `https://chat.deepseek.com/api/v0/chat/history_messages?chat_session_id=${sessionId}&cache_version=-1`;
    const response = await fetch(url, {
        headers: headers(TOKEN),
        referrer: `https://chat.deepseek.com/a/chat/s/${sessionId}`,
        credentials: "include"
    });

    if (!response.ok) return null;

    try {
        const json = await response.json();
        let messages = null;
        if (json.data?.biz_data?.chat_messages) messages = json.data.biz_data.chat_messages;
        else if (json.biz_data?.chat_messages) messages = json.biz_data.chat_messages;
        else if (Array.isArray(json.chat_messages)) messages = json.chat_messages;
        else if (Array.isArray(json.data)) messages = json.data;

        if (messages) {
            return { data: { biz_data: { chat_messages: messages } } };
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Generator untuk streaming respons dari DeepSeek.
 * Mengembalikan token teks, status, dan ID pesan untuk manajemen percakapan.
 */
export async function* completion(TOKEN, prompt, CHAT_SESSION_ID, parentMessageId, stream = true, search = true, thinking = false, file_ids = []) {
    const pow = await generatePowHeader(TOKEN, CHAT_SESSION_ID, '/api/v0/chat/completion');
    // Pastikan parentMessageId adalah integer atau null (server mengharapkan integer)
    const finalParentId = parentMessageId ? parseInt(parentMessageId, 10) : null;

    const body = JSON.stringify({
        chat_session_id: CHAT_SESSION_ID,
        parent_message_id: finalParentId,
        prompt,
        ref_file_ids: file_ids,
        thinking_enabled: thinking,
        search_enabled: search
    });

    const response = await fetch("https://chat.deepseek.com/api/v0/chat/completion", {
        method: "POST",
        headers: {
            ...headers(TOKEN),
            'content-type': 'application/json',
            'x-ds-pow-response': pow,
            referer: `https://chat.deepseek.com/a/chat/s/${CHAT_SESSION_ID}`
        },
        body: body
    });

    if (!response.ok) {
        const errorText = await response.text();
        yield `__STATUS__: Error ${response.status}`;
        yield `❌ HTTP ${response.status}: ${errorText}`;
        return;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        const json = await response.json();
        if (json.data?.biz_code !== 0) {
            yield `__STATUS__: Error ${json.data.biz_code}`;
            yield `❌ ${json.data.biz_msg || 'Unknown error'}`;
        }
        return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = '';
    let readyEventReceived = false;
    let lastMessageId = null; // Menyimpan ID pesan terbaru dari server

    yield `__STATUS__: Thinking...`;

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            if (line.startsWith('event:')) {
                readyEventReceived = true;
                continue;
            }

            if (line.startsWith('data:')) {
                const dataStr = line.slice(5).trim();
                if (dataStr === '[DONE]') continue;

                try {
                    const json = JSON.parse(dataStr);
                    
                    // Tangkap ID pesan dari event 'ready' untuk digunakan sebagai parent berikutnya
                    if (json.response_message_id) {
                        lastMessageId = parseInt(json.response_message_id, 10);
                        yield `__MESSAGE_ID__:${lastMessageId}`;
                    }
                    
                    // Status dan konten
                    if (json.v === 'SEARCHING') {
                        yield `__STATUS__: Searching the web...`;
                    } else if (json.v === 'THINKING') {
                        yield `__STATUS__: Deep thinking...`;
                    } else if (json.v && typeof json.v === 'string' && !['FINISHED', 'ANSWER'].includes(json.v)) {
                        yield json.v;
                    } else if (json.delta) {
                        yield json.delta;
                    } else if (json.content) {
                        yield json.content;
                    } else if (json.choices?.[0]?.delta?.content) {
                        yield json.choices[0].delta.content;
                    }
                } catch {
                    if (readyEventReceived) yield dataStr;
                }
            } else if (line.trim() !== '' && readyEventReceived) {
                yield line;
            }
        }
    }

    // Kirim ID pesan terakhir jika belum terkirim
    if (lastMessageId) {
        yield `__MESSAGE_ID__:${lastMessageId}`;
    }

    // Proses sisa buffer
    if (buffer.trim() !== '') {
        if (buffer.startsWith('data:')) {
            const dataStr = buffer.slice(5).trim();
            if (dataStr !== '[DONE]') {
                try {
                    const json = JSON.parse(dataStr);
                    const text = json.v || json.delta || json.content || json.choices?.[0]?.delta?.content;
                    if (text) yield text;
                } catch {
                    yield dataStr;
                }
            }
        } else if (readyEventReceived) {
            yield buffer;
        }
    }
}
