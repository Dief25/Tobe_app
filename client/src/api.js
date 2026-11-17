const BASE = '/api';

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  if (res.status === 204) return null;

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) throw new Error(data?.error || `The server returned an error (HTTP ${res.status}).`);
  // A non-JSON success usually means /api was answered by the frontend
  // (e.g. index.html) instead of the API, i.e. the API route isn't wired up.
  if (!isJson) throw new Error('The API did not respond. /api requests are not reaching the server.');
  return data;
}

export const api = {
  list: () => request('/tasks'),
  create: (title) => request('/tasks', { method: 'POST', body: JSON.stringify({ title }) }),
  update: (id, changes) => request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(changes) }),
  remove: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  clearCompleted: () => request('/tasks?completed=true', { method: 'DELETE' }),
};
