import {
  AssistantPromptResponse,
  CanonicalUmlDocument,
  CommandExecutionResponse,
  UmlCommand,
} from '../types/uml';
import { AiProviderStatus, ChatHistoryResponse, ProjectCollaborator } from '../types/collaboration';

const BASE_URL = '/api';

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
