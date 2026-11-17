import ProgressRing from './ProgressRing.jsx';

function summary(total, active) {
  if (total === 0) return 'Nothing planned yet.';
  if (active === 0) return 'All done. Nice work!';
  return `${active} task${active === 1 ? '' : 's'} to go`;
}

export default function Header({ total, completed }) {
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <header className="header">
      <div>
        <p className="eyebrow">{today}</p>
        <h1>My Tasks</h1>
        <p className="subtitle">{summary(total, total - completed)}</p>
      </div>
      <ProgressRing done={completed} total={total} />
    </header>
  );
}
