import { useEffect, useRef, useState } from 'react';
import { useTasksContext } from '../TasksContext.jsx';

export default function TaskItem({ task }) {
  const { toggleTask, renameTask, deleteTask, isPending } = useTasksContext();
  const saving = isPending(task.id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function startEditing() {
    setDraft(task.title);
    setEditing(true);
  }

  function save() {
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed && trimmed !== task.title) renameTask(task, trimmed);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') setEditing(false);
  }

  return (
    <li className={`task ${task.completed ? 'done' : ''} ${saving ? 'saving' : ''}`} aria-busy={saving}>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => toggleTask(task)}
          disabled={saving}
          aria-label={`Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`}
        />
        <span className="checkmark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5L20 7" />
          </svg>
        </span>
      </label>

      {editing ? (
        <input
          ref={inputRef}
          className="input edit-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={handleKeyDown}
          maxLength={200}
          aria-label="Edit task"
        />
      ) : (
        <span className="task-title" onDoubleClick={startEditing} title="Double-click to edit">
          {task.title}
        </span>
      )}

      {!editing && (
        <div className="task-actions">
          <button className="icon-button" onClick={startEditing} disabled={saving} aria-label={`Edit "${task.title}"`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          </button>
          <button className="icon-button danger" onClick={() => deleteTask(task)} disabled={saving} aria-label={`Delete "${task.title}"`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            </svg>
          </button>
        </div>
      )}
    </li>
  );
}
