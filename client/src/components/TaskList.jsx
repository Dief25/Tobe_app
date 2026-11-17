import { useEffect } from 'react';
import { useTasksContext } from '../TasksContext.jsx';
import TaskItem from './TaskItem.jsx';

const FILTERS = {
  all: () => true,
  active: (t) => !t.completed,
  completed: (t) => t.completed,
};

const EMPTY_MESSAGES = {
  all: ['Your list is clear', 'Add your first task above to get started.'],
  active: ['No active tasks', 'Everything is checked off.'],
  completed: ['Nothing completed yet', 'Tick a task off to see it here.'],
};

export default function TaskList({ filter }) {
  const { tasks, loading, loadError, loadTasks } = useTasksContext();

  // GET /api/tasks when the list first appears.
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  if (loading) {
    return (
      <div className="empty" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        <p className="empty-hint">Loading tasks…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="empty load-error" role="alert">
        <div className="empty-icon error" aria-hidden="true">!</div>
        <p className="empty-title">Couldn't load your tasks</p>
        <p className="empty-hint">{loadError}</p>
        <button className="button secondary" onClick={loadTasks}>Try again</button>
      </div>
    );
  }

  const visible = tasks.filter(FILTERS[filter]);

  if (visible.length === 0) {
    const [title, hint] = EMPTY_MESSAGES[filter];
    return (
      <div className="empty">
        <div className="empty-icon" aria-hidden="true">✓</div>
        <p className="empty-title">{title}</p>
        <p className="empty-hint">{hint}</p>
      </div>
    );
  }

  return (
    <ul className="task-list">
      {visible.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </ul>
  );
}
