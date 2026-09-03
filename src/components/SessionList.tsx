import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Trash2, Search, Loader2 } from 'lucide-react';
import api from '../services/api';

interface SessionListProps {
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
}

export default function SessionList({
  currentSessionId,
  onSelectSession,
  onNewSession
}: SessionListProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await api.getSessions();
      setSessions(data || []);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const filtered = sessions.filter((s) => {
    const title = s.title || s.id || '';
    return title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl overflow-hidden shadow-lg flex flex-col font-sans text-xs">
      <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold text-neutral-200">Chat Sessions</span>
        </div>
        <button
          onClick={onNewSession}
          className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
          title="Sesi Baru"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-2 border-b border-neutral-800/80 bg-neutral-950/40">
        <div className="relative">
          <Search className="w-3 h-3 text-neutral-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari sesi..."
            className="w-full pl-7 pr-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-sans"
          />
        </div>
      </div>

      <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="p-4 text-center text-neutral-500 flex items-center justify-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            <span>Memuat sesi...</span>
          </div>
        ) : filtered.length > 0 ? (
          filtered.map((s) => {
            const isActive = s.id === currentSessionId;
            return (
              <div
                key={s.id}
                onClick={() => onSelectSession(s.id)}
                className={`p-2 rounded-lg cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                  isActive ? 'bg-neutral-800 text-neutral-100 font-medium' : 'hover:bg-neutral-800/50 text-neutral-400'
                }`}
              >
                <span className="truncate flex-1">{s.title || `Sesi (${s.id.slice(0, 8)})`}</span>
              </div>
            );
          })
        ) : (
          <div className="p-4 text-center text-neutral-500 text-[11px]">
            {searchQuery ? 'Tidak ada sesi yang cocok' : 'Belum ada sesi'}
          </div>
        )}
      </div>
    </div>
  );
}
