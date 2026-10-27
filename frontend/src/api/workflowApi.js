const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function request(path, { tenant, apiKey, method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenant,
        'x-api-key': apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.details = data.errors || [];
    throw error;
  }
  return data;
}

// keep only what the backend needs (drops UI-only fields such as selected or dragging)
export function toPayload(name, nodes, edges) {
  return {
    name,
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data || {},
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle || null,
      targetHandle: e.targetHandle || null,
    })),
  };
}

export const listWorkflows = (auth) => request('/api/workflows', auth);

export const createWorkflow = (auth, payload) =>
  request('/api/workflows', { ...auth, method: 'POST', body: payload });

export const updateWorkflow = (auth, id, payload) =>
  request(`/api/workflows/${id}`, { ...auth, method: 'PUT', body: payload });

export const deleteWorkflow = (auth, id) =>
  request(`/api/workflows/${id}`, { ...auth, method: 'DELETE' });
