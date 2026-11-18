// Base URL of the Express API. Set VITE_API_URL to point at a different
// server (e.g. http://localhost:4000/api); by default the API is expected
// on the same origin under /api (Vite's dev proxy, `npm start`, Vercel).
import { getListKey } from './listKey.js';

export const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

async function request(path, { body, ...options } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        // Identifies this browser's private list (see listKey.js).
        'X-List-Key': getListKey(),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  if (res.status === 204) return null;

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const error = new Error(data?.error || `The server returned an error (HTTP ${res.status}).`);
    error.status = res.status;
    throw error;
  }
  // A non-JSON success usually means the request was answered by the
  // frontend (e.g. index.html) instead of the API.
  if (!isJson) throw new Error(`The API did not respond. Requests to ${API_BASE_URL} are not reaching the server.`);
  return data;
}

export const api = {
  /** GET /tasks — all tasks, newest first */
  list: () => request('/tasks'),
  /** POST /tasks — create a task: { title, description?, priority? } */
  create: (task) => request('/tasks', { method: 'POST', body: task }),
  /** PUT /tasks/:id — update any of title, description, priority, completed */
  update: (id, changes) => request(`/tasks/${id}`, { method: 'PUT', body: changes }),
  /** PUT /tasks/order — save a new order (every task id, top to bottom) */
  reorder: (ids) => request('/tasks/order', { method: 'PUT', body: { ids } }),
  /** DELETE /tasks/:id */
  remove: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  /** GET /list — this list's optional name */
  getList: () => request('/list'),
  /** PUT /list — set or clear the name ("" clears it) */
  setListName: (name) => request('/list', { method: 'PUT', body: { name } }),
  /** DELETE /tasks?completed=true */
  clearCompleted: () => request('/tasks?completed=true', { method: 'DELETE' }),
};
