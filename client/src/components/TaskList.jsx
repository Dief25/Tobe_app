import { useEffect, useRef, useState } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useTasksContext } from '../TasksContext.jsx';
import TaskItem from './TaskItem.jsx';

const FILTERS = {
  all: () => true,
  active: (t) => !t.completed,
  completed: (t) => t.completed,
};

const EMPTY_MESSAGES = {
  all: ['Your list is clear', 'Add your first task above to get started.'],
  active: ['No active tasks', 'Everything is checked off.'],
  completed: ['Nothing completed yet', 'Tick a task off to see it here.'],
};

export default function TaskList({ filter }) {
  const { tasks, loading, loadError, loadTasks, reorderTasks } = useTasksContext();
  const [droppedId, setDroppedId] = useState(null);
  const dropTimer = useRef(null);

  const sensors = useSensors(
    // Start dragging after a 4px move, so a plain click on the handle does nothing.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const titleOf = (id) => tasks.find((t) => t.id === id)?.title ?? 'task';
  const announcements = {
    onDragStart: ({ active }) => `Picked up "${titleOf(active.id)}".`,
    onDragOver: ({ active, over }) => (over ? `"${titleOf(active.id)}" is over "${titleOf(over.id)}".` : undefined),
    onDragEnd: ({ active, over }) => (over ? `Dropped "${titleOf(active.id)}".` : 'Reorder cancelled.'),
    onDragCancel: () => 'Reorder cancelled.',
  };

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    // Move within the full list, so reordering a filtered view keeps hidden tasks in place.
    const ids = tasks.map((t) => t.id);
    reorderTasks(arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id)));
    setDroppedId(active.id);
    clearTimeout(dropTimer.current);
    dropTimer.current = setTimeout(() => setDroppedId(null), 450);
  }

  useEffect(() => () => clearTimeout(dropTimer.current), []);

  // GET /api/tasks when the list first appears.
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  if (loading) {
    return (
      <div className="empty" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        <p className="empty-hint">Loading tasks…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="empty load-error" role="alert">
        <div className="empty-icon error" aria-hidden="true">!</div>
        <p className="empty-title">Couldn't load your tasks</p>
        <p className="empty-hint">{loadError}</p>
        <button className="button secondary" onClick={loadTasks}>Try again</button>
      </div>
    );
  }

  const visible = tasks.filter(FILTERS[filter]);

  if (visible.length === 0) {
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
      accessibility={{ announcements }}
    >
      <SortableContext items={visible.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ul className="task-list">
          {visible.map((task) => (
            <TaskItem key={task.id} task={task} justDropped={task.id === droppedId} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
