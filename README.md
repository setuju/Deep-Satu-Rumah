# DeepTerm

<div align="center">
    <em><h2>Bring DeepSeek to your terminal</h2></em>
</div>

**DeepTerm** is a minimalist terminal-based interface and API server for [DeepSeek Chat](https://chat.deepseek.com), designed for developers, hackers, and command-line enthusiasts.

---

## 🚀 Features

1. **Terminal Interface (`deepterm.js`)**
   - Access DeepSeek Chat directly from your terminal.
   - Streamed output with live status indicator.
   - Built-in tool calling support (read, write, edit files & execute commands).
   - Session management: list, delete, export, and summarize chat history.

2. **API Server Mode (`api-server.js` & `deepterm-api.js`)**
   - Expose DeepSeek completions via a local HTTP API with Server-Sent Events (SSE).
   - Remote file operations (`/file/list`, `/file/read`, `/file/write`, `/file/edit`, `/file/execute`).
   - Secure shell execution endpoint (`/exec`).

3. **Web UI (`app.py`)**
   - Streamlit interface with session switching and interactive chat.

4. **WebAssembly PoW (`deepseek.wasm` & `deepterm-core.js`)**
   - Built-in WASM engine for solving Proof-of-Work challenges.

---

## 🛠️ Requirements & Setup

- **Node.js**: v18+
- **Python**: 3.8+ (for Streamlit and utility scripts)
- **DeepSeek Access Token**: Set via `DEEPSEEK_TOKEN` environment variable.

### Environment Setup
```bash
cp .env.example .env
export DEEPSEEK_TOKEN="ey..."
export WORKSPACE_ROOT="$(pwd)"
```

### Running CLI
```bash
# Interactive session
node deepterm.js -i

# One-shot prompt
node deepterm.js -p "Explain quantum computing in 3 sentences"
```

### Running API Server
```bash
node api-server.js
```

### Running Streamlit Web UI
```bash
streamlit run app.py
```
