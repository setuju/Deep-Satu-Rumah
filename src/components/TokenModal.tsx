import React, { useState } from 'react';
import { Key, Save, X, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface TokenModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TokenModal({ isOpen, onClose }: TokenModalProps) {
  const { state, dispatch, testConnection } = useApp();
  const [tokenVal, setTokenVal] = useState(state.token);
  const [showToken, setShowToken] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: 'SET_TOKEN', payload: tokenVal });
    setSavedSuccess(true);
    await testConnection();
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-sans text-xs">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
            <Key className="w-4 h-4 text-emerald-400" />
            <span>Token Management (DEEPSEEK_TOKEN)</span>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <p className="text-neutral-400 text-xs leading-relaxed">
            Masukkan JWT Bearer token dari browser Developer Tools di <code>chat.deepseek.com</code> untuk mengaktifkan deepterm core &amp; WASM PoW solver.
          </p>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-neutral-300">DeepSeek Token (Bearer)</label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={tokenVal}
                onChange={(e) => setTokenVal(e.target.value)}
                placeholder="eyJhbGciOi..."
                className="w-full pl-3 pr-9 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2.5 top-2 text-neutral-500 hover:text-neutral-300"
              >
                {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shadow-sm"
            >
              {savedSuccess ? <ShieldCheck className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span>{savedSuccess ? 'Tersimpan & Menguji...' : 'Simpan & Validasi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
