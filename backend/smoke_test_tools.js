// backend/smoke_test_tools.js
require('dotenv').config();

const { createTask, listOpenTasks }       = require('./services/ai/tools/taskTool');
const { suggestFocusSession }             = require('./services/ai/tools/focusTool');
const { suggestEmotionExercise }          = require('./services/ai/tools/emotionTool');
const { suggestExercise }                 = require('./services/ai/tools/exerciseTool');
const { supabaseAdmin }                   = require('./config/supabase');

// =========================================================
// CONFIG
// =========================================================
// Paste a REAL user id from your Supabase auth.users table.
// You can find one in Supabase Studio -> Authentication -> Users.
const TEST_USER_ID = process.env.SMOKE_TEST_USER_ID || '';

if (!TEST_USER_ID) {
  console.error('SMOKE_TEST_USER_ID is not set.');
  console.error('Set it in backend/.env as:');
  console.error('  SMOKE_TEST_USER_ID=<uuid-from-supabase-auth-users>');
  process.exit(1);
}

const config = {
  configurable: {
    userId: TEST_USER_ID,
    conversationId: 'smoke-test-run',
  },
};

// =========================================================
// HELPERS
// =========================================================
const insertedTaskIds = [];
const insertedFocusIds = [];

async function runTest(label, fn) {
  process.stdout.write(`\n=== ${label} ===\n`);
  try {
    const result = await fn();
    console.log('OK:', typeof result === 'string' ? result : JSON.stringify(result, null, 2));
    return { ok: true, result };
  } catch (err) {
    console.log('FAILED:', err?.message || err);
    if (err?.stack) {
      console.log(err.stack.split('\n').slice(0, 5).join('\n'));
    }
    return { ok: false, error: err };
  }
}

async function cleanup() {
  console.log('\n=== Cleanup ===');
  try {
    if (insertedTaskIds.length) {
      const { error } = await supabaseAdmin
        .from('tasks')
        .delete()
        .in('id', insertedTaskIds);
      console.log(
        error
          ? `Cleanup tasks failed: ${error.message}`
          : `Deleted ${insertedTaskIds.length} smoke-test task(s).`
      );
    }
    if (insertedFocusIds.length) {
      const { error } = await supabaseAdmin
        .from('focus_sessions')
        .delete()
        .in('id', insertedFocusIds);
      console.log(
        error
          ? `Cleanup focus sessions failed: ${error.message}`
          : `Deleted ${insertedFocusIds.length} smoke-test focus session(s).`
      );
    }
  } catch (e) {
    console.log('Cleanup error:', e?.message || e);
  }
}

// =========================================================
// RUN
// =========================================================
(async () => {
  console.log('Using TEST_USER_ID:', TEST_USER_ID);

  // 0. Sanity: confirm Supabase is reachable
  await runTest('supabase_connectivity', async () => {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('user_id', TEST_USER_ID)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('No profile row for this user id.');
    return `Profile found for user ${TEST_USER_ID}`;
  });

  // 1. list_open_tasks — read-only, safe
  await runTest('list_open_tasks', async () => {
    return await listOpenTasks.invoke({}, config);
  });

  // 2. create_task — writes a row, capture id for cleanup
  await runTest('create_task', async () => {
    const result = await createTask.invoke(
      {
        title: 'SMOKE TEST — DELETE ME',
        description: 'Automated smoke-test row, safe to delete.',
        priority: 'Low',
        difficulty: 'Easy',
        estimated_minutes: 5,
        reason: 'tool smoke test',
      },
      config
    );
    // Extract id from the tool's return string
    const match = /id:\s*([0-9a-f-]{36})/i.exec(String(result));
    if (match) insertedTaskIds.push(match[1]);
    return result;
  });

  // 3. suggest_focus_session — expected to FAIL, enum mismatch confirmed
  await runTest('suggest_focus_session', async () => {
    const result = await suggestFocusSession.invoke(
      { planned_minutes: 25, session_type: 'Focus', reason: 'smoke test' },
      config
    );
    const match = /id:\s*([0-9a-f-]{36})/i.exec(String(result));
    if (match) insertedFocusIds.push(match[1]);
    return result;
  });

  // 4. suggest_emotion_exercise — pure function, no DB
  await runTest('suggest_emotion_exercise', async () => {
    return await suggestEmotionExercise.invoke(
      { feeling: 'anxious', intensity: 7 },
      config
    );
  });

  // 5. suggest_exercise — queries exercise_library (corrected column names)
  await runTest('suggest_exercise', async () => {
    return await suggestExercise.invoke(
      { mood: 'overwhelmed', energy_level: 'low', max_duration_minutes: 10 },
      config
    );
  });

  const { updateTask, deleteTask } = require('./services/ai/tools/taskTool');

// 6. update_task — add subtasks + color to the created task
await runTest('update_task (add subtasks + color)', async () => {
  const taskId = insertedTaskIds[0];
  if (!taskId) throw new Error('No task id to update from earlier test.');
  return await updateTask.invoke({
    task_id: taskId,
    subtasks: ['Find professor email', 'Draft email', 'Send email'],
    color: 'lavender',
    reason: 'user asked for a breakdown',
  }, config);
});

// 7. delete_task — remove the smoke test task
await runTest('delete_task', async () => {
  const taskId = insertedTaskIds[0];
  if (!taskId) throw new Error('No task id to delete.');
  const result = await deleteTask.invoke({ task_id: taskId }, config);
  // It's already deleted by cleanup logic, so remove from cleanup list
  insertedTaskIds.length = 0;
  return result;
});

  await cleanup();
})().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});