import { createContext, useContext } from 'react';
import { useTasks } from './useTasks.js';

const TasksContext = createContext(null);

/** Shares one task list (and its API actions) with every component. */
export function TasksProvider({ children }) {
  return <TasksContext.Provider value={useTasks()}>{children}</TasksContext.Provider>;
}

export function useTasksContext() {
  const value = useContext(TasksContext);
  if (!value) throw new Error('useTasksContext must be used inside <TasksProvider>.');
  return value;
}
