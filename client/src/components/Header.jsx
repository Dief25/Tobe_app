import { useEffect, useRef, useState } from 'react';
import ProgressRing from './ProgressRing.jsx';
import { burstFrom } from '../celebrate.js';
import { useTasksContext } from '../TasksContext.jsx';

function summary(total, active) {
  if (total === 0) return 'Nothing planned yet.';
  if (active === 0) return 'All done. Nice work!';
  return `${active} task${active === 1 ? '' : 's'} to go`;
}

export const listTitle = (name) => (name ? `${name}'s To-Do List` : 'My Tasks');

export default function Header({ total, completed }) {
  const { listName, loadListName, saveListName } = useTasksContext();
  const [editingName, setEditingName] = useState(false);
  const [draft, setDraft] = useState('');
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const title = listTitle(listName);
  const allDone = total > 0 && completed === total;
  const ringRef = useRef(null);
  const previous = useRef({ allDone, total });

  useEffect(() => {
    loadListName();
  }, [loadListName]);

  useEffect(() => {
    document.title = title;
  }, [title]);

  // Big celebration when the last open task gets done. Not on page load
  // (the list starts empty, so `total` was 0 the moment before).
  useEffect(() => {
    if (allDone && !previous.current.allDone && previous.current.total > 0) {
      burstFrom(ringRef.current, { count: 36, distance: 130, size: 1.25 });
    }
    previous.current = { allDone, total };
  }, [allDone, total]);

  function startEditing() {
    setDraft(listName);
    setEditingName(true);
  }

  async function saveName(e) {
    e.preventDefault();
    setEditingName(false);
    const name = draft.trim();
    if (name !== listName) await saveListName(name);
  }

  return (
    <header className="header">
      <div className="header-text">
        <p className="eyebrow">{today}</p>
        {editingName ? (
          <form className="name-form" onSubmit={saveName}>
            <input
              className="input name-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setEditingName(false)}
              placeholder="Your name, e.g. Dief"
              maxLength={40}
              aria-label="Your name"
              autoFocus
            />
            <div className="name-actions">
              <button type="button" className="button ghost small" onClick={() => setEditingName(false)}>Cancel</button>
              <button type="submit" className="button primary small">Save</button>
            </div>
            <p className="name-hint">
              {draft.trim() ? <>Title: <strong>{listTitle(draft.trim())}</strong></> : 'Leave empty to use "My Tasks".'}
            </p>
          </form>
        ) : (
          <div className="title-row">
            <h1 key={title}>{title}</h1>
            <button
              className="icon-button title-edit"
              onClick={startEditing}
              aria-label={listName ? 'Change the name on your list' : 'Add your name to the list'}
              title={listName ? 'Change name' : 'Add your name'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
            </button>
          </div>
        )}
        <p className="subtitle" key={summary(total, total - completed)}>{summary(total, total - completed)}</p>
      </div>
      <div className="ring-wrap" ref={ringRef}>
        <ProgressRing done={completed} total={total} />
        {allDone && (
          <span className="ring-emoji" role="img" aria-label="All tasks done!">🎉</span>
        )}
      </div>
    </header>
  );
}
