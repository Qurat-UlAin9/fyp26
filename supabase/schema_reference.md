# Supabase schema reference (columns only)

Generated from `information_schema.columns` of the live Supabase `public` schema (Nov 2026). **This is a reference, not a runnable migration.**

Status of the other checks:

- **Row-level security: done.** Section at the bottom (checked Nov 2026).
- **View settings (`security_invoker`): done.** See the notes at the bottom.
- **Enum values** (columns shown as USER-DEFINED): still missing.
- **Primary/foreign keys and indexes**: still missing.

41 objects (4 views). No user data is included.

## User & profile

### `profiles`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | generate_uuid() |
| user_id | uuid | no |  |
| full_name | text | yes |  |
| username | USER-DEFINED | yes |  |
| email | USER-DEFINED | yes |  |
| avatar_url | text | yes |  |
| bio | text | yes |  |
| date_of_birth | date | yes |  |
| gender | text | yes |  |
| occupation | text | yes |  |
| country | text | yes |  |
| city | text | yes |  |
| timezone | text | yes | 'UTC'::text |
| onboarding_completed | boolean | yes | false |
| created_at | timestamp with time zone | yes | now() |
| updated_at | timestamp with time zone | yes | now() |

### `adhd_profile`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | generate_uuid() |
| user_id | uuid | no |  |
| adhd_type | USER-DEFINED | yes | 'Unknown'::adhd_type |
| diagnosis_status | USER-DEFINED | yes | 'Not Diagnosed'::diagnosis_status |
| diagnosed_year | integer | yes |  |
| medication | text | yes |  |
| therapy | text | yes |  |
| sleep_goal_hours | numeric | yes |  |
| preferred_focus_length | integer | yes | 25 |
| preferred_break_length | integer | yes | 5 |
| energy_pattern | USER-DEFINED | yes | 'Variable'::energy_pattern |
| biggest_challenges | jsonb | yes | '[]'::jsonb |
| strengths | jsonb | yes | '[]'::jsonb |
| goals | jsonb | yes | '[]'::jsonb |
| created_at | timestamp with time zone | yes | now() |
| updated_at | timestamp with time zone | yes | now() |

### `user_preferences`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | generate_uuid() |
| user_id | uuid | no |  |
| theme | text | yes | 'system'::text |
| language | text | yes | 'en'::text |
| notifications_enabled | boolean | yes | true |
| reminder_sound | boolean | yes | true |
| vibration_enabled | boolean | yes | true |
| motivational_style | text | yes | 'supportive'::text |
| daily_goal_minutes | integer | yes | 120 |
| week_start | smallint | yes | 1 |
| ai_personality | text | yes | 'coach'::text |
| created_at | timestamp with time zone | yes | now() |
| updated_at | timestamp with time zone | yes | now() |

### `user_statistics`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | generate_uuid() |
| user_id | uuid | no |  |
| total_tasks | integer | yes | 0 |
| completed_tasks | integer | yes | 0 |
| completion_rate | numeric | yes | 0 |
| total_focus_minutes | integer | yes | 0 |
| total_focus_sessions | integer | yes | 0 |
| current_streak | integer | yes | 0 |
| longest_streak | integer | yes | 0 |
| total_habits_completed | integer | yes | 0 |
| total_rewards_earned | integer | yes | 0 |
| xp | integer | yes | 0 |
| level | integer | yes | 1 |
| last_activity | timestamp with time zone | yes |  |
| created_at | timestamp with time zone | yes | now() |
| updated_at | timestamp with time zone | yes | now() |

## Tasks, habits, focus

### `tasks`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | generate_uuid() |
| user_id | uuid | no |  |
| parent_task_id | uuid | yes |  |
| title | text | no |  |
| description | text | yes |  |
| notes | text | yes |  |
| status | USER-DEFINED | yes | 'Pending'::task_status |
| priority | USER-DEFINED | yes | 'Medium'::task_priority |
| difficulty | USER-DEFINED | yes | 'Medium'::task_difficulty |
| start_date | timestamp with time zone | yes |  |
| due_date | timestamp with time zone | yes |  |
| completed_at | timestamp with time zone | yes |  |
| reminder_at | timestamp with time zone | yes |  |
| repeat_type | USER-DEFINED | yes | 'None'::repeat_type |
| estimated_minutes | integer | yes |  |
| actual_minutes | integer | yes | 0 |
| progress | numeric | yes | 0 |
| energy_required | USER-DEFINED | yes | 'Variable'::energy_pattern |
| created_by_ai | boolean | yes | false |
| created_source | text | yes | 'User'::text |
| ai_reason | text | yes |  |
| metadata | jsonb | yes | '{}'::jsonb |
| created_at | timestamp with time zone | yes | now() |
| updated_at | timestamp with time zone | yes | now() |

### `task_dependencies`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | generate_uuid() |
| task_id | uuid | no |  |
| depends_on_task_id | uuid | no |  |
| created_at | timestamp with time zone | yes | now() |

### `habits`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | generate_uuid() |
| user_id | uuid | no |  |
| parent_habit_id | uuid | yes |  |
| title | text | no |  |
| description | text | yes |  |
| frequency | USER-DEFINED | yes | 'Daily'::habit_frequency |
| goal_value | integer | yes | 1 |
| unit | text | yes | 'times'::text |
| reminder_time | time without time zone | yes |  |
| active | boolean | yes | true |
| color | text | yes |  |
| icon | text | yes |  |
| created_by_ai | boolean | yes | false |
| metadata | jsonb | yes | '{}'::jsonb |
| created_at | timestamp with time zone | yes | now() |
| updated_at | timestamp with time zone | yes | now() |

### `habit_logs`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | generate_uuid() |
| habit_id | uuid | no |  |
| user_id | uuid | no |  |
| completed | boolean | yes | false |
| completion_value | integer | yes | 0 |
| note | text | yes |  |
| completed_at | timestamp with time zone | yes |  |
| created_at | timestamp with time zone | yes | now() |

### `focus_sessions`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | generate_uuid() |
| user_id | uuid | no |  |
| task_id | uuid | yes |  |
| session_name | text | yes |  |
| session_type | text | yes | 'Pomodoro'::text |
| planned_minutes | integer | no |  |
| actual_minutes | integer | yes | 0 |
| started_at | timestamp with time zone | yes |  |
| ended_at | timestamp with time zone | yes |  |
| status | USER-DEFINED | yes | 'Pending'::task_status |
| quality | USER-DEFINED | yes | 'Average'::session_quality |
| distraction_count | integer | yes | 0 |
| pause_count | integer | yes | 0 |
| resume_count | integer | yes | 0 |
| ai_intervention_count | integer | yes | 0 |
| completed | boolean | yes | false |
| mood_before | USER-DEFINED | yes |  |
| mood_after | USER-DEFINED | yes |  |
| energy_before | USER-DEFINED | yes |  |
| energy_after | USER-DEFINED | yes |  |
| user_rating | smallint | yes |  |
| notes | text | yes |  |
| metadata | jsonb | yes | '{}'::jsonb |
| created_at | timestamp with time zone | yes | now() |
| updated_at | timestamp with time zone | yes | now() |

### `focus_events`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | generate_uuid() |
| session_id | uuid | no |  |
| event_type | text | no |  |
| event_time | timestamp with time zone | yes | now() |
| duration_seconds | integer | yes |  |
| generated_by_ai | boolean | yes | false |
| details | jsonb | yes | '{}'::jsonb |

### `focus_scores`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| user_id | uuid | no |  |
| score_date | date | no |  |
| score | numeric | no |  |
| total_sessions | integer | yes | 0 |
| completed_sessions | integer | yes | 0 |
| focus_minutes | integer | yes | 0 |
| interruption_count | integer | yes | 0 |
| created_at | timestamp with time zone | yes | now() |

### `productivity_scores`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| user_id | uuid | no |  |
| score_date | date | no |  |
| score | numeric | no |  |
| completed_tasks | integer | yes | 0 |
| overdue_tasks | integer | yes | 0 |
| focus_minutes | integer | yes | 0 |
| notes | text | yes |  |
| created_at | timestamp with time zone | yes | now() |

## Mood & statistics

### `mood_logs`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| user_id | uuid | no |  |
| mood | text | no |  |
| mood_score | smallint | no |  |
| note | text | yes |  |
| source | text | no | 'manual'::text |
| context | jsonb | no | '{}'::jsonb |
| logged_at | timestamp with time zone | no | now() |
| created_at | timestamp with time zone | no | now() |

### `daily_statistics`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| user_id | uuid | no |  |
| stat_date | date | no |  |
| completed_tasks | integer | yes | 0 |
| completed_habits | integer | yes | 0 |
| focus_minutes | integer | yes | 0 |
| focus_sessions | integer | yes | 0 |
| mood_score | numeric | yes |  |
| energy_score | numeric | yes |  |
| stress_score | numeric | yes |  |
| productivity_score | numeric | yes |  |
| sleep_hours | numeric | yes |  |
| journal_entries | integer | yes | 0 |
| created_at | timestamp with time zone | yes | now() |
| updated_at | timestamp with time zone | yes | now() |

### `weekly_statistics`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| user_id | uuid | no |  |
| week_start | date | no |  |
| completed_tasks | integer | yes | 0 |
| completed_habits | integer | yes | 0 |
| focus_minutes | integer | yes | 0 |
| focus_sessions | integer | yes | 0 |
| average_mood | numeric | yes |  |
| average_energy | numeric | yes |  |
| average_stress | numeric | yes |  |
| productivity_score | numeric | yes |  |
| sleep_hours_avg | numeric | yes |  |
| created_at | timestamp with time zone | yes | now() |
| updated_at | timestamp with time zone | yes | now() |

### `monthly_statistics`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| user_id | uuid | no |  |
| month_start | date | no |  |
| completed_tasks | integer | yes | 0 |
| completed_habits | integer | yes | 0 |
| focus_minutes | integer | yes | 0 |
| focus_sessions | integer | yes | 0 |
| average_mood | numeric | yes |  |
| average_energy | numeric | yes |  |
| average_stress | numeric | yes |  |
| productivity_score | numeric | yes |  |
| sleep_hours_avg | numeric | yes |  |
| created_at | timestamp with time zone | yes | now() |
| updated_at | timestamp with time zone | yes | now() |

## Assessments

### `assessments`

| column | type | null | default |
|---|---|---|---|
| id | bigint | no |  |
| user_id | uuid | no |  |
| answers | jsonb | no |  |
| score | integer | no |  |
| max_score | integer | no | 72 |
| percentage | numeric | no |  |
| predicted_label | text | yes |  |
| adhd_probability | numeric | yes |  |
| top_factors | jsonb | yes | '[]'::jsonb |
| created_at | timestamp with time zone | no | now() |

### `ef_assessments`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| user_id | uuid | no |  |
| responses | jsonb | no |  |
| dimension_scores | jsonb | no |  |
| created_at | timestamp with time zone | no | now() |

## AI coach

### `agents`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | generate_uuid() |
| name | text | no |  |
| description | text | yes |  |
| agent_type | text | no | 'orchestrator'::text |
| version | text | yes | '1.0'::text |
| active | boolean | yes | true |
| metadata | jsonb | yes | '{}'::jsonb |
| created_at | timestamp with time zone | yes | now() |
| updated_at | timestamp with time zone | yes | now() |

### `ai_conversations`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | generate_uuid() |
| user_id | uuid | no |  |
| title | text | yes |  |
| status | text | yes | 'active'::text |
| summary | text | yes |  |
| metadata | jsonb | yes | '{}'::jsonb |
| created_at | timestamp with time zone | yes | now() |
| updated_at | timestamp with time zone | yes | now() |

### `ai_messages`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | generate_uuid() |
| conversation_id | uuid | no |  |
| agent_id | uuid | yes |  |
| sender | text | no |  |
| message | text | no |  |
| token_count | integer | yes |  |
| metadata | jsonb | yes | '{}'::jsonb |
| created_at | timestamp with time zone | yes | now() |

### `ai_feedback`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| user_id | uuid | no |  |
| conversation_id | uuid | yes |  |
| message_id | uuid | yes |  |
| rating | integer | yes |  |
| helpful | boolean | yes |  |
| reason | text | yes |  |
| feedback | text | yes |  |
| metadata | jsonb | yes | '{}'::jsonb |
| created_at | timestamp with time zone | yes | now() |

### `ai_recommendations`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| user_id | uuid | no |  |
| agent_id | uuid | yes |  |
| conversation_id | uuid | yes |  |
| recommendation_type | text | no |  |
| recommendation | text | no |  |
| reason | text | yes |  |
| context | jsonb | yes | '{}'::jsonb |
| status | text | yes | 'pending'::text |
| outcome | text | yes |  |
| outcome_score | numeric | yes |  |
| created_at | timestamp with time zone | yes | now() |
| responded_at | timestamp with time zone | yes |  |
| completed_at | timestamp with time zone | yes |  |

### `tool_execution_logs`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | generate_uuid() |
| conversation_id | uuid | yes |  |
| message_id | uuid | yes |  |
| agent_id | uuid | yes |  |
| tool_name | text | no |  |
| tool_input | jsonb | yes | '{}'::jsonb |
| tool_output | jsonb | yes | '{}'::jsonb |
| execution_time_ms | integer | yes |  |
| success | boolean | yes | true |
| error_message | text | yes |  |
| created_at | timestamp with time zone | yes | now() |

### `user_memories`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| user_id | uuid | no |  |
| conversation_id | uuid | yes |  |
| memory_type | text | no |  |
| title | text | yes |  |
| content | text | no |  |
| importance | integer | yes | 3 |
| confidence | numeric | yes | 1.00 |
| embedding_model | text | yes | 'BAAI/bge-base-en-v1.5'::text |
| embedding_version | integer | yes | 1 |
| search_vector | tsvector | yes |  |
| metadata | jsonb | yes | '{}'::jsonb |
| memory_source | text | yes |  |
| expires_at | timestamp with time zone | yes |  |
| last_accessed | timestamp with time zone | yes |  |
| access_count | integer | yes | 0 |
| created_at | timestamp with time zone | yes | now() |
| updated_at | timestamp with time zone | yes | now() |
| external_vector_id | text | yes |  |
| vector_namespace | text | yes |  |

## Knowledge base (RAG)

### `knowledge_sources`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| name | text | no |  |
| description | text | yes |  |
| source_type | text | no |  |
| base_url | text | yes |  |
| trust_score | numeric | yes | 0.80 |
| active | boolean | yes | true |
| priority | integer | yes | 100 |
| metadata | jsonb | yes | '{}'::jsonb |
| created_at | timestamp with time zone | yes | now() |
| updated_at | timestamp with time zone | yes | now() |

### `knowledge_categories`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| name | text | no |  |
| description | text | yes |  |
| created_at | timestamp with time zone | yes | now() |
| updated_at | timestamp with time zone | yes | now() |

### `knowledge_documents`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| source_id | uuid | no |  |
| category_id | uuid | yes |  |
| title | text | no |  |
| author | text | yes |  |
| language | text | yes | 'en'::text |
| source_url | text | yes |  |
| summary | text | yes |  |
| status | text | yes | 'active'::text |
| document_type | text | yes | 'article'::text |
| estimated_read_time | integer | yes |  |
| document_hash | text | yes |  |
| published_at | timestamp with time zone | yes |  |
| metadata | jsonb | yes | '{}'::jsonb |
| created_at | timestamp with time zone | yes | now() |
| updated_at | timestamp with time zone | yes | now() |

### `knowledge_chunks`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| document_id | uuid | no |  |
| category_id | uuid | yes |  |
| chunk_index | integer | no |  |
| previous_chunk | uuid | yes |  |
| next_chunk | uuid | yes |  |
| title | text | yes |  |
| chunk_type | text | yes | 'general'::text |
| content | text | no |  |
| summary | text | yes |  |
| token_count | integer | yes | 0 |
| importance | integer | yes | 3 |
| recommended_tool | text | yes |  |
| recommended_exercise_id | uuid | yes |  |
| language | text | yes | 'en'::text |
| embedding_model | text | yes | 'BAAI/bge-base-en-v1.5'::text |
| embedding_version | integer | yes | 1 |
| search_vector | tsvector | yes |  |
| metadata | jsonb | yes | '{}'::jsonb |
| created_at | timestamp with time zone | yes | now() |
| updated_at | timestamp with time zone | yes | now() |
| external_vector_id | text | yes |  |
| vector_namespace | text | yes |  |
| source_url | text | yes |  |
| source_citation | text | yes |  |
| trust_score | numeric | yes |  |
| retrieval_count | integer | yes | 0 |
| last_retrieved_at | timestamp with time zone | yes |  |
| rating_up | integer | yes | 0 |
| rating_down | integer | yes | 0 |

### `knowledge_tags`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| name | text | no |  |
| description | text | yes |  |
| created_at | timestamp with time zone | yes | now() |

### `knowledge_chunk_tags`

| column | type | null | default |
|---|---|---|---|
| chunk_id | uuid | no |  |
| tag_id | uuid | no |  |

### `chunk_retrievals`

| column | type | null | default |
|---|---|---|---|
| id | bigint | no | nextval('chunk_retrievals_id_seq'::regclass) |
| chunk_id | text | no |  |
| vector_namespace | text | yes |  |
| interaction_id | uuid | yes |  |
| user_id | uuid | yes |  |
| relevance_rating | smallint | yes |  |
| created_at | timestamp with time zone | yes | now() |

## Exercises

### `exercise_categories`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| name | text | no |  |
| description | text | yes |  |
| created_at | timestamp with time zone | yes | now() |

### `exercise_library`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| category_id | uuid | yes |  |
| name | text | no |  |
| description | text | yes |  |
| exercise_type | text | yes |  |
| difficulty | text | yes | 'beginner'::text |
| duration_minutes | integer | yes |  |
| instructions | text | yes |  |
| benefits | ARRAY | yes |  |
| suitable_for | ARRAY | yes |  |
| recommended_moods | ARRAY | yes |  |
| recommended_stress_levels | ARRAY | yes |  |
| recommended_energy_levels | ARRAY | yes |  |
| media_url | text | yes |  |
| is_active | boolean | yes | true |
| created_at | timestamp with time zone | yes | now() |
| updated_at | timestamp with time zone | yes | now() |

### `exercise_steps`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| exercise_id | uuid | no |  |
| step_number | integer | no |  |
| title | text | yes |  |
| instruction | text | no |  |
| duration_seconds | integer | yes |  |
| created_at | timestamp with time zone | yes | now() |

## Notifications

### `notifications`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| user_id | uuid | no |  |
| title | text | no |  |
| body | text | no |  |
| notification_type | text | no |  |
| scheduled_at | timestamp with time zone | yes |  |
| sent_at | timestamp with time zone | yes |  |
| read_at | timestamp with time zone | yes |  |
| clicked_at | timestamp with time zone | yes |  |
| dismissed_at | timestamp with time zone | yes |  |
| related_entity_type | text | yes |  |
| related_entity_id | uuid | yes |  |
| metadata | jsonb | yes | '{}'::jsonb |
| status | text | yes | 'scheduled'::text |
| created_at | timestamp with time zone | yes | now() |

### `notification_history`

| column | type | null | default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| notification_id | uuid | no |  |
| user_id | uuid | no |  |
| event_type | text | no |  |
| event_time | timestamp with time zone | yes | now() |
| metadata | jsonb | yes | '{}'::jsonb |

## Views (read-only)

### `latest_focus_scores` (view)

| column | type | null | default |
|---|---|---|---|
| user_id | uuid | yes |  |
| score_date | date | yes |  |
| score | numeric | yes |  |
| total_sessions | integer | yes |  |
| completed_sessions | integer | yes |  |
| focus_minutes | integer | yes |  |
| interruption_count | integer | yes |  |

### `latest_productivity_scores` (view)

| column | type | null | default |
|---|---|---|---|
| user_id | uuid | yes |  |
| score_date | date | yes |  |
| score | numeric | yes |  |
| completed_tasks | integer | yes |  |
| overdue_tasks | integer | yes |  |
| focus_minutes | integer | yes |  |

### `pending_ai_recommendations` (view)

| column | type | null | default |
|---|---|---|---|
| id | uuid | yes |  |
| user_id | uuid | yes |  |
| recommendation_type | text | yes |  |
| recommendation | text | yes |  |
| reason | text | yes |  |
| status | text | yes |  |
| created_at | timestamp with time zone | yes |  |

### `user_daily_dashboard` (view)

| column | type | null | default |
|---|---|---|---|
| user_id | uuid | yes |  |
| stat_date | date | yes |  |
| completed_tasks | integer | yes |  |
| completed_habits | integer | yes |  |
| focus_minutes | integer | yes |  |
| focus_sessions | integer | yes |  |
| mood_score | numeric | yes |  |
| energy_score | numeric | yes |  |
| stress_score | numeric | yes |  |
| productivity_score | numeric | yes |  |
| sleep_hours | numeric | yes |  |
| journal_entries | integer | yes |  |

## Row-level security

All 37 base tables have RLS **on**. The 4 views are not covered by this check (see notes).

| table | commands with a policy | who can access |
|---|---|---|
| `adhd_profile` | SELECT, INSERT, UPDATE, DELETE | own rows (`user_id = auth.uid()`) |
| `agents` | SELECT | any signed-in user |
| `ai_conversations` | SELECT, INSERT, UPDATE, DELETE | own rows (`user_id = auth.uid()`) |
| `ai_feedback` | SELECT, INSERT | own rows (`user_id = auth.uid()`) |
| `ai_messages` | SELECT, INSERT | via parent: ai_conversations |
| `ai_recommendations` | SELECT, ALL | own rows (`user_id = auth.uid()`) |
| `assessments` | SELECT, INSERT, DELETE | own rows (`user_id = auth.uid()`) |
| `chunk_retrievals` | none | no policies: only the backend service role can access |
| `daily_statistics` | SELECT, INSERT, UPDATE | own rows (`user_id = auth.uid()`) |
| `ef_assessments` | SELECT, INSERT, DELETE | own rows (`user_id = auth.uid()`) |
| `exercise_categories` | SELECT | any signed-in user |
| `exercise_library` | SELECT | any signed-in user |
| `exercise_steps` | SELECT | any signed-in user |
| `focus_events` | SELECT, INSERT, UPDATE, DELETE | via parent: focus_sessions |
| `focus_scores` | ALL | own rows (`user_id = auth.uid()`) |
| `focus_sessions` | SELECT, INSERT, UPDATE, DELETE | own rows (`user_id = auth.uid()`) |
| `habit_logs` | SELECT, INSERT, UPDATE, DELETE | own rows (`user_id = auth.uid()`) |
| `habits` | SELECT, INSERT, UPDATE, DELETE | own rows (`user_id = auth.uid()`) |
| `knowledge_categories` | SELECT | any signed-in user |
| `knowledge_chunk_tags` | SELECT | any signed-in user |
| `knowledge_chunks` | SELECT | any signed-in user |
| `knowledge_documents` | SELECT | any signed-in user |
| `knowledge_sources` | SELECT | any signed-in user |
| `knowledge_tags` | SELECT | any signed-in user |
| `monthly_statistics` | SELECT, INSERT, UPDATE | own rows (`user_id = auth.uid()`) |
| `mood_logs` | SELECT, INSERT, UPDATE, DELETE | own rows (`user_id = auth.uid()`) |
| `notification_history` | SELECT, INSERT | own rows (`user_id = auth.uid()`) |
| `notifications` | SELECT, ALL | own rows (`user_id = auth.uid()`) |
| `productivity_scores` | ALL | own rows (`user_id = auth.uid()`) |
| `profiles` | SELECT, INSERT, UPDATE, DELETE | own rows (`user_id = auth.uid()`) |
| `task_dependencies` | SELECT, INSERT, UPDATE, DELETE | via parent: tasks |
| `tasks` | SELECT, INSERT, UPDATE, DELETE | own rows (`user_id = auth.uid()`) |
| `tool_execution_logs` | SELECT | via parent: ai_conversations |
| `user_memories` | SELECT, INSERT, UPDATE, DELETE | own rows (`user_id = auth.uid()`) |
| `user_preferences` | SELECT, INSERT, UPDATE, DELETE | own rows (`user_id = auth.uid()`) |
| `user_statistics` | SELECT, INSERT, UPDATE, DELETE | own rows (`user_id = auth.uid()`) |
| `weekly_statistics` | SELECT, INSERT, UPDATE | own rows (`user_id = auth.uid()`) |

### Notes from the policy review

- `chunk_retrievals` has RLS on and **no policies**, so only the backend (service role) can use it. Looks intentional.
- `assessments` has duplicate INSERT and SELECT policies (two names each). Harmless; one pair can be dropped.
- `ai_messages` and `tool_execution_logs` have no `user_id`; their policies go through `ai_conversations`, which is correct.
- `ef_assessments`, `ai_messages`, `tool_execution_logs` have no UPDATE policy, so users cannot edit those rows.
- `tool_execution_logs` and the knowledge tables have no INSERT policy; the backend writes them with the service role.
- **The 4 views** (`latest_focus_scores`, `latest_productivity_scores`, `pending_ai_recommendations`, `user_daily_dashboard`), checked Nov 2026: `anon` and `authenticated` have **no SELECT** on them (only TRUNCATE/TRIGGER/REFERENCES), so the Supabase API cannot read them. They were not `security_invoker` and their definitions do not filter by `auth.uid()`, so they would have shown every user's rows if SELECT were ever granted. Fixed Nov 2026: `alter view public.<name> set (security_invoker = true);` was run for all four views and verified. The app code does not use these views.