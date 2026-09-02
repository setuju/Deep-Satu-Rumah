import streamlit as st
import requests
import json
import re

API_BASE = "http://localhost:3000"

def get_headers():
    token = st.session_state.get('deepseek_token', '')
    return {"Authorization": f"Bearer {token}"}

def fetch_sessions():
    try:
        res = requests.get(f"{API_BASE}/sessions", headers=get_headers())
        if res.status_code == 200:
            return res.json().get('data', {}).get('biz_data', {}).get('chat_sessions', [])
        else:
            st.error(f"Gagal mengambil sesi: {res.text}")
            return []
    except Exception as e:
        st.error(f"Error: {e}")
        return []

def create_session():
    try:
        res = requests.post(f"{API_BASE}/sessions", headers=get_headers())
        if res.status_code == 200:
            return res.json().get('data', {}).get('biz_data', {}).get('id')
        else:
            st.error(f"Gagal membuat sesi: {res.text}")
            return None
    except Exception as e:
        st.error(f"Error: {e}")
        return None

def execute_file_command(cmd, args):
    """Eksekusi perintah file manual"""
    try:
        if cmd == 'list':
            dir_path = args[0] if args else '.'
            resp = requests.get(f"{API_BASE}/file/list", headers=get_headers(), params={'dir': dir_path})
            if resp.ok:
                items = resp.json().get('items', [])
                return "\n".join([f"{'📁' if i['type']=='dir' else '📄'} {i['path']}" for i in items])
            else:
                return f"Error: {resp.json().get('error')}"
        elif cmd == 'read':
            if not args: return "Usage: /file read <path>"
            file_path = args[0]
            resp = requests.get(f"{API_BASE}/file/read", headers=get_headers(), params={'path': file_path})
            if resp.ok:
                return resp.json().get('content', '')
            else:
                return f"Error: {resp.json().get('error')}"
        elif cmd == 'write':
            if len(args) < 2: return "Usage: /file write <path> <content>"
            file_path = args[0]
            content = ' '.join(args[1:])
            resp = requests.post(f"{API_BASE}/file/write", headers=get_headers(), json={'path': file_path, 'content': content})
            if resp.ok:
                return resp.json().get('message', 'OK')
            else:
                return f"Error: {resp.json().get('error')}"
        elif cmd == 'edit':
            if len(args) < 3: return "Usage: /file edit <path> <old_str> <new_str>"
            file_path = args[0]
            old_str = args[1]
            new_str = ' '.join(args[2:])
            resp = requests.post(f"{API_BASE}/file/edit", headers=get_headers(), json={'path': file_path, 'old_str': old_str, 'new_str': new_str})
            if resp.ok:
                return resp.json().get('message', 'OK')
            else:
                return f"Error: {resp.json().get('error')}"
        else:
            return "Unknown file command. Available: list, read, write, edit"
    except Exception as e:
        return f"Exception: {e}"

def call_completion_with_tools(prompt, chat_id, parent_id, max_iter=5):
    """Loop rekursif untuk menangani tool call otomatis"""
    current_parent = parent_id
    final_response = ""
    for _ in range(max_iter):
        response = requests.post(
            f"{API_BASE}/completion",
            headers=get_headers(),
            json={"prompt": prompt, "chat_session_id": chat_id, "parent_message_id": current_parent},
            stream=True
        )
        if response.status_code != 200:
            return f"Error: {response.text}"
        
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
                        pass
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
            if tool_name == 'read_file':
                path = tool_call.get('path')
                result = execute_file_command('read', [path])
            elif tool_name == 'write_file':
                path = tool_call.get('path')
                content = tool_call.get('content', '')
                result = execute_file_command('write', [path, content])
            elif tool_name == 'edit_file':
                path = tool_call.get('path')
                old_str = tool_call.get('old_str')
                new_str = tool_call.get('new_str')
                result = execute_file_command('edit', [path, old_str, new_str])
            else:
                result = f"Unknown tool: {tool_name}"
            prompt = f"[TOOL_RESULT] {result}\n\nContinue your response."
            current_parent = new_parent
            continue
        else:
            final_response = full
            st.session_state.current_parent_id = new_parent
            break
    return final_response

st.set_page_config(page_title="DeepTerm Web UI", page_icon="🧠", layout="wide")
st.title("🧠 DeepTerm Web UI")

if "messages" not in st.session_state:
    st.session_state.messages = []
if "current_chat_id" not in st.session_state:
    st.session_state.current_chat_id = None
if "current_parent_id" not in st.session_state:
    st.session_state.current_parent_id = None
if "deepseek_token" not in st.session_state:
    st.session_state.deepseek_token = ""

with st.sidebar:
    st.header("⚙️ Konfigurasi")
    token = st.text_input("DeepSeek Token", type="password", value=st.session_state.deepseek_token)
    if token != st.session_state.deepseek_token:
        st.session_state.deepseek_token = token
        st.rerun()
    if not token:
        st.warning("Masukkan token DeepSeek Anda.")
        st.stop()
    
    st.divider()
    st.header("💬 Sesi Percakapan")
    if st.button("➕ Buat Sesi Baru", use_container_width=True):
        new_id = create_session()
        if new_id:
            st.session_state.current_chat_id = new_id
            st.session_state.current_parent_id = None
            st.session_state.messages = []
            st.success("Sesi baru dibuat!")
            st.rerun()
    if st.button("🔄 Refresh Daftar Sesi", use_container_width=True):
        st.rerun()
    
    sessions = fetch_sessions()
    if sessions:
        session_options = {s.get('title', '(untitled)'): s['id'] for s in sessions}
        selected_title = st.selectbox("Pilih sesi:", options=list(session_options.keys()), index=None)
        if selected_title:
            selected_id = session_options[selected_title]
            if selected_id != st.session_state.current_chat_id:
                st.session_state.current_chat_id = selected_id
                st.session_state.current_parent_id = None
                st.session_state.messages = []
                st.rerun()

if not st.session_state.current_chat_id:
    st.info("👈 Pilih atau buat sesi baru.")
    st.stop()

for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

if prompt := st.chat_input("Ketik pesan Anda..."):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)
    
    if prompt.startswith('/file'):
        parts = prompt.split()
        if len(parts) >= 2:
            cmd = parts[1]
            args = parts[2:]
            result = execute_file_command(cmd, args)
            with st.chat_message("assistant"):
                st.code(result)
            st.session_state.messages.append({"role": "assistant", "content": result})
        else:
            with st.chat_message("assistant"):
                st.code("Usage: /file list|read|write|edit")
        st.rerun()
    else:
        with st.chat_message("assistant"):
            placeholder = st.empty()
            full_response = call_completion_with_tools(
                prompt,
                st.session_state.current_chat_id,
                st.session_state.current_parent_id
            )
            placeholder.markdown(full_response)
            st.session_state.messages.append({"role": "assistant", "content": full_response})
        st.rerun()
