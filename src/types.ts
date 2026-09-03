export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolCall?: {
    tool: string;
    command?: string;
    output?: string;
    status?: 'running' | 'completed' | 'error';
  };
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface ConnectionStatus {
  tested: boolean;
  loading: boolean;
  success: boolean;
  message: string;
  latencyMs?: number;
  accountName?: string;
}

export interface ThinkingState {
  active: boolean;
  stage: 'thinking' | 'pow' | 'executing' | 'finalizing';
  title: string;
  subtitle: string;
}
