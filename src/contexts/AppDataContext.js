import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getSession,

  getProfile,
  updateProfile as apiUpdateProfile,

  getADHDProfile,
  updateADHDProfile as apiUpdateADHDProfile,

  getPreferences,
  updatePreferences as apiUpdatePreferences,

  getTasks,
  createTask as apiCreateTask,
  updateTask as apiUpdateTask,
  deleteTask as apiDeleteTask,

  getHabits,
  createHabit as apiCreateHabit,
  updateHabit as apiUpdateHabit,
  deleteHabit as apiDeleteHabit,

  getFocusSessions,
  createFocusSession as apiCreateFocusSession,
  updateFocusSession as apiUpdateFocusSession,
  deleteFocusSession as apiDeleteFocusSession,

  getStatisticsSummary,
} from '../services/api';

const APP_DATA_KEY = 'adhd_app_data_v2';

const todayISO = () => {
  const date = new Date();
  return date.toISOString().slice(0, 10);
};

/* =========================================================
   UI CONSTANTS
========================================================= */

const THEME_TO_COLOR_IDX = {
  coral: 0,
  sky: 5,
  mint: 3,
  lavender: 9,
  teal: 1,
};

const HABIT_COLOR_TO_IDX = {
  coral: 0,
  blue: 5,
  green: 3,
  purple: 9,
  teal: 1,
};

const SLOT_TO_HOUR = {
  Morning: 7,
  Noon: 12,
  Evening: 18,
  Night: 21,
};

const SLOT_DURATION_MINS = 30;

/* =========================================================
   DEFAULT VALUES
========================================================= */

const defaultProfile = {
  name: 'Friend',
  email: '',
  username: '',
  avatarEmoji: '🧠',
  avatarUrl: null,
  bio: '',
  dateOfBirth: null,
  gender: null,
  occupation: '',
  country: '',
  city: '',
  timezone: 'UTC',
  onboardingCompleted: false,
  adhdScreening: 'Not completed yet',
  mood: 'Calm',
  adhdProfile: {},
  preferences: {},
};

const defaultHabitStats = {
  streakDays: 0,
  dailyTarget: 0,
  todayDone: 0,
  rollingThreeDayTarget: 0,
  rollingThreeDayDone: 0,
};

const AppDataContext = createContext(null);

/* =========================================================
   HELPER FUNCTIONS
========================================================= */

function safeNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function safeDate(value) {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function getDateParts(value) {
  const date = safeDate(value);

  if (!date) {
    return {
      date: todayISO(),
      hour: 9,
      minute: 0,
    };
  }

  return {
    date: date.toISOString().slice(0, 10),
    hour: date.getHours(),
    minute: date.getMinutes(),
  };
}

/* =========================================================
   TASK MAPPERS
========================================================= */

function normalizeTask(task) {
  if (!task) return null;

  const startDate = safeDate(task.start_date);
  const dueDate = safeDate(task.due_date);

  const startParts = getDateParts(task.start_date);
  const dueParts = getDateParts(task.due_date);

  const metadata =
    task.metadata &&
    typeof task.metadata === 'object'
      ? task.metadata
      : {};

  const subtasks = Array.isArray(task.subtasks)
    ? task.subtasks
    : Array.isArray(metadata.subtasks)
      ? metadata.subtasks
      : [];

  return {
    /*
     * Preserve database fields.
     */
    ...task,

    /*
     * Database identity.
     */
    id: task.id,

    /*
     * Basic UI fields.
     */
    title: task.title || '',
    description: task.description || '',
    notes: task.notes || '',

    status: task.status || 'Pending',
    priority: task.priority || 'Medium',
    difficulty: task.difficulty || 'Medium',

    /*
     * Database date fields.
     */
    start_date: task.start_date || null,
    due_date: task.due_date || null,
    completed_at: task.completed_at || null,
    reminder_at: task.reminder_at || null,

    /*
     * Existing frontend naming.
     */
    startDate: task.start_date || null,
    dueDate: task.due_date || null,
    completedAt: task.completed_at || null,
    reminderAt: task.reminder_at || null,

    /*
     * Repeat.
     */
    repeatType: task.repeat_type || 'None',

    /*
     * Duration / productivity.
     */
    estimatedMinutes:
      task.estimated_minutes !== null &&
      task.estimated_minutes !== undefined
        ? safeNumber(task.estimated_minutes)
        : 0,

    actualMinutes:
      task.actual_minutes !== null &&
      task.actual_minutes !== undefined
        ? safeNumber(task.actual_minutes)
        : 0,

    progress:
      task.progress !== null &&
      task.progress !== undefined
        ? safeNumber(task.progress)
        : 0,

    energyRequired:
      task.energy_required || 'Variable',

    /*
     * AI information.
     */
    createdByAI: Boolean(task.created_by_ai),

    createdSource:
      task.created_source || 'User',

    aiReason:
      task.ai_reason || null,

    /*
     * Flexible frontend metadata.
     */
    metadata,

    /*
     * Existing timeline compatibility.
     */
    startHour:
      startDate
        ? startParts.hour
        : safeNumber(task.startHour, 9),

    startMin:
      startDate
        ? startParts.minute
        : safeNumber(task.startMin, 0),

    endHour:
      dueDate
        ? dueParts.hour
        : safeNumber(task.endHour, 11),

    /*
     * UI-only theme is intentionally stored
     * inside metadata.
     */
    themeId:
      metadata.themeId ||
      task.themeId ||
      'coral',

    /*
     * Existing frontend subtask structure.
     */
    subtasks,
  };
}

function taskToApiPayload(task) {
  const metadata = {
    ...(task?.metadata || {}),
  };

  /*
   * Keep frontend-only fields in metadata.
   */
  if (task?.themeId !== undefined) {
    metadata.themeId = task.themeId;
  }

  if (task?.subtasks !== undefined) {
    metadata.subtasks = Array.isArray(task.subtasks)
      ? task.subtasks
      : [];
  }

  return {
    parent_task_id:
      task?.parent_task_id ??
      task?.parentTaskId ??
      null,

    title:
      task?.title ??
      '',

    description:
      task?.description ??
      null,

    notes:
      task?.notes ??
      null,

    status:
      task?.status ??
      'Pending',

    priority:
      task?.priority ??
      'Medium',

    difficulty:
      task?.difficulty ??
      'Medium',

    start_date:
      task?.start_date ??
      task?.startDate ??
      null,

    due_date:
      task?.due_date ??
      task?.dueDate ??
      null,

    completed_at:
      task?.completed_at ??
      task?.completedAt ??
      null,

    reminder_at:
      task?.reminder_at ??
      task?.reminderAt ??
      null,

    repeat_type:
      task?.repeat_type ??
      task?.repeatType ??
      'None',

    estimated_minutes:
      task?.estimated_minutes ??
      task?.estimatedMinutes ??
      null,

    actual_minutes:
      task?.actual_minutes ??
      task?.actualMinutes ??
      0,

    progress:
      task?.progress ??
      0,

    energy_required:
      task?.energy_required ??
      task?.energyRequired ??
      'Variable',

    created_by_ai:
      task?.created_by_ai ??
      task?.createdByAI ??
      false,

    created_source:
      task?.created_source ??
      task?.createdSource ??
      'User',

    ai_reason:
      task?.ai_reason ??
      task?.aiReason ??
      null,

    metadata,
  };
}

/* =========================================================
   HABIT MAPPERS
========================================================= */

function normalizeHabit(habit) {
  if (!habit) return null;

  const metadata =
    habit.metadata &&
    typeof habit.metadata === 'object'
      ? habit.metadata
      : {};

  const timeSlots =
    Array.isArray(metadata.timeSlots)
      ? metadata.timeSlots
      : Array.isArray(habit.timeSlots)
        ? habit.timeSlots
        : ['Morning'];

  const completions =
    Array.isArray(metadata.completions)
      ? metadata.completions
      : Array.isArray(habit.completions)
        ? habit.completions
        : [];

  const gradient =
    Array.isArray(metadata.gradient)
      ? metadata.gradient
      : Array.isArray(habit.gradient)
        ? habit.gradient
        : [];

  return {
    /*
     * Preserve database fields.
     */
    ...habit,

    id: habit.id,

    title:
      habit.title ||
      habit.name ||
      '',

    name:
      habit.name ||
      habit.title ||
      '',

    description:
      habit.description ||
      '',

    frequency:
      habit.frequency ||
      'Daily',

    goal_value:
      habit.goal_value ??
      habit.goalValue ??
      1,

    goalValue:
      habit.goal_value ??
      habit.goalValue ??
      1,

    unit:
      habit.unit ||
      'times',

    reminder_time:
      habit.reminder_time ??
      habit.reminderTime ??
      null,

    reminderTime:
      habit.reminder_time ??
      habit.reminderTime ??
      null,

    active:
      habit.active !== undefined
        ? Boolean(habit.active)
        : true,

    color:
      habit.color ||
      'blue',

    icon:
      habit.icon ||
      '✓',

    createdByAI: Boolean(
      habit.created_by_ai ??
      habit.createdByAI
    ),

    metadata,

    /*
     * Existing UI compatibility.
     */
    timeSlots,
    completions,
    gradient,
  };
}

function habitToApiPayload(habit) {
  const metadata = {
    ...(habit?.metadata || {}),
  };

  /*
   * Frontend-only habit data remains in JSONB.
   */
  if (habit?.timeSlots !== undefined) {
    metadata.timeSlots = Array.isArray(
      habit.timeSlots
    )
      ? habit.timeSlots
      : [];
  }

  if (habit?.completions !== undefined) {
    metadata.completions = Array.isArray(
      habit.completions
    )
      ? habit.completions
      : [];
  }

  if (habit?.gradient !== undefined) {
    metadata.gradient = Array.isArray(
      habit.gradient
    )
      ? habit.gradient
      : [];
  }

  return {
    parent_habit_id:
      habit?.parent_habit_id ??
      habit?.parentHabitId ??
      null,

    title:
      habit?.title ??
      habit?.name ??
      '',

    description:
      habit?.description ??
      null,

    frequency:
      habit?.frequency ??
      'Daily',

    goal_value:
      habit?.goal_value ??
      habit?.goalValue ??
      1,

    unit:
      habit?.unit ??
      'times',

    reminder_time:
      habit?.reminder_time ??
      habit?.reminderTime ??
      null,

    active:
      habit?.active !== undefined
        ? Boolean(habit.active)
        : true,

    color:
      habit?.color ??
      'blue',

    icon:
      habit?.icon ??
      '✓',

    created_by_ai:
      habit?.created_by_ai ??
      habit?.createdByAI ??
      false,

    metadata,
  };
}

/* =========================================================
   FOCUS SESSION MAPPERS
========================================================= */

function normalizeFocusSession(session) {
  if (!session) return null;

  const metadata =
    session.metadata &&
    typeof session.metadata === 'object'
      ? session.metadata
      : {};

  const startedAt = safeDate(
    session.started_at
  );

  const startParts = getDateParts(
    session.started_at
  );

  const plannedMinutes =
    session.planned_minutes !== null &&
    session.planned_minutes !== undefined
      ? safeNumber(
          session.planned_minutes,
          25
        )
      : 25;

  const actualMinutes =
    session.actual_minutes !== null &&
    session.actual_minutes !== undefined
      ? safeNumber(
          session.actual_minutes,
          0
        )
      : 0;

  return {
    /*
     * Preserve database fields.
     */
    ...session,

    id: session.id,

    taskId:
      session.task_id ??
      null,

    taskTitle:
      metadata.taskTitle ||
      session.session_name ||
      'Focus Session',

    sessionName:
      session.session_name ||
      'Focus Session',

    sessionType:
      session.session_type ||
      'Focus',

    plannedMinutes,

    actualMinutes,

    startedAt:
      session.started_at ||
      null,

    endedAt:
      session.ended_at ||
      null,

    status:
      session.status ||
      'planned',

    completed:
      Boolean(session.completed),

    quality:
      session.quality ??
      null,

    distractionCount:
      safeNumber(
        session.distraction_count,
        0
      ),

    pauseCount:
      safeNumber(
        session.pause_count,
        0
      ),

    resumeCount:
      safeNumber(
        session.resume_count,
        0
      ),

    aiInterventionCount:
      safeNumber(
        session.ai_intervention_count,
        0
      ),

    moodBefore:
      session.mood_before ??
      null,

    moodAfter:
      session.mood_after ??
      null,

    energyBefore:
      session.energy_before ??
      null,

    energyAfter:
      session.energy_after ??
      null,

    userRating:
      session.user_rating ??
      null,

    notes:
      session.notes ||
      '',

    metadata,

    /*
     * Existing timeline compatibility.
     */
    isoKey:
      startedAt
        ? startedAt
            .toISOString()
            .slice(0, 10)
        : todayISO(),

    startHour:
      startedAt
        ? startParts.hour
        : 9,

    startMin:
      startedAt
        ? startParts.minute
        : 0,

    durationMins:
      actualMinutes > 0
        ? actualMinutes
        : plannedMinutes,
  };
}

function focusSessionToApiPayload(session) {
  const metadata = {
    ...(session?.metadata || {}),
  };

  if (session?.taskTitle) {
    metadata.taskTitle =
      session.taskTitle;
  }

  return {
    task_id:
      session?.task_id ??
      session?.taskId ??
      null,

    session_name:
      session?.session_name ??
      session?.sessionName ??
      'Focus Session',

    session_type:
      session?.session_type ??
      session?.sessionType ??
      'Focus',

    planned_minutes:
      session?.planned_minutes ??
      session?.plannedMinutes ??
      25,

    actual_minutes:
      session?.actual_minutes ??
      session?.actualMinutes ??
      0,

    started_at:
      session?.started_at ??
      session?.startedAt ??
      null,

    ended_at:
      session?.ended_at ??
      session?.endedAt ??
      null,

    status:
      session?.status ??
      'planned',

    quality:
      session?.quality ??
      null,

    distraction_count:
      session?.distraction_count ??
      session?.distractionCount ??
      0,

    pause_count:
      session?.pause_count ??
      session?.pauseCount ??
      0,

    resume_count:
      session?.resume_count ??
      session?.resumeCount ??
      0,

    ai_intervention_count:
      session?.ai_intervention_count ??
      session?.aiInterventionCount ??
      0,

    completed:
      session?.completed ??
      false,

    mood_before:
      session?.mood_before ??
      session?.moodBefore ??
      null,

    mood_after:
      session?.mood_after ??
      session?.moodAfter ??
      null,

    energy_before:
      session?.energy_before ??
      session?.energyBefore ??
      null,

    energy_after:
      session?.energy_after ??
      session?.energyAfter ??
      null,

    user_rating:
      session?.user_rating ??
      session?.userRating ??
      null,

    notes:
      session?.notes ??
      null,

    metadata,
  };
}

/* =========================================================
   PROVIDER
========================================================= */

export function AppDataProvider({
  children,
}) {
  const [tasks, setTasks] =
    useState([]);

  const [habits, setHabits] =
    useState([]);

  const [focusSessions, setFocusSessions] =
    useState([]);

  /*
   * This remains local because there is currently
   * no task-history CRUD route in the backend
   * supplied for this integration.
   */
  const [taskHistory, setTaskHistory] =
    useState([]);

  const [profile, setProfile] =
    useState(defaultProfile);

  const [statistics, setStatistics] =
    useState(null);

  const [hydrated, setHydrated] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [syncError, setSyncError] =
    useState(null);

  /* =======================================================
     LOAD BACKEND DATA
  ======================================================= */

  const loadFromBackend =
    useCallback(async () => {
      try {
        const session =
          await getSession();

        /*
         * No authenticated user.
         */
        if (!session?.access_token) {
          setHydrated(true);
          return;
        }

        setLoading(true);
        setSyncError(null);

        const [
          profileResponse,
          adhdProfileResponse,
          preferencesResponse,
          tasksResponse,
          habitsResponse,
          focusResponse,
          statisticsResponse,
        ] = await Promise.all([
          getProfile(),
          getADHDProfile(),
          getPreferences(),
          getTasks(),
          getHabits(),
          getFocusSessions(),
          getStatisticsSummary(),
        ]);

        /* -----------------------------------------------
           PROFILE
        ------------------------------------------------ */

        const backendProfile =
          profileResponse?.data || {};

        const backendADHD =
          adhdProfileResponse?.data || {};

        const backendPreferences =
          preferencesResponse?.data || {};

        setProfile({
          ...defaultProfile,

          name:
            backendProfile.full_name ||
            'Friend',

          email:
            backendProfile.email ||
            '',

          username:
            backendProfile.username ||
            '',

          avatarUrl:
            backendProfile.avatar_url ||
            null,

          bio:
            backendProfile.bio ||
            '',

          dateOfBirth:
            backendProfile.date_of_birth ||
            null,

          gender:
            backendProfile.gender ||
            null,

          occupation:
            backendProfile.occupation ||
            '',

          country:
            backendProfile.country ||
            '',

          city:
            backendProfile.city ||
            '',

          timezone:
            backendProfile.timezone ||
            'UTC',

          onboardingCompleted:
            Boolean(
              backendProfile.onboarding_completed
            ),

          adhdProfile:
            backendADHD,

          preferences:
            backendPreferences,
        });

        /* -----------------------------------------------
           TASKS
        ------------------------------------------------ */

        const backendTasks =
          Array.isArray(
            tasksResponse?.data
          )
            ? tasksResponse.data
            : [];

        setTasks(
          backendTasks
            .map(normalizeTask)
            .filter(Boolean)
        );

        /* -----------------------------------------------
           HABITS
        ------------------------------------------------ */

        const backendHabits =
          Array.isArray(
            habitsResponse?.data
          )
            ? habitsResponse.data
            : [];

        setHabits(
          backendHabits
            .map(normalizeHabit)
            .filter(Boolean)
        );

        /* -----------------------------------------------
           FOCUS SESSIONS
        ------------------------------------------------ */

        const backendFocusSessions =
          Array.isArray(
            focusResponse?.data
          )
            ? focusResponse.data
            : [];

        setFocusSessions(
          backendFocusSessions
            .map(
              normalizeFocusSession
            )
            .filter(Boolean)
        );

        /* -----------------------------------------------
           STATISTICS
        ------------------------------------------------ */

        setStatistics(
          statisticsResponse?.data ||
          null
        );
      } catch (error) {
        console.error(
          'Failed to load backend data:',
          error
        );

        setSyncError(
          error?.message ||
          'Failed to synchronize with backend.'
        );

        /*
         * Backend failed.
         *
         * Use local cache only as a fallback.
         */
        try {
          const raw =
            await AsyncStorage.getItem(
              APP_DATA_KEY
            );

          if (!raw) return;

          const parsed =
            JSON.parse(raw);

          setTasks(
            Array.isArray(
              parsed.tasks
            )
              ? parsed.tasks
              : []
          );

          setHabits(
            Array.isArray(
              parsed.habits
            )
              ? parsed.habits
              : []
          );

          setFocusSessions(
            Array.isArray(
              parsed.focusSessions
            )
              ? parsed.focusSessions
              : []
          );

          setTaskHistory(
            Array.isArray(
              parsed.taskHistory
            )
              ? parsed.taskHistory
              : []
          );

          setProfile({
            ...defaultProfile,
            ...(parsed.profile || {}),
          });

          setStatistics(
            parsed.statistics ||
            null
          );
        } catch (cacheError) {
          console.warn(
            'Failed to load local fallback:',
            cacheError
          );
        }
      } finally {
        setLoading(false);
        setHydrated(true);
      }
    }, []);

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadFromBackend();
  }, [loadFromBackend]);

  /* =======================================================
     LOCAL CACHE
  ======================================================= */

  useEffect(() => {
    if (!hydrated) return;

    AsyncStorage.setItem(
      APP_DATA_KEY,
      JSON.stringify({
        tasks,
        habits,
        focusSessions,
        taskHistory,
        profile,
        statistics,
      })
    ).catch(() => undefined);
  }, [
    tasks,
    habits,
    focusSessions,
    taskHistory,
    profile,
    statistics,
    hydrated,
  ]);

  /* =======================================================
     TASKS
  ======================================================= */

  const addTask =
    useCallback(async (taskObj) => {
      const payload =
        taskToApiPayload(taskObj);

      const response =
        await apiCreateTask(payload);

      const created =
        normalizeTask(
          response?.data
        );

      if (!created) {
        throw new Error(
          'Backend did not return the created task.'
        );
      }

      setTasks((prev) => [
        created,
        ...prev,
      ]);

      return created;
    }, []);

  const updateTask =
    useCallback(
      async (taskId, updater) => {
        const current =
          tasks.find(
            (task) =>
              task.id === taskId
          );

        if (!current) {
          throw new Error(
            'Task not found.'
          );
        }

        const updated =
          typeof updater === 'function'
            ? updater(current)
            : {
                ...current,
                ...updater,
              };

        const response =
          await apiUpdateTask(
            taskId,
            taskToApiPayload(
              updated
            )
          );

        const saved =
          normalizeTask(
            response?.data
          );

        if (!saved) {
          throw new Error(
            'Backend did not return the updated task.'
          );
        }

        setTasks((prev) =>
          prev.map((task) =>
            task.id === taskId
              ? saved
              : task
          )
        );

        return saved;
      },
      [tasks]
    );

  const deleteTask =
    useCallback(async (taskId) => {
      await apiDeleteTask(taskId);

      setTasks((prev) =>
        prev.filter(
          (task) =>
            task.id !== taskId
        )
      );
    }, []);

  const toggleSubtask =
    useCallback(
      async (taskId, subtaskId) => {
        const current =
          tasks.find(
            (task) =>
              task.id === taskId
          );

        if (!current) return;

        const subtasks =
          Array.isArray(
            current.subtasks
          )
            ? current.subtasks
            : [];

        const target =
          subtasks.find(
            (item) =>
              item.id === subtaskId
          );

        if (!target || target.done) {
          return;
        }

        const updatedSubtasks =
          subtasks.map((item) =>
            item.id === subtaskId
              ? {
                  ...item,
                  done: true,
                }
              : item
          );

        await updateTask(
          taskId,
          {
            ...current,
            subtasks:
              updatedSubtasks,

            metadata: {
              ...(current.metadata || {}),
              subtasks:
                updatedSubtasks,
            },
          }
        );
      },
      [tasks, updateTask]
    );

  /* =======================================================
     HABITS
  ======================================================= */

  const addHabit =
    useCallback(async (habitObj) => {
      const response =
        await apiCreateHabit(
          habitToApiPayload(
            habitObj
          )
        );

      const created =
        normalizeHabit(
          response?.data
        );

      if (!created) {
        throw new Error(
          'Backend did not return the created habit.'
        );
      }

      setHabits((prev) => [
        ...prev,
        created,
      ]);

      return created;
    }, []);

  const updateHabit =
    useCallback(
      async (habitId, updater) => {
        const current =
          habits.find(
            (habit) =>
              habit.id === habitId
          );

        if (!current) {
          throw new Error(
            'Habit not found.'
          );
        }

        const updated =
          typeof updater === 'function'
            ? updater(current)
            : {
                ...current,
                ...updater,
              };

        const response =
          await apiUpdateHabit(
            habitId,
            habitToApiPayload(
              updated
            )
          );

        const saved =
          normalizeHabit(
            response?.data
          );

        if (!saved) {
          throw new Error(
            'Backend did not return the updated habit.'
          );
        }

        setHabits((prev) =>
          prev.map((habit) =>
            habit.id === habitId
              ? saved
              : habit
          )
        );

        return saved;
      },
      [habits]
    );

  const toggleHabitSlot =
    useCallback(
      async (
        habitId,
        slotIndex
      ) => {
        const current =
          habits.find(
            (habit) =>
              habit.id === habitId
          );

        if (!current) return;

        const completions = [
          ...(current.completions || []),
        ];

        completions[slotIndex] =
          !completions[slotIndex];

        await updateHabit(
          habitId,
          {
            ...current,

            completions,

            metadata: {
              ...(current.metadata || {}),
              completions,
            },
          }
        );
      },
      [habits, updateHabit]
    );

  const deleteHabit =
    useCallback(async (habitId) => {
      await apiDeleteHabit(
        habitId
      );

      setHabits((prev) =>
        prev.filter(
          (habit) =>
            habit.id !== habitId
        )
      );
    }, []);

  /* =======================================================
     FOCUS SESSIONS
  ======================================================= */

  const addFocusSession =
    useCallback(async (session) => {
      const response =
        await apiCreateFocusSession(
          focusSessionToApiPayload(
            session
          )
        );

      const created =
        normalizeFocusSession(
          response?.data
        );

      if (!created) {
        throw new Error(
          'Backend did not return the created focus session.'
        );
      }

      setFocusSessions((prev) => [
        created,
        ...prev,
      ]);

      return created;
    }, []);

  const updateFocusSession =
    useCallback(
      async (
        sessionId,
        updater
      ) => {
        const current =
          focusSessions.find(
            (session) =>
              session.id ===
              sessionId
          );

        if (!current) {
          throw new Error(
            'Focus session not found.'
          );
        }

        const updated =
          typeof updater === 'function'
            ? updater(current)
            : {
                ...current,
                ...updater,
              };

        const response =
          await apiUpdateFocusSession(
            sessionId,
            focusSessionToApiPayload(
              updated
            )
          );

        const saved =
          normalizeFocusSession(
            response?.data
          );

        if (!saved) {
          throw new Error(
            'Backend did not return the updated focus session.'
          );
        }

        setFocusSessions((prev) =>
          prev.map((session) =>
            session.id ===
            sessionId
              ? saved
              : session
          )
        );

        return saved;
      },
      [focusSessions]
    );

  const deleteFocusSession =
    useCallback(
      async (sessionId) => {
        await apiDeleteFocusSession(
          sessionId
        );

        setFocusSessions((prev) =>
          prev.filter(
            (session) =>
              session.id !==
              sessionId
          )
        );
      },
      []
    );

  /* =======================================================
     TASK HISTORY
  ======================================================= */

  const addTaskToHistory =
    useCallback((task) => {
      setTaskHistory((prev) => [
        {
          ...task,

          completedAt:
            task.completedAt ||
            new Date().toISOString(),
        },

        ...prev,
      ].slice(0, 100));
    }, []);

  /* =======================================================
     PROFILE
  ======================================================= */

  const updateProfile =
    useCallback(
      async (updates) => {
        const {
          adhdProfile,
          preferences,
          name,
          avatarUrl,
          ...profileUpdates
        } = updates || {};

        /*
         * Convert frontend names to database names.
         */
        const profilePayload = {};

        if (
          profileUpdates.full_name !==
          undefined
        ) {
          profilePayload.full_name =
            profileUpdates.full_name;
        }

        if (
          name !== undefined
        ) {
          profilePayload.full_name =
            name;
        }

        if (
          profileUpdates.username !==
          undefined
        ) {
          profilePayload.username =
            profileUpdates.username;
        }

        if (
          profileUpdates.email !==
          undefined
        ) {
          profilePayload.email =
            profileUpdates.email;
        }

        if (
          avatarUrl !== undefined
        ) {
          profilePayload.avatar_url =
            avatarUrl;
        }

        if (
          profileUpdates.avatar_url !==
          undefined
        ) {
          profilePayload.avatar_url =
            profileUpdates.avatar_url;
        }

        if (
          profileUpdates.bio !==
          undefined
        ) {
          profilePayload.bio =
            profileUpdates.bio;
        }

        if (
          profileUpdates.date_of_birth !==
          undefined
        ) {
          profilePayload.date_of_birth =
            profileUpdates.date_of_birth;
        }

        if (
          profileUpdates.dateOfBirth !==
          undefined
        ) {
          profilePayload.date_of_birth =
            profileUpdates.dateOfBirth;
        }

        if (
          profileUpdates.gender !==
          undefined
        ) {
          profilePayload.gender =
            profileUpdates.gender;
        }

        if (
          profileUpdates.occupation !==
          undefined
        ) {
          profilePayload.occupation =
            profileUpdates.occupation;
        }

        if (
          profileUpdates.country !==
          undefined
        ) {
          profilePayload.country =
            profileUpdates.country;
        }

        if (
          profileUpdates.city !==
          undefined
        ) {
          profilePayload.city =
            profileUpdates.city;
        }

        if (
          profileUpdates.timezone !==
          undefined
        ) {
          profilePayload.timezone =
            profileUpdates.timezone;
        }

        if (
          profileUpdates.onboarding_completed !==
          undefined
        ) {
          profilePayload.onboarding_completed =
            profileUpdates.onboarding_completed;
        }

        if (
          profileUpdates.onboardingCompleted !==
          undefined
        ) {
          profilePayload.onboarding_completed =
            profileUpdates.onboardingCompleted;
        }

        /*
         * Update normal profile only if
         * something was actually supplied.
         */
        let savedProfile =
          profile;

        if (
          Object.keys(
            profilePayload
          ).length > 0
        ) {
          const response =
            await apiUpdateProfile(
              profilePayload
            );

          savedProfile =
            response?.data ||
            savedProfile;
        }

        /*
         * ADHD profile.
         */
        let savedADHD =
          profile.adhdProfile || {};

        if (
          adhdProfile &&
          typeof adhdProfile ===
            'object'
        ) {
          const response =
            await apiUpdateADHDProfile(
              adhdProfile
            );

          savedADHD =
            response?.data ||
            savedADHD;
        }

        /*
         * Preferences.
         */
        let savedPreferences =
          profile.preferences || {};

        if (
          preferences &&
          typeof preferences ===
            'object'
        ) {
          const response =
            await apiUpdatePreferences(
              preferences
            );

          savedPreferences =
            response?.data ||
            savedPreferences;
        }

        /*
         * Update local state from
         * backend response.
         */
        const nextProfile = {
          ...savedProfile,

          name:
            savedProfile.full_name ??
            savedProfile.name ??
            profile.name,

          email:
            savedProfile.email ??
            profile.email,

          username:
            savedProfile.username ??
            profile.username,

          avatarUrl:
            savedProfile.avatar_url ??
            savedProfile.avatarUrl ??
            profile.avatarUrl,

          bio:
            savedProfile.bio ??
            profile.bio,

          dateOfBirth:
            savedProfile.date_of_birth ??
            savedProfile.dateOfBirth ??
            profile.dateOfBirth,

          gender:
            savedProfile.gender ??
            profile.gender,

          occupation:
            savedProfile.occupation ??
            profile.occupation,

          country:
            savedProfile.country ??
            profile.country,

          city:
            savedProfile.city ??
            profile.city,

          timezone:
            savedProfile.timezone ??
            profile.timezone,

          onboardingCompleted:
            savedProfile.onboarding_completed ??
            savedProfile.onboardingCompleted ??
            profile.onboardingCompleted,

          adhdProfile:
            savedADHD,

          preferences:
            savedPreferences,
        };

        setProfile(nextProfile);

        return nextProfile;
      },
      [profile]
    );

  /* =======================================================
     TIMELINE
  ======================================================= */

  const timelineEvents =
    useMemo(() => {
      const events = [];

      /* -----------------------------------------------
         TASK EVENTS
      ------------------------------------------------ */

      tasks.forEach((task) => {
        const startDate =
          safeDate(
            task.start_date ||
            task.startDate
          );

        const dueDate =
          safeDate(
            task.due_date ||
            task.dueDate
          );

        const startParts =
          getDateParts(
            task.start_date ||
            task.startDate
          );

        const dueParts =
          getDateParts(
            task.due_date ||
            task.dueDate
          );

        const startHour =
          startDate
            ? startParts.hour
            : safeNumber(
                task.startHour,
                9
              );

        const startMin =
          startDate
            ? startParts.minute
            : safeNumber(
                task.startMin,
                0
              );

        const endHour =
          dueDate
            ? dueParts.hour
            : safeNumber(
                task.endHour,
                startHour + 1
              );

        /*
         * Avoid zero/negative duration.
         */
        let durationMins =
          (endHour - startHour) *
          60;

        if (
          dueDate &&
          startDate
        ) {
          durationMins =
            Math.round(
              (
                dueDate.getTime() -
                startDate.getTime()
              ) /
                60000
            );
        }

        events.push({
          id:
            `task-${task.id}`,

          title:
            task.title,

          type:
            'task',

          isoKey:
            dueDate
              ? dueDate
                  .toISOString()
                  .slice(0, 10)
              : todayISO(),

          startHour,

          startMin,

          durationMins:
            Math.max(
              30,
              durationMins || 30
            ),

          colorIdx:
            THEME_TO_COLOR_IDX[
              task.themeId
            ] ?? 0,
        });
      });

      /* -----------------------------------------------
         HABIT EVENTS
      ------------------------------------------------ */

      const today =
        todayISO();

      habits.forEach(
        (habit) => {
          const gradientFirst =
            (
              habit.gradient?.[0] ||
              ''
            ).toLowerCase();

          let colorIdx = 1;

          if (
            gradientFirst.includes(
              'ff9a'
            ) ||
            gradientFirst.includes(
              'ff6a'
            )
          ) {
            colorIdx =
              HABIT_COLOR_TO_IDX.coral;
          } else if (
            gradientFirst.includes(
              '5dae'
            ) ||
            gradientFirst.includes(
              '3a8d'
            )
          ) {
            colorIdx =
              HABIT_COLOR_TO_IDX.blue;
          } else if (
            gradientFirst.includes(
              '6ee7'
            ) ||
            gradientFirst.includes(
              '34d3'
            )
          ) {
            colorIdx =
              HABIT_COLOR_TO_IDX.green;
          } else if (
            gradientFirst.includes(
              'a78b'
            ) ||
            gradientFirst.includes(
              '7c3a'
            )
          ) {
            colorIdx =
              HABIT_COLOR_TO_IDX.purple;
          } else if (
            gradientFirst.includes(
              '4fd1'
            ) ||
            gradientFirst.includes(
              '2cb1'
            )
          ) {
            colorIdx =
              HABIT_COLOR_TO_IDX.teal;
          }

          (
            habit.timeSlots ||
            []
          ).forEach(
            (
              slot,
              index
            ) => {
              events.push({
                id:
                  `habit-${habit.id}-${index}`,

                title:
                  habit.name ||
                  habit.title ||
                  'Habit',

                type:
                  'habit',

                isoKey:
                  today,

                startHour:
                  SLOT_TO_HOUR[
                    slot
                  ] ?? 8,

                startMin:
                  0,

                durationMins:
                  SLOT_DURATION_MINS,

                colorIdx,
              });
            }
          );
        }
      );

      /* -----------------------------------------------
         FOCUS EVENTS
      ------------------------------------------------ */

      focusSessions.forEach(
        (session) => {
          events.push({
            id:
              `focus-${session.id}`,

            title:
              session.taskTitle
                ? `Focus: ${session.taskTitle}`
                : 'Focus Session',

            type:
              'focus',

            isoKey:
              session.isoKey ||
              todayISO(),

            startHour:
              safeNumber(
                session.startHour,
                9
              ),

            startMin:
              safeNumber(
                session.startMin,
                0
              ),

            durationMins:
              Math.max(
                1,
                safeNumber(
                  session.durationMins,
                  25
                )
              ),

            colorIdx:
              2,
          });
        }
      );

      return events;
    }, [
      tasks,
      habits,
      focusSessions,
    ]);

  /* =======================================================
     HABIT STATISTICS
  ======================================================= */

  const habitStats =
    useMemo(() => {
      const today =
        todayISO();

      const slotsPerDay =
        habits.reduce(
          (total, habit) =>
            total +
            (
              habit.timeSlots
                ?.length || 0
            ),
          0
        );

      const todayDone =
        habits.reduce(
          (total, habit) =>
            total +
            (
              habit.completions
                ?.filter(Boolean)
                .length || 0
            ),
          0
        );

      const rollingThreeDayTarget =
        slotsPerDay * 3;

      /*
       * Existing frontend data only
       * represents current completion state,
       * not three separate days.
       *
       * Therefore we do not pretend this
       * is a real 3-day backend statistic.
       */
      const rollingThreeDayDone =
        todayDone;

      const streakDays =
        slotsPerDay > 0
          ? Math.min(
              3,
              Math.floor(
                todayDone /
                  slotsPerDay
              )
            )
          : 0;

      return {
        ...defaultHabitStats,

        today,

        streakDays,

        dailyTarget:
          slotsPerDay,

        todayDone,

        rollingThreeDayTarget,

        rollingThreeDayDone,
      };
    }, [habits]);

  /* =======================================================
     CONTEXT VALUE
  ======================================================= */

  const value =
    useMemo(
      () => ({
        /*
         * Data
         */
        tasks,
        habits,
        focusSessions,
        taskHistory,
        profile,
        statistics,

        /*
         * State
         */
        hydrated,
        loading,
        syncError,

        /*
         * Backend refresh
         */
        refreshData:
          loadFromBackend,

        /*
         * Tasks
         */
        addTask,
        updateTask,
        deleteTask,
        toggleSubtask,

        /*
         * Habits
         */
        addHabit,
        updateHabit,
        toggleHabitSlot,
        deleteHabit,

        /*
         * Focus sessions
         */
        addFocusSession,
        updateFocusSession,
        deleteFocusSession,

        /*
         * Local task history
         */
        addTaskToHistory,

        /*
         * Profile / ADHD profile /
         * preferences
         */
        updateProfile,

        /*
         * Timeline
         */
        timelineEvents,

        /*
         * Habit statistics
         */
        habitStats,
      }),
      [
        tasks,
        habits,
        focusSessions,
        taskHistory,
        profile,
        statistics,

        hydrated,
        loading,
        syncError,

        loadFromBackend,

        addTask,
        updateTask,
        deleteTask,
        toggleSubtask,

        addHabit,
        updateHabit,
        toggleHabitSlot,
        deleteHabit,

        addFocusSession,
        updateFocusSession,
        deleteFocusSession,

        addTaskToHistory,

        updateProfile,

        timelineEvents,
        habitStats,
      ]
    );

  return (
    <AppDataContext.Provider
      value={value}
    >
      {children}
    </AppDataContext.Provider>
  );
}

/* =========================================================
   HOOK
========================================================= */

export function useAppData() {
  const ctx =
    useContext(
      AppDataContext
    );

  if (!ctx) {
    throw new Error(
      'useAppData must be used inside <AppDataProvider>'
    );
  }

  return ctx;
}