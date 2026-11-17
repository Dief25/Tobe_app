import { useState } from 'react';
import { useTasksContext } from '../TasksContext.jsx';

export default function TaskForm() {
  const { addTask, adding } = useTasksContext();
  const [title, setTitle] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || adding) return;
    // POST /api/tasks; keep the text if it fails so it can be retried.
    if (await addTask(trimmed)) setTitle('');
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <input
        className="input"
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs to be done?"
        maxLength={200}
        aria-label="New task"
        autoFocus
      />
      <button className="button primary" type="submit" disabled={!title.trim() || adding} aria-busy={adding}>
        {adding ? (
          <span className="spinner small" aria-hidden="true" />
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        )}
        {adding ? 'Adding…' : 'Add'}
      </button>
    </form>
  );
}
