import { CanonicalUmlDocument, CommandExecutionResponse, UmlCommand } from '../types/uml';

const BASE_URL = '/api';

export const api = {
  async listDiagrams(): Promise<CanonicalUmlDocument[]> {
    const res = await fetch(`${BASE_URL}/diagrams`);
    if (!res.ok) throw new Error('Failed to fetch diagrams');
    return res.json();
  },

  async createDiagram(name: string, description?: string): Promise<CanonicalUmlDocument> {
    const res = await fetch(`${BASE_URL}/diagrams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    if (!res.ok) throw new Error('Failed to create diagram');
    return res.json();
  },

  async getDiagram(diagramId: string): Promise<CanonicalUmlDocument> {
    const res = await fetch(`${BASE_URL}/diagrams/${diagramId}`);
    if (!res.ok) throw new Error(`Failed to load diagram: ${diagramId}`);
    return res.json();
  },

  async executeCommand(diagramId: string, command: UmlCommand): Promise<CommandExecutionResponse> {
    const res = await fetch(`${BASE_URL}/diagrams/${diagramId}/commands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch(url, { method: 'POST' });
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
};
