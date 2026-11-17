import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

/**
 * Owns the task list state. Edits, toggles and deletes are applied
 * optimistically and rolled back if the server rejects them.
 */
export function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .list()
      .then(setTasks)
      .catch(() => setError('Could not reach the server. Is the API running?'))
      .finally(() => setLoading(false));
  }, []);

  // Apply a local change now; restore the previous list if the request fails.
  const optimistic = useCallback(async (apply, send) => {
    let previous;
    setTasks((current) => {
      previous = current;
      return apply(current);
    });
    try {
      setError(null);
      return await send();
    } catch (err) {
      setTasks(previous);
      setError(err.message);
      return null;
    }
  }, []);

  const addTask = useCallback(async (title) => {
    try {
      setError(null);
      const task = await api.create(title);
      setTasks((current) => [task, ...current]);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  const updateTask = useCallback(
    (id, changes) =>
      optimistic(
        (list) => list.map((t) => (t.id === id ? { ...t, ...changes } : t)),
        async () => {
          const saved = await api.update(id, changes);
          setTasks((list) => list.map((t) => (t.id === id ? saved : t)));
          return saved;
        },
      ),
    [optimistic],
  );

  const deleteTask = useCallback(
    (id) => optimistic((list) => list.filter((t) => t.id !== id), () => api.remove(id)),
    [optimistic],
  );

  const clearCompleted = useCallback(
    () => optimistic((list) => list.filter((t) => !t.completed), () => api.clearCompleted()),
    [optimistic],
  );

  return { tasks, loading, error, dismissError: () => setError(null), addTask, updateTask, deleteTask, clearCompleted };
}
