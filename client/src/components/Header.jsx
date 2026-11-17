import { useEffect, useRef } from 'react';
import ProgressRing from './ProgressRing.jsx';
import { burstFrom } from '../celebrate.js';

function summary(total, active) {
  if (total === 0) return 'Nothing planned yet.';
  if (active === 0) return 'All done. Nice work!';
  return `${active} task${active === 1 ? '' : 's'} to go`;
}

export default function Header({ total, completed }) {
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const allDone = total > 0 && completed === total;
  const ringRef = useRef(null);
  const previous = useRef({ allDone, total });

  // Big celebration when the last open task gets done. Not on page load
  // (the list starts empty, so `total` was 0 the moment before).
  useEffect(() => {
    if (allDone && !previous.current.allDone && previous.current.total > 0) {
      burstFrom(ringRef.current, { count: 36, distance: 130, size: 1.25 });
    }
    previous.current = { allDone, total };
  }, [allDone, total]);

  return (
    <header className="header">
      <div>
        <p className="eyebrow">{today}</p>
        <h1>My Tasks</h1>
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
