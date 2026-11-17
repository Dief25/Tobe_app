import TaskItem from './TaskItem.jsx';

const EMPTY_MESSAGES = {
  all: ['Your list is clear', 'Add your first task above to get started.'],
  active: ['No active tasks', 'Everything is checked off.'],
  completed: ['Nothing completed yet', 'Tick a task off to see it here.'],
};

export default function TaskList({ tasks, filter, onUpdate, onDelete }) {
  if (tasks.length === 0) {
    const [title, hint] = EMPTY_MESSAGES[filter];
    return (
      <div className="empty">
        <div className="empty-icon" aria-hidden="true">✓</div>
        <p className="empty-title">{title}</p>
        <p className="empty-hint">{hint}</p>
      </div>
    );
  }

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} onUpdate={onUpdate} onDelete={onDelete} />
      ))}
    </ul>
  );
}
