export const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const labelFor = (value) => PRIORITIES.find((p) => p.value === value)?.label ?? value;

/** Small colored label showing how important a task is. */
export function PriorityBadge({ priority }) {
  return (
    <span className={`badge priority-${priority}`} title={`Importance: ${labelFor(priority)}`}>
      <span className="dot" aria-hidden="true" />
      {labelFor(priority)}
    </span>
  );
}

/** Row of chips for choosing Low / Medium / High / Urgent. */
export function PriorityPicker({ value, onChange, idPrefix = 'priority' }) {
  return (
    <div className="priority-picker" role="radiogroup" aria-labelledby={`${idPrefix}-label`}>
      <span className="priority-picker-label" id={`${idPrefix}-label`}>Importance</span>
      {PRIORITIES.map((p) => (
        <button
          key={p.value}
          type="button"
          role="radio"
          aria-checked={value === p.value}
          className={`chip priority-${p.value} ${value === p.value ? 'selected' : ''}`}
          onClick={() => onChange(p.value)}
        >
          <span className="dot" aria-hidden="true" />
          {p.label}
        </button>
      ))}
    </div>
  );
}
