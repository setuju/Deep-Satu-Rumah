import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, CornerDownLeft, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function TerminalComponent() {
  const { state, executeCommand } = useApp();
  const [inputVal, setInputVal] = useState('');
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const terminalBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const commandList = state.terminalHistory.map((h) => h.command);

  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.terminalHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    executeCommand(inputVal);
    setInputVal('');
    setHistoryIndex(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandList.length === 0) return;
      const nextIndex = historyIndex === null ? commandList.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInputVal(commandList[nextIndex] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === null) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= commandList.length) {
        setHistoryIndex(null);
        setInputVal('');
      } else {
        setHistoryIndex(nextIndex);
        setInputVal(commandList[nextIndex] || '');
      }
    }
  };

  return (
    <div
      id="terminal-interactive-container"
      className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[520px] font-mono text-xs"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Terminal Title Bar */}
      <div className="bg-neutral-900/90 border-b border-neutral-800 px-4 py-2.5 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
          </div>
          <span className="text-neutral-400 text-xs ml-2 flex items-center gap-1.5 font-sans font-medium">
            <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>deepterm@workspace: {state.currentDirectory}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-neutral-500 hidden sm:inline">Gunakan ⬆ ⬇ untuk riwayat</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              executeCommand('clear');
            }}
            className="text-neutral-500 hover:text-neutral-300 p-1 rounded"
            title="Bersihkan Terminal"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Terminal Output Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 cursor-text">
        <div className="text-neutral-500 text-[11px] leading-relaxed">
          DeepTerm Interactive Console [Version 1.0.0]
          <br />
          Ketik perintah bash langsung (misal: <code>git status</code>, <code>ls -la</code>) atau perintah berkas <code>/file list</code>.
        </div>

        {state.terminalHistory.map((item) => (
          <div key={item.id} className="space-y-1">
            <div className="flex items-center gap-2 text-neutral-400">
              <span className="text-emerald-400 font-bold">deepterm $</span>
              <span className="text-neutral-100 font-semibold">{item.command}</span>
              <span className="text-[10px] text-neutral-600 ml-auto">{item.timestamp}</span>
            </div>
            <pre
              className={`p-2.5 rounded-lg whitespace-pre-wrap text-[11px] leading-relaxed overflow-x-auto ${
                item.status === 'error'
                  ? 'bg-red-950/20 text-red-300 border border-red-900/30'
                  : 'bg-neutral-900/50 text-neutral-300 border border-neutral-800/40'
              }`}
            >
              {item.output}
            </pre>
          </div>
        ))}
        <div ref={terminalBottomRef} />
      </div>

      {/* Terminal Input Prompt */}
      <form
        onSubmit={handleSubmit}
        className="bg-neutral-900/80 border-t border-neutral-800 p-3 flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-emerald-400 font-bold select-none pl-1">deepterm $</span>
        <input
          ref={inputRef}
          id="terminal-input-command"
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ketik perintah (contoh: git status, /file list, ls)..."
          className="flex-1 bg-transparent border-none outline-none text-neutral-100 text-xs font-mono placeholder-neutral-600"
          autoFocus
        />
        <button
          type="submit"
          className="text-neutral-400 hover:text-emerald-400 p-1 transition-colors"
          title="Eksekusi (Enter)"
        >
          <CornerDownLeft className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
