import React, { useState } from 'react';
import { Key, Zap, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function TokenValidator() {
  const { state, dispatch, testConnection } = useApp();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-4 shadow-lg space-y-3 font-sans text-xs">
      <div className="flex items-center justify-between">
        <label className="text-neutral-200 font-semibold flex items-center gap-2">
          <Key className="w-3.5 h-3.5 text-amber-400" />
          <span>DEEPSEEK_TOKEN Validator</span>
        </label>
        <span className="text-[10px] text-neutral-500 font-mono">Authorization Header</span>
      </div>

      <div className="relative">
        <input
          id="token-validator-input"
          type={showPassword ? 'text' : 'password'}
          value={state.token}
          onChange={(e) => dispatch({ type: 'SET_TOKEN', payload: e.target.value })}
          placeholder="eyJhbGciOi..."
          className="w-full pl-3 pr-9 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 font-mono text-xs focus:outline-none focus:border-emerald-500/70 placeholder-neutral-600"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-2.5 top-2.5 text-neutral-500 hover:text-neutral-300"
        >
          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          id="token-test-conn-btn"
          type="button"
          onClick={testConnection}
          disabled={state.authStatus.loading}
          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 text-xs shadow-sm"
        >
          {state.authStatus.loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Zap className="w-3.5 h-3.5" />
          )}
          <span>Test Connection</span>
        </button>

        {state.authStatus.tested && (
          <div
            className={`flex items-center gap-1.5 text-[11px] font-mono font-medium ${
              state.authStatus.valid ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {state.authStatus.valid ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            <span>{state.authStatus.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
