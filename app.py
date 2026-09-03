import streamlit as st
import requests
import json
import re
import os
import time
from datetime import datetime

API_BASE = os.environ.get("API_BASE", "http://localhost:3000")

def get_headers():
    token = st.session_state.get('deepseek_token', '')
    return {"Authorization": f"Bearer {token}"}

def verify_token_connection(token, api_base_url):
    """Verifikasi token DeepSeek via API server /auth/verify atau langsung"""
    if not token or not token.strip():
        return False, "Token belum diisi. Masukkan token DeepSeek terlebih dahulu."
    
    # 1. Coba via API Server internal (/auth/verify)
    try:
        res = requests.get(f"{api_base_url}/auth/verify", headers={"Authorization": f"Bearer {token.strip()}"}, timeout=8)
        if res.status_code == 200:
            data = res.json()
            if data.get("success"):
                profile = data.get("profile", {})
                user_desc = profile.get("email") or profile.get("name") or profile.get("phone") or "Active User"
                return True, f"✅ Terhubung! Token valid (Akun: {user_desc})."
            return False, f"Token ditolak: {data.get('error', 'Unknown response')}"
        elif res.status_code in [400, 401]:
            return False, "❌ Token tidak valid atau sesi telah kedaluwarsa (HTTP 401/400)."
    except Exception:
        pass

    # 2. Coba via DeepSeek API langsung jika api-server belum berjalan
    try:
        headers = {
            'accept': '*/*',
            'authorization': f'Bearer {token.strip()}',
            'x-app-version': '20241129.1',
            'x-client-platform': 'web'
        }
        res = requests.get("https://chat.deepseek.com/api/v0/users/current", headers=headers, timeout=8)
        if res.status_code == 200:
            d = res.json()
            if d.get("code") == 0:
                user_info = d.get("data", {})
                name = user_info.get("name") or user_info.get("email") or "Active User"
                return True, f"✅ Terhubung langsung ke DeepSeek! Token valid (Akun: {name})."
            return False, f"Respon DeepSeek: {d.get('msg', 'Gagal verifikasi')}"
        elif res.status_code in [401, 403]:
            return False, "❌ Token tidak valid atau tidak memiliki izin akses (HTTP 401/403)."
        return False, f"Gagal menghubungi DeepSeek (HTTP {res.status_code})."
    except Exception as err:
        return False, f"Gagal menguji koneksi: {err}"

def fetch_sessions():
    try:
        res = requests.get(f"{API_BASE}/sessions", headers=get_headers(), timeout=6)
        if res.status_code == 200:
            return res.json().get('data', {}).get('biz_data', {}).get('chat_sessions', [])
        else:
            return []
    except Exception:
        return []

def create_session():
    try:
        res = requests.post(f"{API_BASE}/sessions", headers=get_headers(), timeout=8)
        if res.status_code == 200:
            return res.json().get('data', {}).get('biz_data', {}).get('id')
        return None
    except Exception:
        return None

def execute_file_command(cmd, args):
    """Eksekusi perintah file manual melalui backend API"""
    try:
        headers = get_headers()
        if cmd == 'list':
            dir_path = args[0] if args else '.'
            resp = requests.get(f"{API_BASE}/file/list", headers=headers, params={'dir': dir_path}, timeout=10)
            if resp.ok:
                items = resp.json().get('items', [])
                return "\n".join([f"{'📁' if i['type']=='dir' else '📄'} {i['path']}" for i in items])
            return f"Error: {resp.json().get('error')}"
        elif cmd == 'read':
            if not args: return "Usage: /file read <path>"
            resp = requests.get(f"{API_BASE}/file/read", headers=headers, params={'path': args[0]}, timeout=10)
            if resp.ok:
                return resp.json().get('content', '')
            return f"Error: {resp.json().get('error')}"
        elif cmd == 'write':
            if len(args) < 2: return "Usage: /file write <path> <content>"
            resp = requests.post(f"{API_BASE}/file/write", headers=headers, json={'path': args[0], 'content': ' '.join(args[1:])}, timeout=10)
            if resp.ok:
                return resp.json().get('message', 'OK')
            return f"Error: {resp.json().get('error')}"
        elif cmd == 'edit':
            if len(args) < 3: return "Usage: /file edit <path> <old_str> <new_str>"
            resp = requests.post(f"{API_BASE}/file/edit", headers=headers, json={'path': args[0], 'old_str': args[1], 'new_str': ' '.join(args[2:])}, timeout=10)
            if resp.ok:
                return resp.json().get('message', 'OK')
            return f"Error: {resp.json().get('error')}"
        else:
            return "Unknown file command. Available: list, read, write, edit"
    except Exception as e:
        return f"Exception: {e}"

def execute_shell_command(command):
    """Eksekusi bash command di workspace via backend API"""
    try:
        headers = get_headers()
        resp = requests.post(f"{API_BASE}/exec", headers=headers, json={'command': command}, timeout=30)
        if resp.ok:
            data = resp.json()
            if data.get('success'):
                out = data.get('stdout', '')
                err = data.get('stderr', '')
                return f"{out}\n{err}".strip() if err else out
            return f"❌ Error: {data.get('error')}\n{data.get('stderr', '')}"
        return f"HTTP Error {resp.status_code}: {resp.text}"
    except Exception as e:
        return f"Execution Exception: {e}"

def render_thinking_animation(title="DeepTerm is thinking...", subtitle="Solving PoW & generating tokens..."):
    """Template HTML animasi thinking interaktif"""
    return f"""
    <div class="thinking-container">
        <div class="thinking-spinner">
            <div class="thinking-dot"></div>
            <div class="thinking-dot"></div>
            <div class="thinking-dot"></div>
        </div>
        <div class="thinking-text-group">
            <div class="thinking-title">🧠 {title}</div>
            <div class="thinking-subtitle">{subtitle}</div>
        </div>
    </div>
    """

def call_completion_with_tools(prompt, chat_id, parent_id, status_placeholder=None, max_iter=5):
    """Loop penanganan streaming & tool call dengan animasi thinking dinamis"""
    current_parent = parent_id
    final_response = ""

    for iteration in range(max_iter):
        if status_placeholder:
            status_placeholder.markdown(
                render_thinking_animation(
                    title="DeepTerm sedang menganalisis...",
                    subtitle=f"Iterasi {iteration+1} — Menyelesaikan tantangan Proof-of-Work"
                ),
                unsafe_allow_html=True
            )

        try:
            response = requests.post(
                f"{API_BASE}/completion",
                headers=get_headers(),
                json={"prompt": prompt, "chat_session_id": chat_id, "parent_message_id": current_parent},
                stream=True,
                timeout=60
            )
        except Exception as err:
            return f"❌ Connection Error with API Server: {err}"

        if response.status_code != 200:
            return f"❌ API Error {response.status_code}: {response.text}"

        full = ""
        tool_call = None
        new_parent = current_parent

        for line in response.iter_lines():
            if not line: continue
            line = line.decode('utf-8')
            if line.startswith('data: '):
                data_str = line[6:]
                try:
                    data = json.loads(data_str)
                    token = data.get('token', '')
                    if token.startswith('__MESSAGE_ID__:'):
                        new_parent = int(token.split(':')[1])
                    elif token.startswith('__STATUS__:'):
                        status_type = token.split(':', 1)[1]
                        if status_placeholder:
                            status_placeholder.markdown(
                                render_thinking_animation(
                                    title=f"Status: {status_type.capitalize()}...",
                                    subtitle="DeepSeek sedang memproses penalaran internal"
                                ),
                                unsafe_allow_html=True
                            )
                    else:
                        full += token
                        match = re.search(r'\[TOOL\]\s*(\{.*?\})', full, re.DOTALL)
                        if match:
                            try:
                                tool_call = json.loads(match.group(1))
                                break
                            except:
                                pass
                except:
                    pass

        if tool_call:
            tool_name = tool_call.get('tool')
            if status_placeholder:
                status_placeholder.markdown(
                    render_thinking_animation(
                        title=f"⚡ Menjalankan Tool: {tool_name}",
                        subtitle=f"Parameter: {json.dumps(tool_call)[:60]}..."
                    ),
                    unsafe_allow_html=True
                )
                time.sleep(0.3)

            if tool_name == 'read_file':
                result = execute_file_command('read', [tool_call.get('path')])
            elif tool_name == 'write_file':
                result = execute_file_command('write', [tool_call.get('path'), tool_call.get('content', '')])
            elif tool_name == 'edit_file':
                result = execute_file_command('edit', [tool_call.get('path'), tool_call.get('old_str', ''), tool_call.get('new_str', '')])
            elif tool_name == 'run_shell':
                result = execute_shell_command(tool_call.get('command', ''))
            else:
                result = f"Unknown tool: {tool_name}"

            prompt = f"[TOOL_RESULT] {result}\n\nLanjutkan respon Anda secara lengkap."
            current_parent = new_parent
            continue
        else:
            final_response = full
            st.session_state.current_parent_id = new_parent
            break

    return final_response

def generate_markdown_export(messages, session_id):
    """Menghasilkan teks berkas Markdown untuk sesi percakapan"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    lines = [
        f"# 🧠 DeepTerm Chat Session Export",
        f"- **Session ID**: `{session_id or 'N/A'}`",
        f"- **Exported At**: {timestamp}",
        f"- **Total Messages**: {len(messages)}",
        "",
        "---",
        ""
    ]
    for idx, msg in enumerate(messages, 1):
        role_title = "👤 **User**" if msg["role"] == "user" else "🤖 **DeepTerm Agent**"
        lines.append(f"### #{idx} {role_title}\n")
        lines.append(f"{msg['content']}\n")
        lines.append("---\n")
    return "\n".join(lines)

def generate_json_export(messages, session_id):
    """Menghasilkan data JSON terstruktur untuk sesi percakapan"""
    payload = {
        "app": "DeepTerm AI Coding Agent",
        "chat_session_id": session_id,
        "exported_at": datetime.now().isoformat(),
        "total_messages": len(messages),
        "messages": messages
    }
    return json.dumps(payload, indent=2, ensure_ascii=False)

# ==================== STREAMLIT PAGE LAYOUT ====================
st.set_page_config(
    page_title="DeepTerm — AI Coding Agent",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Injeksi Custom CSS untuk Animasi Thinking & Polished Styling
st.markdown("""
<style>
    /* Styling Thinking Animation */
    .thinking-container {
        display: flex;
        align-items: center;
        gap: 14px;
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 78, 59, 0.15) 100%);
        border: 1px solid rgba(16, 185, 129, 0.35);
        padding: 14px 20px;
        border-radius: 12px;
        margin: 12px 0;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
    }
    .thinking-spinner {
        display: flex;
        gap: 6px;
        align-items: center;
    }
    .thinking-dot {
        width: 8px;
        height: 8px;
        background-color: #10b981;
        border-radius: 50%;
        animation: pulse-dot 1.2s infinite ease-in-out both;
    }
    .thinking-dot:nth-child(1) { animation-delay: -0.32s; }
    .thinking-dot:nth-child(2) { animation-delay: -0.16s; }
    .thinking-dot:nth-child(3) { animation-delay: 0s; }
    @keyframes pulse-dot {
        0%, 80%, 100% { transform: scale(0.4); opacity: 0.3; }
        40% { transform: scale(1.1); opacity: 1; box-shadow: 0 0 8px #10b981; }
    }
    .thinking-text-group {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .thinking-title {
        font-weight: 600;
        font-size: 13px;
        color: #6ee7b7;
        letter-spacing: 0.2px;
    }
    .thinking-subtitle {
        font-size: 11px;
        color: #9ca3af;
        font-family: monospace;
    }
    /* Quick command chips */
    .quick-chip {
        display: inline-block;
        background: #111827;
        color: #10b981;
        border: 1px solid #1f2937;
        padding: 4px 10px;
        border-radius: 8px;
        font-size: 11px;
        font-family: monospace;
        margin: 2px 4px 2px 0;
    }
</style>
""", unsafe_allow_html=True)

# State Inisialisasi
if "messages" not in st.session_state:
    st.session_state.messages = []
if "current_chat_id" not in st.session_state:
    st.session_state.current_chat_id = None
if "current_parent_id" not in st.session_state:
    st.session_state.current_parent_id = None
if "deepseek_token" not in st.session_state:
    st.session_state.deepseek_token = os.environ.get("DEEPSEEK_TOKEN", "")
if "connection_status" not in st.session_state:
    st.session_state.connection_status = None

# ==================== SIDEBAR ====================
with st.sidebar:
    st.markdown("### 🧠 DeepTerm")
    st.caption("AI Full-Stack Coding Agent & PoW Engine")
    st.divider()

    # --- Sesi Percakapan & Filter Pencarian ---
    st.markdown("#### 💬 Sesi Percakapan")

    col_btn1, col_btn2 = st.columns(2)
    with col_btn1:
        if st.button("➕ Sesi Baru", use_container_width=True):
            new_id = create_session()
            if new_id:
                st.session_state.current_chat_id = new_id
                st.session_state.current_parent_id = None
                st.session_state.messages = []
                st.success("Sesi baru dibuat!")
                st.rerun()
            else:
                st.error("Gagal membuat sesi.")
    with col_btn2:
        if st.button("🔄 Refresh", use_container_width=True):
            st.rerun()

    # Feature 4: Search Input Field to filter existing chat sessions
    search_query = st.text_input("🔍 Cari Sesi", placeholder="Filter berdasarkan judul...", help="Filter daftar sesi yang ada")

    sessions = fetch_sessions()
    if sessions:
        # Filter berdasarkan kata kunci pencarian
        if search_query.strip():
            q = search_query.strip().lower()
            filtered_sessions = [s for s in sessions if q in (s.get('title') or '').lower() or q in s.get('id', '').lower()]
            st.caption(f"Menampilkan {len(filtered_sessions)} dari {len(sessions)} sesi")
        else:
            filtered_sessions = sessions

        if filtered_sessions:
            session_options = {s.get('title') or f"Sesi ({s['id'][:8]}...)": s['id'] for s in filtered_sessions}
            current_id = st.session_state.current_chat_id
            
            # Cari index sesi terpilih
            current_index = 0
            keys_list = list(session_options.keys())
            for i, k in enumerate(keys_list):
                if session_options[k] == current_id:
                    current_index = i
                    break

            selected_title = st.selectbox("Pilih sesi aktif:", options=keys_list, index=current_index if keys_list else None)
            if selected_title:
                selected_id = session_options[selected_title]
                if selected_id != st.session_state.current_chat_id:
                    st.session_state.current_chat_id = selected_id
                    st.session_state.current_parent_id = None
                    st.session_state.messages = []
                    st.rerun()
        else:
            st.info(f"Tidak ada sesi yang cocok dengan '{search_query}'")
    else:
        st.info("Belum ada sesi percakapan. Klik '➕ Sesi Baru' atau atur Token.")

    st.divider()

    # --- Panel Pengaturan & Feature 1: Test Connection Button ---
    with st.expander("⚙️ Pengaturan & Koneksi", expanded=not bool(st.session_state.deepseek_token)):
        token_input = st.text_input(
            "DeepSeek Token",
            type="password",
            value=st.session_state.deepseek_token,
            help="Ambil dari Developer Tools chat.deepseek.com (Header Authorization)"
        )
        if token_input != st.session_state.deepseek_token:
            st.session_state.deepseek_token = token_input
            st.session_state.connection_status = None

        api_url_input = st.text_input(
            "API Server Base URL",
            value=API_BASE,
            help="Alamat REST/SSE server lokal DeepTerm"
        )
        if api_url_input != API_BASE:
            API_BASE = api_url_input

        # FEATURE 1: 'Test Connection' button
        if st.button("🔌 Test Connection", use_container_width=True):
            with st.spinner("Menguji koneksi ke API DeepSeek..."):
                ok, msg = verify_token_connection(st.session_state.deepseek_token, API_BASE)
                st.session_state.connection_status = {"ok": ok, "msg": msg}
        
        if st.session_state.connection_status:
            if st.session_state.connection_status["ok"]:
                st.success(st.session_state.connection_status["msg"])
            else:
                st.error(st.session_state.connection_status["msg"])

    st.divider()

    # --- FEATURE 3 (Sidebar Placement): Export Session ---
    st.markdown("#### 📥 Export Riwayat")
    if st.session_state.messages:
        curr_id = st.session_state.current_chat_id or "session"
        col_exp1, col_exp2 = st.columns(2)
        with col_exp1:
            md_content = generate_markdown_export(st.session_state.messages, curr_id)
            st.download_button(
                label="📄 Markdown",
                data=md_content,
                file_name=f"deepterm_session_{curr_id[:8]}.md",
                mime="text/markdown",
                use_container_width=True
            )
        with col_exp2:
            json_content = generate_json_export(st.session_state.messages, curr_id)
            st.download_button(
                label="📦 JSON",
                data=json_content,
                file_name=f"deepterm_session_{curr_id[:8]}.json",
                mime="application/json",
                use_container_width=True
            )
    else:
        st.caption("Mulai obrolan untuk mengunduh riwayat sesi.")

# ==================== MAIN CHAT PANEL ====================
col_title, col_actions = st.columns([3, 1])
with col_title:
    st.markdown("## 🧠 DeepTerm Coding Agent")
    st.caption("Deterministic Full-Stack AI Coding Assistant & PoW Solver")
with col_actions:
    if st.session_state.current_chat_id:
        st.caption(f"Sesi Aktif: `{st.session_state.current_chat_id[:12]}...`")

# Shortcut bar
st.markdown("""
<div>
    <span class="quick-chip">/file list [dir]</span>
    <span class="quick-chip">/file read &lt;path&gt;</span>
    <span class="quick-chip">/file write &lt;path&gt;</span>
    <span class="quick-chip">/file edit &lt;path&gt;</span>
    <span class="quick-chip">/exec &lt;bash command&gt;</span>
</div>
""", unsafe_allow_html=True)
st.divider()

# Tampilkan riwayat obrolan
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

# FEATURE 2: Animated Thinking Effect during prompt / command processing
if prompt := st.chat_input("Ketik instruksi kode, pertanyaan, atau perintah (/file, /exec)..."):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # Tangani perintah /file secara manual
    if prompt.startswith('/file'):
        with st.chat_message("assistant"):
            status_box = st.empty()
            status_box.markdown(
                render_thinking_animation(title="Eksekusi Perintah File...", subtitle=f"Operasi: {prompt}"),
                unsafe_allow_html=True
            )
            time.sleep(0.2)

            parts = prompt.split()
            if len(parts) >= 2:
                cmd = parts[1]
                args = parts[2:]
                result = execute_file_command(cmd, args)
                status_box.code(result)
                st.session_state.messages.append({"role": "assistant", "content": f"```\n{result}\n```"})
            else:
                usage = "Penggunaan: `/file list [dir]` | `/file read <path>` | `/file write <path> <konten>` | `/file edit <path> <old> <new>`"
                status_box.info(usage)
                st.session_state.messages.append({"role": "assistant", "content": usage})
        st.rerun()

    # Tangani perintah /exec shell
    elif prompt.startswith('/exec'):
        with st.chat_message("assistant"):
            status_box = st.empty()
            status_box.markdown(
                render_thinking_animation(title="⚡ Menjalankan Shell Command...", subtitle=f"Command: {prompt[6:]}"),
                unsafe_allow_html=True
            )
            time.sleep(0.25)

            cmd_str = prompt[5:].strip()
            if cmd_str:
                result = execute_shell_command(cmd_str)
                status_box.code(result)
                st.session_state.messages.append({"role": "assistant", "content": f"```\n{result}\n```"})
            else:
                usage = "Penggunaan: `/exec <perintah bash>`"
                status_box.info(usage)
                st.session_state.messages.append({"role": "assistant", "content": usage})
        st.rerun()

    # Tangani pesan AI dengan DeepSeek & animasi thinking
    else:
        if not st.session_state.deepseek_token:
            with st.chat_message("assistant"):
                st.warning("⚠️ DEEPSEEK_TOKEN belum diset. Buka panel '⚙️ Pengaturan & Koneksi' di sidebar.")
            st.session_state.messages.append({"role": "assistant", "content": "⚠️ DEEPSEEK_TOKEN belum diset."})
        elif not st.session_state.current_chat_id:
            with st.chat_message("assistant"):
                st.warning("⚠️ Pilih atau buat sesi baru melalui tombol '➕ Sesi Baru' di sidebar.")
            st.session_state.messages.append({"role": "assistant", "content": "⚠️ Sesi belum dipilih."})
        else:
            with st.chat_message("assistant"):
                status_box = st.empty()
                status_box.markdown(
                    render_thinking_animation(title="DeepTerm sedang berpikir...", subtitle="Menghubungkan ke API & menganalisis konteks"),
                    unsafe_allow_html=True
                )
                
                full_response = call_completion_with_tools(
                    prompt,
                    st.session_state.current_chat_id,
                    st.session_state.current_parent_id,
                    status_placeholder=status_box
                )
                
                status_box.markdown(full_response)
                st.session_state.messages.append({"role": "assistant", "content": full_response})
        st.rerun()
