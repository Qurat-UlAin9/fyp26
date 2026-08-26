//compatibility layer

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react';

import { useAppData } from './AppDataContext';

const ProductivityContext =
  createContext(null);

export function ProductivityProvider({
  children,
}) {
  const {
    tasks,
    addTask: addBackendTask,
    updateTask,
    deleteTask,
    focusSessions,
    profile,
  } = useAppData();

  const [
    activeSessionTask,
    setActiveSessionTask,
  ] = useState(null);

  const [mood, setMood] =
    useState('Steady');

  /*
   * Preserve the task shape expected by
   * existing Productivity screens.
   */
  const productivityTasks =
    useMemo(
      () =>
        tasks.map((task) => ({
          ...task,

          id: task.id,

          title:
            task.title || '',

          deadline:
            task.dueDate ||
            task.due_date ||
            null,

          dayKey:
            task.dueDate
              ? new Date(
                  task.dueDate
                ).toLocaleDateString(
                  'en-US',
                  {
                    weekday: 'short',
                  }
                )
              : null,

          startHour:
            task.startHour || 9,

          duration:
            task.estimatedMinutes
              ? Math.max(
                  1,
                  Math.ceil(
                    task.estimatedMinutes /
                      60
                  )
                )
              : 1,

          expanded:
            Boolean(task.expanded),

          subtasks:
            Array.isArray(
              task.subtasks
            )
              ? task.subtasks
              : [],
        })),
      [tasks]
    );

  /*
   * This function now creates the task
   * in Supabase through the backend.
   */
  const addTask = async (task) => {
    const payload = {
      title: task.title,

      description:
        task.description ||
        null,

      notes:
        task.notes ||
        null,

      status:
        task.status ||
        'Pending',

      priority:
        task.priority ||
        'Medium',

      difficulty:
        task.difficulty ||
        'Medium',

      start_date:
        task.start_date ||
        null,

      due_date:
        task.due_date ||
        task.deadline ||
        null,

      estimated_minutes:
        task.estimated_minutes ||
        (
          task.duration
            ? Number(task.duration) *
              60
            : null
        ),

      metadata: {
        ...(task.metadata || {}),

        dayKey:
          task.dayKey ||
          null,

        startHour:
          task.startHour ||
          null,

        subtasks:
          task.subtasks ||
          [],
      },
    };

    return addBackendTask(
      payload
    );
  };

  const value = useMemo(
    () => ({
      /*
       * Backend-backed tasks
       */
      tasks:
        productivityTasks,

      /*
       * Existing screen compatibility
       */
      setTasks: () => {
        console.warn(
          'setTasks is deprecated. Use addTask, updateTask or deleteTask so changes are synchronized with the backend.'
        );
      },

      addTask,

      updateTask,

      deleteTask,

      /*
       * Focus
       */
      focusSessions,

      activeSessionTask,

      setActiveSessionTask,

      /*
       * Profile
       */
      profile,

      /*
       * Mood
       */
      mood,

      setMood,
    }),
    [
      productivityTasks,
      addTask,
      updateTask,
      deleteTask,
      focusSessions,
      activeSessionTask,
      profile,
      mood,
    ]
  );

  return (
    <ProductivityContext.Provider
      value={value}
    >
      {children}
    </ProductivityContext.Provider>
  );
}

export function useProductivity() {
  const ctx =
    useContext(
      ProductivityContext
    );

  if (!ctx) {
    throw new Error(
      'useProductivity must be used within <ProductivityProvider>'
    );
  }

  return ctx;
}