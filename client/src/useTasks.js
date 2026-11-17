import { useCallback, useState } from 'react';
import { api } from './api.js';

// The server returns tasks newest first; keep that order when restoring.
const newestFirst = (a, b) => b.createdAt.localeCompare(a.createdAt);
const restore = (list, removed) =>
  [...list.filter((t) => !removed.some((r) => r.id === t.id)), ...removed].sort(newestFirst);

/**
 * Task state synced with the API. Toggles, renames and deletes show up
 * immediately and are undone if the server rejects them.
 */
export function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [error, setError] = useState(null); // last failed action
  const [adding, setAdding] = useState(false);
  const [pendingIds, setPendingIds] = useState(() => new Set());

  const markPending = (id, on) =>
    setPendingIds((current) => {
      const next = new Set(current);
      on ? next.add(id) : next.delete(id);
      return next;
    });

  // GET /api/tasks
  const loadTasks = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setTasks(await api.list());
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // POST /api/tasks
  const addTask = useCallback(async (title) => {
    setAdding(true);
    setError(null);
    try {
      const task = await api.create(title);
      setTasks((list) => [task, ...list]);
      return true;
    } catch (err) {
      setError(`Couldn't add the task: ${err.message}`);
      return false;
    } finally {
      setAdding(false);
    }
  }, []);

  // PUT /api/tasks/:id with the task's full new state.
  const saveTask = useCallback(async (original, next, failMessage) => {
    setError(null);
    markPending(original.id, true);
    setTasks((list) => list.map((t) => (t.id === original.id ? { ...t, ...next } : t)));
    try {
      const saved = await api.replace(original.id, next);
      setTasks((list) => list.map((t) => (t.id === saved.id ? saved : t)));
    } catch (err) {
      setTasks((list) => list.map((t) => (t.id === original.id ? original : t)));
      setError(`${failMessage}: ${err.message}`);
    } finally {
      markPending(original.id, false);
    }
  }, []);

  const toggleTask = useCallback(
    (task) => saveTask(task, { title: task.title, completed: !task.completed }, "Couldn't update the task"),
    [saveTask],
  );

  const renameTask = useCallback(
    (task, title) => saveTask(task, { title, completed: task.completed }, "Couldn't rename the task"),
    [saveTask],
  );

  // DELETE /api/tasks/:id
  const deleteTask = useCallback(async (task) => {
    setError(null);
    markPending(task.id, true);
    setTasks((list) => list.filter((t) => t.id !== task.id));
    try {
      await api.remove(task.id);
    } catch (err) {
      setTasks((list) => restore(list, [task]));
      setError(`Couldn't delete the task: ${err.message}`);
    } finally {
      markPending(task.id, false);
    }
  }, []);

  // DELETE /api/tasks?completed=true
  const clearCompleted = useCallback(async () => {
    setError(null);
    let removed = [];
    setTasks((list) => {
      removed = list.filter((t) => t.completed);
      return list.filter((t) => !t.completed);
    });
    try {
      await api.clearCompleted();
    } catch (err) {
      setTasks((list) => restore(list, removed));
      setError(`Couldn't clear completed tasks: ${err.message}`);
    }
  }, []);

  return {
    tasks,
    loading,
    loadError,
    error,
    adding,
    isPending: (id) => pendingIds.has(id),
    dismissError: () => setError(null),
    loadTasks,
    addTask,
    toggleTask,
    renameTask,
    deleteTask,
    clearCompleted,
  };
}
