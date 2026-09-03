import React from 'react';
import { Cpu } from 'lucide-react';

interface ThinkingIndicatorProps {
  title?: string;
  subtitle?: string;
  stage?: 'thinking' | 'pow' | 'executing' | 'finalizing';
}

export default function ThinkingIndicator({
  title = 'DeepTerm Agent is thinking...',
  subtitle = 'Solving WebAssembly PoW & analyzing code context...',
  stage = 'thinking'
}: ThinkingIndicatorProps) {
  return (
    <div id="thinking-indicator-root" className="flex gap-3 justify-start animate-fadeIn my-2 font-sans">
      <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-600/40 flex items-center justify-center text-emerald-400 shrink-0 font-mono text-xs font-bold mt-0.5 shadow-sm">
        <Cpu className="w-4 h-4 animate-spin text-emerald-400" />
      </div>

      <div className="max-w-[85%] rounded-xl p-3.5 bg-gradient-to-r from-emerald-950/30 to-neutral-950 border border-emerald-500/30 shadow-md space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
          </div>
          <span className="text-xs font-semibold text-emerald-400 tracking-wide font-mono">
            {title}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-700/50 uppercase font-mono ml-auto">
            {stage}
          </span>
        </div>

        <div className="text-[11px] text-neutral-400 font-mono pl-4">
          {subtitle}
        </div>

        <div className="w-full bg-neutral-900 rounded-full h-1 overflow-hidden mt-1.5">
          <div className="bg-emerald-500 h-1 rounded-full animate-pulse w-3/4" />
        </div>
      </div>
    </div>
  );
}
