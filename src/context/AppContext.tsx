import React, { createContext, useContext, useReducer, useEffect } from 'react';
import api from '../services/api';

export interface TerminalEntry {
  id: string;
  command: string;
  output: string;
  status: 'success' | 'error' | 'running';
  timestamp: string;
}

export interface AppState {
  theme: 'dark' | 'light';
  currentDirectory: string;
  terminalHistory: TerminalEntry[];
  token: string;
  authStatus: {
    tested: boolean;
    valid: boolean;
    loading: boolean;
    accountName?: string;
    message: string;
  };
  liveLogs: Array<{
    id: string;
    timestamp: string;
    type: 'request' | 'response' | 'error' | 'info';
    text: string;
  }>;
}

type AppAction =
  | { type: 'SET_THEME'; payload: 'dark' | 'light' }
  | { type: 'SET_CURRENT_DIRECTORY'; payload: string }
  | { type: 'ADD_TERMINAL_ENTRY'; payload: TerminalEntry }
  | { type: 'CLEAR_TERMINAL' }
  | { type: 'SET_TOKEN'; payload: string }
  | { type: 'SET_AUTH_STATUS'; payload: Partial<AppState['authStatus']> }
  | { type: 'ADD_LOG'; payload: { type: 'request' | 'response' | 'error' | 'info'; text: string } };

const initialStoredTheme = (typeof window !== 'undefined' && (localStorage.getItem('deepterm_theme') as 'dark' | 'light')) || 'dark';
const initialStoredToken = (typeof window !== 'undefined' && localStorage.getItem('deepterm_token')) || '';

const initialState: AppState = {
  theme: initialStoredTheme,
  currentDirectory: '/app/applet',
  terminalHistory: [
    {
      id: 'init-1',
      command: 'deepterm --version',
      output: 'DeepTerm v1.0.0 (WASM PoW Engine + Node.js ES Modules)',
      status: 'success',
      timestamp: new Date().toLocaleTimeString()
    }
  ],
  token: initialStoredToken,
  authStatus: {
    tested: false,
    valid: false,
    loading: false,
    message: 'Token belum diuji'
  },
  liveLogs: [
    {
      id: 'log-1',
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      text: 'DeepTerm backend runtime ready at port 3000'
    }
  ]
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_THEME':
      if (typeof window !== 'undefined') localStorage.setItem('deepterm_theme', action.payload);
      return { ...state, theme: action.payload };

    case 'SET_CURRENT_DIRECTORY':
      return { ...state, currentDirectory: action.payload };

    case 'ADD_TERMINAL_ENTRY':
      return {
        ...state,
        terminalHistory: [...state.terminalHistory.slice(-99), action.payload]
      };

    case 'CLEAR_TERMINAL':
      return { ...state, terminalHistory: [] };

    case 'SET_TOKEN':
      api.setDeepseekToken(action.payload);
      return { ...state, token: action.payload };

    case 'SET_AUTH_STATUS':
      return { ...state, authStatus: { ...state.authStatus, ...action.payload } };

    case 'ADD_LOG':
      return {
        ...state,
        liveLogs: [
          ...state.liveLogs.slice(-49),
          {
            id: `log_${Date.now()}_${Math.random()}`,
            timestamp: new Date().toLocaleTimeString(),
            ...action.payload
          }
        ]
      };

    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  testConnection: () => Promise<void>;
  executeCommand: (cmd: string) => Promise<void>;
}>({
  state: initialState,
  dispatch: () => null,
  testConnection: async () => {},
  executeCommand: async () => {}
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    if (state.theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  }, [state.theme]);

  const testConnection = async () => {
    dispatch({ type: 'SET_AUTH_STATUS', payload: { loading: true, message: 'Menguji token...' } });
    dispatch({ type: 'ADD_LOG', payload: { type: 'request', text: 'GET /auth/verify' } });

    const result = await api.verifyDeepseekToken(state.token);
    if (result.success) {
      const user = result.profile?.email || result.profile?.name || 'DeepSeek User';
      dispatch({
        type: 'SET_AUTH_STATUS',
        payload: {
          tested: true,
          valid: true,
          loading: false,
          accountName: user,
          message: `✅ Token Valid! Terhubung sebagai ${user}.`
        }
      });
      dispatch({ type: 'ADD_LOG', payload: { type: 'response', text: `HTTP 200 /auth/verify (User: ${user})` } });
    } else {
      dispatch({
        type: 'SET_AUTH_STATUS',
        payload: {
          tested: true,
          valid: false,
          loading: false,
          message: `❌ ${result.error || 'Gagal memverifikasi token'}`
        }
      });
      dispatch({ type: 'ADD_LOG', payload: { type: 'error', text: `Verification failed: ${result.error}` } });
    }
  };

  const executeCommand = async (rawCommand: string) => {
    const cmd = rawCommand.trim();
    if (!cmd) return;

    if (cmd === 'clear') {
      dispatch({ type: 'CLEAR_TERMINAL' });
      return;
    }

    dispatch({ type: 'ADD_LOG', payload: { type: 'request', text: `Command exec: ${cmd}` } });

    let output = '';
    let status: 'success' | 'error' = 'success';

    try {
      if (cmd.startsWith('/file list')) {
        const parts = cmd.split(/\s+/);
        const targetDir = parts[2] || '';
        const items = await api.listFiles(targetDir);
        output = items.map((i) => `${i.type === 'dir' ? '📁' : '📄'} ${i.path}`).join('\n') || '(directory empty)';
      } else if (cmd.startsWith('/file read')) {
        const filePath = cmd.split(/\s+/)[2];
        if (!filePath) throw new Error('Path required: /file read <path>');
        output = await api.readFile(filePath);
      } else if (cmd.startsWith('/file write')) {
        const parts = cmd.split(/\s+/);
        const filePath = parts[2];
        const content = parts.slice(3).join(' ');
        if (!filePath) throw new Error('Path required: /file write <path> <content>');
        output = await api.writeFile(filePath, content);
      } else if (cmd.startsWith('/file edit')) {
        const parts = cmd.split(/\s+/);
        const filePath = parts[2];
        const oldStr = parts[3];
        const newStr = parts.slice(4).join(' ');
        if (!filePath || oldStr === undefined) throw new Error('Usage: /file edit <path> <old> <new>');
        output = await api.editFile(filePath, oldStr, newStr);
      } else {
        // Run shell execution
        const execCmd = cmd.startsWith('/exec ') ? cmd.slice(6) : cmd;
        const res = await api.executeShell(execCmd);
        if (res.success) {
          output = [res.stdout, res.stderr].filter(Boolean).join('\n') || '[Command executed with no output]';
        } else {
          status = 'error';
          output = `Error: ${res.error}\n${res.stderr || ''}`.trim();
        }
      }
    } catch (err: any) {
      status = 'error';
      output = `Execution Error: ${err.message}`;
    }

    dispatch({
      type: 'ADD_TERMINAL_ENTRY',
      payload: {
        id: `cmd_${Date.now()}`,
        command: cmd,
        output,
        status,
        timestamp: new Date().toLocaleTimeString()
      }
    });

    dispatch({
      type: 'ADD_LOG',
      payload: {
        type: status === 'success' ? 'response' : 'error',
        text: `Result (${status}): ${output.slice(0, 80).replace(/\n/g, ' ')}...`
      }
    });
  };

  return (
    <AppContext.Provider value={{ state, dispatch, testConnection, executeCommand }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
export const useAppContext = useApp;
export default AppContext;
