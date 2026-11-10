import type { CanonicalUmlDocument } from '../types/uml';
import type { DiagramVersion, DiagramVersionDetail, VersionDiff } from '../types/versions';

// CONTRACT (REST implemented by backend agent A):
//   GET  /api/diagrams/{id}/versions?limit=        -> DiagramVersion[] (newest first)
//   POST /api/diagrams/{id}/versions               body {label?, message?} -> DiagramVersion (kind CHECKPOINT)
//   GET  /api/diagrams/{id}/versions/{n}           -> DiagramVersionDetail
//   GET  /api/diagrams/{id}/versions/{n}/diff?against=current|<m> -> VersionDiff
//   POST /api/diagrams/{id}/versions/{n}/restore   body {expected_document_version?} -> CanonicalUmlDocument
// Read: any collaborator. Create/restore: OWNER or EDITOR (VIEWER gets 403).

const BASE_URL = '/api';

function headers(): HeadersInit {
  const token = localStorage.getItem('case2code_token');
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function parse<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: fallback }));
    throw new Error(err.detail || fallback);
  }
  return res.json();
}

export const versionsApi = {
  async list(diagramId: string, limit = 50): Promise<DiagramVersion[]> {
    const res = await fetch(`${BASE_URL}/diagrams/${diagramId}/versions?limit=${limit}`, {
      headers: headers(),
    });
    return parse(res, 'No se pudo cargar el historial de versiones');
  },

  async createCheckpoint(
    diagramId: string,
    label?: string,
    message?: string,
  ): Promise<DiagramVersion> {
    const res = await fetch(`${BASE_URL}/diagrams/${diagramId}/versions`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ label, message }),
    });
    return parse(res, 'No se pudo crear el checkpoint');
  },

  async get(diagramId: string, number: number): Promise<DiagramVersionDetail> {
    const res = await fetch(`${BASE_URL}/diagrams/${diagramId}/versions/${number}`, {
      headers: headers(),
    });
    return parse(res, 'No se pudo cargar la versión');
  },

  async diff(
    diagramId: string,
    number: number,
    against: number | 'current' = 'current',
  ): Promise<VersionDiff> {
    const res = await fetch(
      `${BASE_URL}/diagrams/${diagramId}/versions/${number}/diff?against=${against}`,
      { headers: headers() },
    );
    return parse(res, 'No se pudo calcular la diferencia');
  },

  async restore(
    diagramId: string,
    number: number,
    expectedDocumentVersion?: number,
  ): Promise<CanonicalUmlDocument> {
    const res = await fetch(`${BASE_URL}/diagrams/${diagramId}/versions/${number}/restore`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ expected_document_version: expectedDocumentVersion }),
    });
    return parse(res, 'No se pudo restaurar la versión');
  },
};
