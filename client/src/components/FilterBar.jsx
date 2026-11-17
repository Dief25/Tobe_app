const LABELS = { all: 'All', active: 'Active', completed: 'Completed' };

export default function FilterBar({ filter, onChange, counts }) {
  return (
    <div className="filters" role="tablist" aria-label="Filter tasks">
      {Object.entries(LABELS).map(([key, label]) => (
        <button
          key={key}
          role="tab"
          aria-selected={filter === key}
          className={`filter ${filter === key ? 'active' : ''}`}
          onClick={() => onChange(key)}
        >
          {label}
          <span className="count">{counts[key]}</span>
        </button>
      ))}
    </div>
  );
}
