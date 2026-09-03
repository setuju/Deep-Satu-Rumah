import React, { useState } from 'react';
import { Terminal, Shield, Zap, Sparkles, Sun, Moon, Key, Activity, Code, Cpu } from 'lucide-react';
import AgentChat from './components/AgentChat';
import TerminalComponent from './components/Terminal';
import LiveLogs from './components/LiveLogs';
import TokenValidator from './components/TokenValidator';
import TokenModal from './components/TokenModal';
import { useApp } from './context/AppContext';

export default function App() {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState<'agent' | 'terminal' | 'logs' | 'cli-info' | 'wasm'>('agent');
  const [showTokenModal, setShowTokenModal] = useState(false);

  const toggleTheme = () => {
    dispatch({ type: 'SET_THEME', payload: state.theme === 'dark' ? 'light' : 'dark' });
  };

  const isDark = state.theme === 'dark';

  return (
    <div
      id="deepterm-root"
      className={`min-h-screen font-sans transition-colors duration-200 ${
        isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-100 text-neutral-900'
      }`}
    >
      {/* Header Bar */}
      <header
        id="deepterm-header"
        className={`border-b sticky top-0 z-40 backdrop-blur-md ${
          isDark ? 'border-neutral-800 bg-neutral-950/80' : 'border-neutral-200 bg-white/80'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-sm font-mono">
              DT
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide">DeepTerm</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-mono">
                  v1.0.0
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 font-mono">
                  WASM PoW
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 hidden sm:block">
                DeepSeek Terminal &amp; AI Coding Agent Engine
              </p>
            </div>
          </div>

          {/* Navigation Tabs & Actions */}
          <div className="flex items-center gap-2">
            <nav
              id="deepterm-nav"
              className={`flex items-center gap-1 p-1 rounded-lg border ${
                isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-200/70 border-neutral-300'
              }`}
            >
              <button
                id="nav-agent"
                onClick={() => setActiveTab('agent')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'agent'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Agent Chat</span>
              </button>

              <button
                id="nav-terminal"
                onClick={() => setActiveTab('terminal')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'terminal'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Interactive Terminal</span>
              </button>

              <button
                id="nav-logs"
                onClick={() => setActiveTab('logs')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'logs'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Live Logs</span>
              </button>

              <button
                id="nav-wasm"
                onClick={() => setActiveTab('wasm')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'wasm'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>PoW WASM</span>
              </button>
            </nav>

            {/* Token Quick Button */}
            <button
              onClick={() => setShowTokenModal(true)}
              className={`p-2 rounded-lg border transition-colors ${
                isDark
                  ? 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-emerald-400'
                  : 'border-neutral-300 bg-white text-neutral-700 hover:text-emerald-600'
              }`}
              title="Kelola DEEPSEEK_TOKEN"
            >
              <Key className="w-4 h-4" />
            </button>

            {/* Theme Switcher Button (Feature 8) */}
            <button
              id="btn-theme-toggle"
              onClick={toggleTheme}
              className={`p-2 rounded-lg border transition-colors ${
                isDark
                  ? 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-amber-400'
                  : 'border-neutral-300 bg-white text-neutral-700 hover:text-amber-600'
              }`}
              title={isDark ? 'Ganti ke Light Theme' : 'Ganti ke Dark Theme'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-700" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Top Status Dashboard */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className={`p-4 rounded-xl border shadow-sm ${
              isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-neutral-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
              <span>Token Status</span>
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  state.authStatus.valid ? 'bg-emerald-400 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="text-sm font-semibold">
                {state.authStatus.valid
                  ? 'Tervalidasi & Siap'
                  : state.token
                  ? 'Token Terkonfigurasi'
                  : 'Belum Terhubung'}
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1 font-mono">
              {state.authStatus.accountName || 'Gunakan Developer Tools untuk menyalin token'}
            </p>
          </div>

          <div
            className={`p-4 rounded-xl border shadow-sm ${
              isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-neutral-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
              <span>WASM PoW Engine</span>
              <Cpu className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              <span className="text-sm font-semibold">deepseek.wasm (26.6 KB)</span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1 font-mono">
              wasm_solve() • Sha3/PoW challenge ready
            </p>
          </div>

          <div
            className={`p-4 rounded-xl border shadow-sm ${
              isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-neutral-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
              <span>Express API &amp; JWT Server</span>
              <Zap className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-sm font-semibold">Port 3000 Active</span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1 font-mono">
              Morgan + Winston Logging + /auth/refresh
            </p>
          </div>
        </section>

        {/* Tab Displays */}
        {activeTab === 'agent' && (
          <section id="tab-agent-view">
            <AgentChat />
          </section>
        )}

        {activeTab === 'terminal' && (
          <section id="tab-terminal-view" className="space-y-4">
            <TokenValidator />
            <TerminalComponent />
          </section>
        )}

        {activeTab === 'logs' && (
          <section id="tab-logs-view" className="space-y-4">
            <LiveLogs />
          </section>
        )}

        {activeTab === 'wasm' && (
          <section
            id="tab-wasm-view"
            className={`p-6 rounded-xl border shadow-lg space-y-4 font-mono text-xs ${
              isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-neutral-200'
            }`}
          >
            <h3 className="text-sm font-bold flex items-center gap-2 text-emerald-400 font-sans">
              <Cpu className="w-4 h-4" />
              <span>DeepSeek Proof-of-Work WebAssembly Architecture</span>
            </h3>
            <p className="text-neutral-400 leading-relaxed font-sans text-xs">
              DeepSeek menerapkan verifikasi Proof-of-Work pada layer browser untuk mencegah spam bot dan memastikan integritas request AI completion.
            </p>
            <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300 space-y-2">
              <div className="text-emerald-400 font-bold">Alur Kerja Solver:</div>
              <div>1. Mengambil tantangan: <code>POST https://chat.deepseek.com/api/v0/chat/create_pow_challenge</code></div>
              <div>2. Menghitung Hash Memory WASM: <code>wasm_solve(challenge, salt, difficulty)</code></div>
              <div>3. Menghasilkan jawaban Base64 JSON untuk header <code>x-ds-pow-response</code></div>
              <div>4. Streaming token SSE: <code>/api/v0/chat/completion</code></div>
            </div>
          </section>
        )}
      </main>

      {/* Token Modal */}
      <TokenModal isOpen={showTokenModal} onClose={() => setShowTokenModal(false)} />
    </div>
  );
}
