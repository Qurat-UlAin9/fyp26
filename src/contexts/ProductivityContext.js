import React, { createContext, useContext, useMemo, useState } from 'react';

const ProductivityContext = createContext(null);

const initialTasks = [
  {
    id: 't1',
    title: 'Complete assignment draft',
    deadline: '2026-05-16',
    dayKey: 'Mon',
    startHour: 10,
    duration: 2,
    expanded: false,
    subtasks: [
      { id: '1-1', title: 'Create outline', done: true },
      { id: '1-2', title: 'Write intro', done: false },
      { id: '1-3', title: 'Add references', done: false },
    ],
  },
  {
    id: 't2',
    title: 'Prepare presentation',
    deadline: '2026-05-17',
    dayKey: 'Tue',
    startHour: 14,
    duration: 1,
    expanded: false,
    subtasks: [
      { id: '2-1', title: 'Gather slides', done: true },
      { id: '2-2', title: 'Add speaker notes', done: true },
      { id: '2-3', title: 'Practice once', done: false },
    ],
  },
];

export function ProductivityProvider({ children }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeSessionTask, setActiveSessionTask] = useState(null);
  const [profile] = useState({ firstName: 'Alex' });
  const [mood, setMood] = useState('Steady');

  const addTask = (task) => {
    const dayKeys = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const id = Date.now().toString();
    setTasks((prev) => [
      ...prev,
      {
        id,
        title: task.title,
        deadline: task.deadline || '2026-05-20',
        dayKey: task.dayKey || dayKeys[new Date().getDay()],
        startHour: Number(task.startHour) || 9,
        duration: Number(task.duration) || 1,
        expanded: false,
        subtasks: task.subtasks || [],
      },
    ]);
  };

  const value = useMemo(
    () => ({
      tasks,
      setTasks,
      addTask,
      activeSessionTask,
      setActiveSessionTask,
      profile,
      mood,
      setMood,
    }),
    [tasks, activeSessionTask, profile, mood]
  );

  return <ProductivityContext.Provider value={value}>{children}</ProductivityContext.Provider>;
}

export function useProductivity() {
  const ctx = useContext(ProductivityContext);
  if (!ctx) {
    throw new Error('useProductivity must be used within ProductivityProvider');
  }
  return ctx;
}
