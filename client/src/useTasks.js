import { useCallback, useRef, useState } from 'react';
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
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

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

  // POST /api/tasks with { title, description, priority }
  const addTask = useCallback(async (newTask) => {
    setAdding(true);
    setError(null);
    try {
      const task = await api.create(newTask);
      setTasks((list) => [task, ...list]);
      return true;
    } catch (err) {
      setError(`Couldn't add the task: ${err.message}`);
      return false;
    } finally {
      setAdding(false);
    }
  }, []);

  // PUT /api/tasks/:id with only the fields that change.
  const saveTask = useCallback(async (original, changes, failMessage) => {
    setError(null);
    markPending(original.id, true);
    setTasks((list) => list.map((t) => (t.id === original.id ? { ...t, ...changes } : t)));
    try {
      const saved = await api.update(original.id, changes);
      setTasks((list) => list.map((t) => (t.id === saved.id ? saved : t)));
    } catch (err) {
      setTasks((list) => list.map((t) => (t.id === original.id ? original : t)));
      setError(`${failMessage}: ${err.message}`);
    } finally {
      markPending(original.id, false);
    }
  }, []);

  const toggleTask = useCallback(
    (task) => saveTask(task, { completed: !task.completed }, "Couldn't update the task"),
    [saveTask],
  );

  // Saves whichever of title, description and priority actually changed.
  const editTask = useCallback(
    (task, edits) => {
      const changes = Object.fromEntries(Object.entries(edits).filter(([key, value]) => task[key] !== value));
      if (Object.keys(changes).length === 0) return Promise.resolve();
      return saveTask(task, changes, "Couldn't save your changes");
    },
    [saveTask],
  );

  // PUT /api/tasks/order with every task id, top to bottom.
  const reorderTasks = useCallback(async (ids) => {
    setError(null);
    const previous = tasksRef.current.map((t) => t.id);
    const byPosition = (order) => (list) => {
      const rank = new Map(order.map((id, i) => [id, i]));
      // Anything not in `order` (e.g. just added) stays at the top.
      return [...list].sort((a, b) => (rank.get(a.id) ?? -1) - (rank.get(b.id) ?? -1));
    };
    setTasks(byPosition(ids));
    try {
      await api.reorder(ids);
    } catch (err) {
      if (err.status === 409) {
        setError('Your list changed somewhere else, so it was reloaded. Please try again.');
        loadTasks();
      } else {
        setTasks(byPosition(previous));
        setError(`Couldn't save the new order: ${err.message}`);
      }
    }
  }, [loadTasks]);

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
    editTask,
    reorderTasks,
    deleteTask,
    clearCompleted,
  };
}
