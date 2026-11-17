import { useEffect, useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTasksContext } from '../TasksContext.jsx';
import { burstFrom, prefersReducedMotion } from '../celebrate.js';
import { PriorityBadge, PriorityPicker } from './Priority.jsx';

const LEAVE_MS = 180;

export default function TaskItem({ task, justDropped }) {
  const { toggleTask, editTask, deleteTask, isPending } = useTasksContext();
  const saving = isPending(task.id);
  const [editing, setEditing] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [draft, setDraft] = useState(null);
  const checkRef = useRef(null);
  const titleRef = useRef(null);

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, disabled: editing });

  useEffect(() => {
    if (editing) titleRef.current?.select();
  }, [editing]);

  function startEditing() {
    setDraft({ title: task.title, description: task.description ?? '', priority: task.priority ?? 'medium' });
    setEditing(true);
  }

  function save(e) {
    e.preventDefault();
    const title = draft.title.trim();
    if (!title) return;
    setEditing(false);
    editTask(task, { title, description: draft.description.trim(), priority: draft.priority });
  }

  function handleToggle() {
    // A little celebration when a task gets done.
    if (!task.completed) burstFrom(checkRef.current);
    toggleTask(task);
  }

  function handleDelete() {
    // Let the pop-out animation play, then remove it.
    setLeaving(true);
    setTimeout(() => deleteTask(task), prefersReducedMotion() ? 0 : LEAVE_MS);
  }

  const classes = [
    'task',
    task.completed && 'done',
    saving && 'saving',
    isDragging && 'dragging',
    leaving && 'leaving',
    justDropped && 'dropped',
    editing && 'editing',
  ].filter(Boolean).join(' ');

  return (
    <li
      ref={setNodeRef}
      className={classes}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      aria-busy={saving}
    >
      <label className="checkbox" ref={checkRef}>
        <input
          type="checkbox"
          checked={task.completed}
          onChange={handleToggle}
          disabled={saving || leaving}
          aria-label={`Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`}
        />
        <span className="checkmark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5L20 7" />
          </svg>
        </span>
      </label>

      {editing ? (
        <form className="task-edit" onSubmit={save} onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}>
          <input
            ref={titleRef}
            className="input edit-input"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            maxLength={200}
            aria-label="Edit task"
          />
          <textarea
            className="input edit-input edit-description"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="Description (optional)"
            maxLength={500}
            rows={2}
            aria-label="Edit description"
          />
          <PriorityPicker
            value={draft.priority}
            onChange={(priority) => setDraft({ ...draft, priority })}
            idPrefix={`edit-priority-${task.id}`}
          />
          <div className="edit-actions">
            <button type="button" className="button ghost small" onClick={() => setEditing(false)}>Cancel</button>
            <button type="submit" className="button primary small" disabled={!draft.title.trim()}>Save</button>
          </div>
        </form>
      ) : (
        <div className="task-body" onDoubleClick={startEditing} title="Double-click to edit">
          <div className="task-line">
            <span className="task-title">{task.title}</span>
            <PriorityBadge priority={task.priority ?? 'medium'} />
          </div>
          {task.description && <p className="task-description">{task.description}</p>}
        </div>
      )}

      {!editing && (
        <div className="task-actions">
          <button
            ref={setActivatorNodeRef}
            className="icon-button drag-handle"
            aria-label={`Reorder "${task.title}" (hold and drag, or press Space then use the arrow keys)`}
            title="Hold and drag to reorder"
            disabled={saving || leaving}
            {...attributes}
            {...listeners}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
              <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
              <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
            </svg>
          </button>
          <button className="icon-button" onClick={startEditing} disabled={saving || leaving} aria-label={`Edit "${task.title}"`} title="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          </button>
          <button className="icon-button danger" onClick={handleDelete} disabled={saving || leaving} aria-label={`Delete "${task.title}"`} title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            </svg>
          </button>
        </div>
      )}
    </li>
  );
}
