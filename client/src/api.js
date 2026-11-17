// Base URL of the Express API. Set VITE_API_URL to point at a different
// server (e.g. http://localhost:4000/api); by default the API is expected
// on the same origin under /api (Vite's dev proxy, `npm start`, Vercel).
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

async function request(path, { body, ...options } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  if (res.status === 204) return null;

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) throw new Error(data?.error || `The server returned an error (HTTP ${res.status}).`);
  // A non-JSON success usually means the request was answered by the
  // frontend (e.g. index.html) instead of the API.
  if (!isJson) throw new Error(`The API did not respond. Requests to ${API_BASE_URL} are not reaching the server.`);
  return data;
}

export const api = {
  /** GET /tasks — all tasks, newest first */
  list: () => request('/tasks'),
  /** POST /tasks — create a task */
  create: (title) => request('/tasks', { method: 'POST', body: { title } }),
  /** PUT /tasks/:id — replace a task's title and completed state */
  replace: (id, { title, completed }) => request(`/tasks/${id}`, { method: 'PUT', body: { title, completed } }),
  /** DELETE /tasks/:id */
  remove: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  /** DELETE /tasks?completed=true */
  clearCompleted: () => request('/tasks?completed=true', { method: 'DELETE' }),
};
