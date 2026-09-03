import React, { useState } from 'react';
import { Terminal, Server, Play, Shield, Code, Cpu, ArrowRight, FileText, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import AgentChat from './components/AgentChat';

export default function App() {
  const [activeTab, setActiveTab] = useState<'agent' | 'cli' | 'api' | 'wasm' | 'commands'>('agent');

  return (
    <div id="deepterm-root" className="min-h-screen bg-neutral-950 text-neutral-100 font-mono selection:bg-neutral-800">
      {/* Top Navigation Bar */}
      <header id="deepterm-header" className="border-b border-neutral-800/80 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-neutral-800 border border-neutral-700 flex items-center justify-center text-emerald-400 font-bold">
              &gt;_
            </div>
            <div>
              <span className="font-semibold text-lg tracking-tight text-neutral-100">DeepTerm</span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">v1.0.0</span>
            </div>
          </div>

          <nav id="deepterm-nav" className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded-lg">
            <button
              id="nav-agent"
              onClick={() => setActiveTab('agent')}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors flex items-center gap-2 ${
                activeTab === 'agent' ? 'bg-emerald-600 text-white font-medium shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              Agent Chat
            </button>
            <button
              id="nav-cli"
              onClick={() => setActiveTab('cli')}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors flex items-center gap-2 ${
                activeTab === 'cli' ? 'bg-neutral-800 text-neutral-100 font-medium' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              CLI Client
            </button>
            <button
              id="nav-api"
              onClick={() => setActiveTab('api')}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors flex items-center gap-2 ${
                activeTab === 'api' ? 'bg-neutral-800 text-neutral-100 font-medium' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              API Server
            </button>
            <button
              id="nav-wasm"
              onClick={() => setActiveTab('wasm')}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors flex items-center gap-2 ${
                activeTab === 'wasm' ? 'bg-neutral-800 text-neutral-100 font-medium' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              PoW Solver
            </button>
            <button
              id="nav-commands"
              onClick={() => setActiveTab('commands')}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors flex items-center gap-2 ${
                activeTab === 'commands' ? 'bg-neutral-800 text-neutral-100 font-medium' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              Files &amp; Tools
            </button>
          </nav>
        </div>
      </header>

      {/* Main Workspace */}
      <main id="deepterm-main" className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Status Dashboard Banner */}
        <section id="deepterm-status-card" className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800/80">
              <div className="text-xs text-neutral-400 mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Core Engine
              </div>
              <div className="text-sm font-semibold text-neutral-200">deepterm-core.js</div>
              <div className="text-xs text-neutral-500 mt-1">Streaming &amp; Headers OK</div>
            </div>

            <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800/80">
              <div className="text-xs text-neutral-400 mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> WebAssembly PoW
              </div>
              <div className="text-sm font-semibold text-neutral-200">deepseek.wasm</div>
              <div className="text-xs text-neutral-500 mt-1">26.6 KB Binary Loaded</div>
            </div>

            <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800/80">
              <div className="text-xs text-neutral-400 mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> API Server
              </div>
              <div className="text-sm font-semibold text-neutral-200">api-server.js</div>
              <div className="text-xs text-neutral-500 mt-1">Port 3000 (REST &amp; SSE)</div>
            </div>

            <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800/80">
              <div className="text-xs text-neutral-400 mb-1 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> DeepSeek Token
              </div>
              <div className="text-sm font-semibold text-neutral-200">DEEPSEEK_TOKEN</div>
              <div className="text-xs text-neutral-500 mt-1">Configurable via .env</div>
            </div>
          </div>
        </section>

        {/* Tab Content Display */}
        {activeTab === 'agent' && (
          <section id="tab-agent-content">
            <AgentChat />
          </section>
        )}

        {activeTab === 'cli' && (
          <section id="tab-cli-content" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" /> DeepTerm CLI Interface
              </h2>
              <span className="text-xs text-neutral-400">Entry: deepterm.js</span>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
              <div className="bg-neutral-900/80 border-b border-neutral-800 px-4 py-2.5 flex items-center justify-between text-xs text-neutral-400">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                  <span className="ml-2 font-mono text-neutral-300">bash — deepterm</span>
                </div>
                <span>xterm-256color</span>
              </div>

              <div className="p-6 font-mono text-xs sm:text-sm space-y-3 leading-relaxed text-neutral-300">
                <div className="text-neutral-500"># Start interactive chat session with live status and history</div>
                <div className="text-emerald-400 flex items-center gap-2">
                  <span className="text-neutral-500">$</span> node deepterm.js -i
                </div>

                <div className="text-neutral-500 mt-4"># Send a one-shot prompt from command line</div>
                <div className="text-emerald-400 flex items-center gap-2">
                  <span className="text-neutral-500">$</span> node deepterm.js -p "Jelaskan arsitektur WebAssembly PoW DeepSeek"
                </div>

                <div className="text-neutral-500 mt-4"># Pipe text input to DeepTerm</div>
                <div className="text-emerald-400 flex items-center gap-2">
                  <span className="text-neutral-500">$</span> cat package.json | node deepterm.js -p "Summarize dependencies"
                </div>

                <div className="mt-6 p-4 rounded-lg bg-neutral-900 border border-neutral-800 text-xs space-y-2">
                  <div className="font-semibold text-neutral-200">Interactive Shortcuts in CLI:</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-neutral-400">
                    <div><kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-200 border border-neutral-700">ESC</kbd> Send prompt</div>
                    <div><kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-200 border border-neutral-700">Ctrl+L</kbd> List sessions</div>
                    <div><kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-200 border border-neutral-700">Ctrl+D</kbd> Delete session</div>
                    <div><kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-200 border border-neutral-700">Ctrl+E</kbd> Export history</div>
                    <div><kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-200 border border-neutral-700">Ctrl+S</kbd> Summarize chat</div>
                    <div><kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-200 border border-neutral-700">Ctrl+B</kbd> Return menu</div>
                    <div><kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-200 border border-neutral-700">Ctrl+C</kbd> Exit process</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'api' && (
          <section id="tab-api-content" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" /> REST &amp; Streaming API Endpoints
              </h2>
              <span className="text-xs text-neutral-400">api-server.js / port 3000</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold">POST</span>
                  <code className="text-xs text-neutral-200 font-mono">/completion</code>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Stream DeepSeek tokens via Server-Sent Events (SSE) with thinking &amp; search status messages.
                </p>
                <div className="p-3 bg-neutral-950 rounded-lg text-xs font-mono text-neutral-400 border border-neutral-800">
                  {`{
  "prompt": "Hello DeepSeek",
  "chat_session_id": "session_id",
  "parent_message_id": null
}`}
                </div>
              </div>

              <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">GET</span>
                  <code className="text-xs text-neutral-200 font-mono">/sessions</code>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Fetch all available chat sessions and conversations for the authenticated account.
                </p>
                <div className="p-3 bg-neutral-950 rounded-lg text-xs font-mono text-neutral-400 border border-neutral-800">
                  Header: Authorization: Bearer &lt;TOKEN&gt;
                </div>
              </div>

              <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold">POST</span>
                  <code className="text-xs text-neutral-200 font-mono">/file/execute</code>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Execute Python, Node.js, Bash, or PHP scripts within workspace and receive stdout/stderr.
                </p>
                <div className="p-3 bg-neutral-950 rounded-lg text-xs font-mono text-neutral-400 border border-neutral-800">
                  {`{
  "path": "port_scan.py",
  "args": ["--host", "localhost"]
}`}
                </div>
              </div>

              <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">POST</span>
                  <code className="text-xs text-neutral-200 font-mono">/exec</code>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Run arbitrary bash commands inside the configured WORKSPACE_ROOT directory.
                </p>
                <div className="p-3 bg-neutral-950 rounded-lg text-xs font-mono text-neutral-400 border border-neutral-800">
                  {`{ "command": "git status" }`}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'wasm' && (
          <section id="tab-wasm-content" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" /> WebAssembly Proof-of-Work Architecture
              </h2>
              <span className="text-xs text-neutral-400">deepseek.wasm</span>
            </div>

            <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-6 space-y-4">
              <p className="text-xs text-neutral-300 leading-relaxed">
                DeepSeek Chat API uses a cryptographic Proof-of-Work challenge (`create_pow_challenge`) to verify clients before accepting completions. DeepTerm executes this challenge natively through WebAssembly.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="text-xs font-bold text-neutral-300">1. Challenge Request</div>
                  <p className="text-xs text-neutral-500">
                    Request challenge params from <code>/api/v0/chat/create_pow_challenge</code>.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="text-xs font-bold text-neutral-300">2. WASM Solver</div>
                  <p className="text-xs text-neutral-500">
                    Pass challenge, salt, expire_at, and difficulty into <code>wasm_solve()</code>.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="text-xs font-bold text-neutral-300">3. Auth Header</div>
                  <p className="text-xs text-neutral-500">
                    Encode solution into Base64 JSON and send via <code>x-ds-pow-response</code> header.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'commands' && (
          <section id="tab-commands-content" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                <Code className="w-4 h-4 text-emerald-400" /> File System &amp; Tool Calling Commands
              </h2>
              <span className="text-xs text-neutral-400">Live Agent Integration</span>
            </div>

            <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-800 space-y-2">
                  <code className="text-xs text-emerald-400 font-bold">/file list [dir]</code>
                  <p className="text-xs text-neutral-400">List directory contents with file/folder classification.</p>
                </div>

                <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-800 space-y-2">
                  <code className="text-xs text-emerald-400 font-bold">/file read &lt;path&gt;</code>
                  <p className="text-xs text-neutral-400">Read UTF-8 contents of any workspace file.</p>
                </div>

                <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-800 space-y-2">
                  <code className="text-xs text-emerald-400 font-bold">/file write &lt;path&gt; &lt;content&gt;</code>
                  <p className="text-xs text-neutral-400">Write or create files with automatic parent directory creation.</p>
                </div>

                <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-800 space-y-2">
                  <code className="text-xs text-emerald-400 font-bold">/file edit &lt;path&gt; &lt;old_str&gt; &lt;new_str&gt;</code>
                  <p className="text-xs text-neutral-400">Surgically search and replace text in files.</p>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/60 mt-12 py-6 text-center text-xs text-neutral-500">
        DeepTerm — Terminal-based Client and API Server for DeepSeek Chat
      </footer>
    </div>
  );
}
