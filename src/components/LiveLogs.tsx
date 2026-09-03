import React from 'react';
import { Activity, Radio } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function LiveLogs() {
  const { state } = useApp();

  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden shadow-xl flex flex-col h-[400px] font-mono text-xs">
      <div className="bg-neutral-900/90 border-b border-neutral-800 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-neutral-200 font-semibold text-xs">Live API Logs &amp; Events</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
          <Radio className="w-3 h-3 animate-pulse" />
          <span>Realtime Stream</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 divide-y divide-neutral-900">
        {state.liveLogs.map((log) => {
          let badgeColor = 'text-blue-400 bg-blue-950/40 border-blue-800/40';
          if (log.type === 'response') badgeColor = 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40';
          if (log.type === 'error') badgeColor = 'text-red-400 bg-red-950/40 border-red-800/40';
          if (log.type === 'info') badgeColor = 'text-neutral-400 bg-neutral-900 border-neutral-800';

          return (
            <div key={log.id} className="pt-1.5 flex items-start gap-2 leading-relaxed">
              <span className="text-[10px] text-neutral-600 shrink-0">{log.timestamp}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold shrink-0 ${badgeColor}`}>
                {log.type}
              </span>
              <span className="text-neutral-300 break-all text-[11px]">{log.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
