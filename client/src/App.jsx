import { useMemo, useState } from 'react';
import { useTasks } from './useTasks.js';
import TaskForm from './components/TaskForm.jsx';
import TaskList from './components/TaskList.jsx';
import FilterBar from './components/FilterBar.jsx';
import ProgressRing from './components/ProgressRing.jsx';

const FILTERS = {
  all: () => true,
  active: (t) => !t.completed,
  completed: (t) => t.completed,
};

export default function App() {
  const { tasks, loading, error, dismissError, addTask, updateTask, deleteTask, clearCompleted } = useTasks();
  const [filter, setFilter] = useState('all');

  const visible = useMemo(() => tasks.filter(FILTERS[filter]), [tasks, filter]);
  const completedCount = tasks.filter((t) => t.completed).length;
  const activeCount = tasks.length - completedCount;

  return (
    <div className="page">
      <main className="card">
        <header className="header">
          <div>
            <p className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <h1>Tobe</h1>
            <p className="subtitle">
              {tasks.length === 0
                ? 'Nothing planned yet.'
                : activeCount === 0
                  ? 'All done. Nice work!'
                  : `${activeCount} task${activeCount === 1 ? '' : 's'} to go`}
            </p>
          </div>
          <ProgressRing done={completedCount} total={tasks.length} />
        </header>

        <TaskForm onAdd={addTask} />

        {error && (
          <div className="alert" role="alert">
            <span>{error}</span>
            <button className="alert-close" onClick={dismissError} aria-label="Dismiss error">×</button>
          </div>
        )}

        {tasks.length > 0 && (
          <FilterBar
            filter={filter}
            onChange={setFilter}
            counts={{ all: tasks.length, active: activeCount, completed: completedCount }}
          />
        )}

        {loading ? (
          <div className="empty"><span className="spinner" aria-label="Loading" /></div>
        ) : (
          <TaskList tasks={visible} filter={filter} onUpdate={updateTask} onDelete={deleteTask} />
        )}

        {completedCount > 0 && (
          <footer className="footer">
            <button className="link-button" onClick={clearCompleted}>
              Clear {completedCount} completed
            </button>
          </footer>
        )}
      </main>
    </div>
  );
}
