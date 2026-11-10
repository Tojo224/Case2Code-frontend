import {
  AssistantPromptResponse,
  CanonicalUmlDocument,
  CommandExecutionResponse,
  SqlDialect,
  SqlPreviewResponse,
  UmlCommand,
} from '../types/uml';
import {
  AiProviderStatus,
  BatchCommandsResponse,
  ChatHistoryResponse,
  ProjectCollaborator,
  ResolveProposalRequest,
  ResolveProposalResponse,
} from '../types/collaboration';

const BASE_URL = '/api';

/** HTTP error that keeps the status and parsed body (e.g. 409 carries the updated chat message). */
export class ApiError extends Error {
  status: number;
  body: any;

  constructor(message: string, status: number, body?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function throwApiError(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => null);
  const detail = body && typeof body.detail === 'string' ? body.detail : fallback;
  throw new ApiError(detail, res.status, body);
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('case2code_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  async listDiagrams(): Promise<CanonicalUmlDocument[]> {
    const res = await fetch(`${BASE_URL}/diagrams`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch diagrams');
    return res.json();
  },

  async createDiagram(name: string, description?: string): Promise<CanonicalUmlDocument> {
    const res = await fetch(`${BASE_URL}/diagrams`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, description }),
    });
    if (!res.ok) throw new Error('Failed to create diagram');
    return res.json();
  },

  async getDiagram(diagramId: string): Promise<CanonicalUmlDocument> {
    const res = await fetch(`${BASE_URL}/diagrams/${diagramId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to load diagram: ${diagramId}`);
    return res.json();
  },

  async executeCommand(diagramId: string, command: UmlCommand): Promise<CommandExecutionResponse> {
    const res = await fetch(`${BASE_URL}/diagrams/${diagramId}/commands`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ command }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errData.detail || 'Command execution failed');
    }
    return res.json();
  },

  async executeCommandsBatch(diagramId: string, commands: UmlCommand[]): Promise<BatchCommandsResponse> {
    const res = await fetch(`${BASE_URL}/diagrams/${diagramId}/commands/batch`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ commands }),
    });
    if (!res.ok) await throwApiError(res, 'Command execution failed');
    return res.json();
  },

  async resolveProposal(
    diagramId: string,
    messageId: string,
    payload: ResolveProposalRequest,
  ): Promise<ResolveProposalResponse> {
    const res = await fetch(`${BASE_URL}/diagrams/${diagramId}/chat/${messageId}/resolve`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) await throwApiError(res, 'Could not resolve proposal');
    return res.json();
  },

  async downloadBackendZip(diagramId: string, verify: boolean = false): Promise<void> {
    const url = `${BASE_URL}/diagrams/${diagramId}/generate?verify=${verify}`;
    const token = localStorage.getItem('case2code_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { method: 'POST', headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Generation failed' }));
      throw new Error(err.detail || 'Backend generation failed');
    }
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `case2code-backend-${diagramId}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  async downloadMobileAppZip(diagramId: string, diagramName?: string): Promise<void> {
    const url = `${BASE_URL}/diagrams/${diagramId}/generate/mobile`;
    const token = localStorage.getItem('case2code_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { method: 'POST', headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Mobile generation failed' }));
      throw new Error(err.detail || 'Mobile app generation failed');
    }
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    const safeName = (diagramName || `case2code-${diagramId}`).replace(/[^a-zA-Z0-9_\-]/g, '_');
    a.download = `${safeName}_flutter_mobile.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  async getSqlPreview(diagramId: string, dialect: SqlDialect = 'postgresql'): Promise<SqlPreviewResponse> {
    const url = `${BASE_URL}/diagrams/${diagramId}/sql?dialect=${encodeURIComponent(dialect)}`;
    const res = await fetch(url, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to generate SQL preview' }));
      throw new Error(err.detail || 'Failed to generate SQL preview');
    }
    return res.json();
  },

  async exportSql(diagramId: string, dialect: SqlDialect = 'postgresql', diagramName?: string): Promise<void> {
    const url = `${BASE_URL}/diagrams/${diagramId}/export/sql?dialect=${encodeURIComponent(dialect)}`;
    const token = localStorage.getItem('case2code_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'SQL export failed' }));
      throw new Error(err.detail || 'SQL export failed');
    }
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    const safeName = (diagramName || `schema-${diagramId}`).replace(/[^a-zA-Z0-9_\-]/g, '_');
    a.download = `${safeName}_${dialect}.sql`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  async exportXmi(diagramId: string, diagramName?: string): Promise<void> {
    const url = `${BASE_URL}/diagrams/${diagramId}/export/xmi`;
    const token = localStorage.getItem('case2code_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'XMI export failed' }));
      throw new Error(err.detail || 'XMI export failed');
    }
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    const safeName = (diagramName || `diagram-${diagramId}`).replace(/[^a-zA-Z0-9_\-]/g, '_');
    a.download = `${safeName}.xmi`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  /**
   * Downloads the data dictionary PDF. With `withAi` the descriptions are drafted by the LLM
   * (one request, cached per diagram version); the result says whether the AI answered
   * ('ai'), a cached answer was reused ('cache') or the automatic descriptions were used
   * instead ('fallback'). Without the flag it always returns null.
   */
  async exportDataDictionary(
    diagramId: string,
    diagramName?: string,
    withAi: boolean = false,
  ): Promise<'ai' | 'cache' | 'fallback' | null> {
    const url = `${BASE_URL}/diagrams/${diagramId}/export/docs${withAi ? '/ai' : ''}`;
    const token = localStorage.getItem('case2code_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Documentation export failed' }));
      throw new Error(err.detail || 'Documentation export failed');
    }
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    const safeName = (diagramName || `diagrama-${diagramId}`).replace(/[^a-zA-Z0-9_\-]/g, '_');
    a.download = `${safeName}_diccionario_datos${withAi ? '_ia' : ''}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
    const mode = res.headers.get('X-Docs-AI');
    return mode === 'ai' || mode === 'cache' || mode === 'fallback' ? mode : null;
  },

  async importXmi(diagramId: string, file: File): Promise<CanonicalUmlDocument> {
    const url = `${BASE_URL}/diagrams/${diagramId}/import/xmi`;
    const token = localStorage.getItem('case2code_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'XMI import failed' }));
      throw new Error(err.detail || 'XMI import failed');
    }
    return res.json();
  },

  async importNewDiagramXmi(file: File, name?: string): Promise<CanonicalUmlDocument> {
    const query = name ? `?name=${encodeURIComponent(name)}` : '';
    const url = `${BASE_URL}/diagrams/import/xmi${query}`;
    const token = localStorage.getItem('case2code_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create diagram from XMI' }));
      throw new Error(err.detail || 'Failed to create diagram from XMI');
    }
    return res.json();
  },

  async sendAssistantPrompt(
    diagramId: string,
    prompt: string,
    imageData?: { base64: string; mimeType: string }
  ): Promise<AssistantPromptResponse> {
    const payload: Record<string, any> = { prompt };
    if (imageData) {
      payload.image_base64 = imageData.base64;
      payload.image_mime_type = imageData.mimeType;
    }

    const res = await fetch(`${BASE_URL}/diagrams/${diagramId}/assistant`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Assistant request failed' }));
      throw new Error(err.detail || 'Assistant request failed');
    }
    return res.json();
  },

  // Collaborator API methods
  async getCollaborators(diagramId: string): Promise<ProjectCollaborator[]> {
    const res = await fetch(`${BASE_URL}/diagrams/${diagramId}/collaborators`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch collaborators');
    return res.json();
  },

  async addCollaborator(
    diagramId: string,
    email: string,
    role: string = 'EDITOR',
  ): Promise<ProjectCollaborator> {
    const res = await fetch(`${BASE_URL}/diagrams/${diagramId}/collaborators`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email, role }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to add collaborator' }));
      throw new Error(err.detail || 'Failed to add collaborator');
    }
    return res.json();
  },

  async removeCollaborator(diagramId: string, userId: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/diagrams/${diagramId}/collaborators/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to remove collaborator');
  },

  async getChatHistory(diagramId: string): Promise<ChatHistoryResponse> {
    const res = await fetch(`${BASE_URL}/diagrams/${diagramId}/chat`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch chat history');
    return res.json();
  },

  async getAiConfig(): Promise<AiProviderStatus> {
    const res = await fetch(`${BASE_URL}/diagrams/ai/config`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch AI provider config');
    return res.json();
  },

  async updateAiConfig(payload: {
    provider_mode?: 'local' | 'hybrid' | 'gemini';
    local_base_url?: string;
    local_model?: string;
  }): Promise<AiProviderStatus> {
    const res = await fetch(`${BASE_URL}/diagrams/ai/config`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update AI provider config');
    return res.json();
  },
};
