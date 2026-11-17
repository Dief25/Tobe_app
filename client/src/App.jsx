import { useState } from 'react';
import { TasksProvider, useTasksContext } from './TasksContext.jsx';
import Header from './components/Header.jsx';
import TaskForm from './components/TaskForm.jsx';
import FilterBar from './components/FilterBar.jsx';
import TaskList from './components/TaskList.jsx';

function TodoApp() {
  const { tasks, error, dismissError, clearCompleted } = useTasksContext();
  const [filter, setFilter] = useState('all');

  const completedCount = tasks.filter((t) => t.completed).length;
  const activeCount = tasks.length - completedCount;

  return (
    <div className="page">
      <main className="card">
        <Header total={tasks.length} completed={completedCount} />

        <TaskForm />

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

        <TaskList filter={filter} />

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

export default function App() {
  return (
    <TasksProvider>
      <TodoApp />
    </TasksProvider>
  );
}
