-- AIMS rewards on the server: one row per user + a coin history.
-- Run once in the Supabase SQL editor. Safe to run again.

create table if not exists user_rewards (
  user_id           uuid primary key,
  coins             integer not null default 0 check (coins >= 0),
  tasks_completed   integer not null default 0,
  subtasks_completed integer not null default 0,
  habit_completions integer not null default 0,
  focus_minutes     integer not null default 0,
  unlocked_themes   text[]  not null default '{vibrantLight,sereneBlueDark,auroraLight}',
  unlocked_sounds   text[]  not null default '{lofi_study}',
  selected_theme_id text    not null default 'vibrantLight',
  selected_sound_id text,
  featured_badge_id text,
  celebrated_badges text[]  not null default '{}',
  imported          boolean not null default false,  -- true once the phone's old local rewards were copied in
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists coin_transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null,
  amount        integer not null,          -- positive = earned, negative = spent / undone
  reason        text not null,             -- task | subtask | habit | game | unlock:theme:<id> | import ...
  ref           text,
  balance_after integer not null,
  created_at    timestamptz not null default now()
);

create index if not exists coin_transactions_user_time
  on coin_transactions (user_id, created_at desc);

-- Only the backend (service role) touches these tables.
alter table user_rewards enable row level security;
alter table coin_transactions enable row level security;

-- Check
select 'user_rewards' as table_name, count(*) from user_rewards
union all select 'coin_transactions', count(*) from coin_transactions;
