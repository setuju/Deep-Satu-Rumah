export interface FileItem {
  name: string;
  type: 'file' | 'dir';
  path: string;
}

export interface ExecResult {
  success: boolean;
  stdout?: string;
  stderr?: string;
  error?: string;
}

class ApiService {
  private baseUrl: string;
  private deepseekToken: string;
  private jwtToken: string;

  constructor() {
    this.baseUrl = (typeof window !== 'undefined' && (window as any).__API_BASE__) || 'http://localhost:3000';
    this.deepseekToken = (typeof window !== 'undefined' && localStorage.getItem('deepterm_token')) || '';
    this.jwtToken = (typeof window !== 'undefined' && localStorage.getItem('deepterm_jwt')) || '';
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setDeepseekToken(token: string) {
    this.deepseekToken = token;
    if (typeof window !== 'undefined') localStorage.setItem('deepterm_token', token);
  }

  getDeepseekToken(): string {
    return this.deepseekToken;
  }

  setJwtToken(token: string) {
    this.jwtToken = token;
    if (typeof window !== 'undefined') localStorage.setItem('deepterm_jwt', token);
  }

  getJwtToken(): string {
    return this.jwtToken;
  }

  private getHeaders(contentType: boolean = true): HeadersInit {
    const headers: Record<string, string> = {};
    if (contentType) headers['Content-Type'] = 'application/json';
    const effectiveToken = this.deepseekToken || this.jwtToken;
    if (effectiveToken) {
      headers['Authorization'] = `Bearer ${effectiveToken}`;
    }
    return headers;
  }

  async checkHealth(): Promise<{ status: string; uptime?: number }> {
    const res = await fetch(`${this.baseUrl}/health`);
    if (!res.ok) throw new Error(`Health check failed (${res.status})`);
    return res.json();
  }

  async verifyDeepseekToken(token?: string): Promise<{ success: boolean; profile?: any; error?: string }> {
    const activeToken = token || this.deepseekToken;
    if (!activeToken) return { success: false, error: 'Token belum diisi' };

    try {
      const res = await fetch(`${this.baseUrl}/auth/verify`, {
        headers: { Authorization: `Bearer ${activeToken.trim()}` }
      });
      const data = await res.json();
      return { success: res.ok && data.success, profile: data.profile, error: data.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async listFiles(dir: string = ''): Promise<FileItem[]> {
    const res = await fetch(`${this.baseUrl}/file/list?dir=${encodeURIComponent(dir)}`, {
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to list files');
    return data.items || [];
  }

  async readFile(filePath: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/file/read?path=${encodeURIComponent(filePath)}`, {
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to read file');
    return data.content || '';
  }

  async writeFile(filePath: string, content: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/file/write`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ path: filePath, content })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to write file');
    return data.message || 'OK';
  }

  async editFile(filePath: string, oldStr: string, newStr: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/file/edit`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ path: filePath, old_str: oldStr, new_str: newStr })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to edit file');
    return data.message || 'OK';
  }

  async executeShell(command: string): Promise<ExecResult> {
    const res = await fetch(`${this.baseUrl}/exec`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ command })
    });
    const data = await res.json();
    return data;
  }

  async getSessions(): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/sessions`, {
      headers: this.getHeaders()
    });
    const data = await res.json();
    return data?.data?.biz_data?.chat_sessions || [];
  }

  async createSession(): Promise<string | null> {
    const res = await fetch(`${this.baseUrl}/sessions`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    const data = await res.json();
    return data?.data?.biz_data?.id || null;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return res.ok;
  }
}

export const api = new ApiService();
export default api;
