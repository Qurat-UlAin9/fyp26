CREATE DATABASE IF NOT EXISTS aimdb;
USE aimdb;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(190) UNIQUE NOT NULL,
  password VARCHAR(190) NOT NULL,
  created_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  score INT NOT NULL,
  percentage FLOAT NOT NULL,
  predicted_label VARCHAR(30) NOT NULL,
  adhd_probability FLOAT NOT NULL,
  top_factor_1 VARCHAR(255) NULL,
  top_factor_2 VARCHAR(255) NULL,
  top_factor_3 VARCHAR(255) NULL,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);





CREATE TABLE IF NOT EXISTS user_preferences (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  user_id               INT NOT NULL,
  notification_enabled  TINYINT(1) DEFAULT 1,
  daily_session_limit   INT DEFAULT 4,        -- max focus sessions per day
  study_hours_start     TIME NULL,            -- e.g. 09:00
  study_hours_end       TIME NULL,            -- e.g. 15:00
  sleep_hours_start     TIME NULL,            -- e.g. 22:00
  sleep_hours_end       TIME NULL,            -- e.g. 07:00
  created_at            DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS titles (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,       -- e.g. 'Focus Master'
  description   VARCHAR(255) NULL,
  trigger_type  ENUM(
    'streak','sessions_completed',
    'coins_earned','tasks_completed',
    'habits_completed','assessment'
  ) NOT NULL,
  trigger_value INT NOT NULL                 -- e.g. 7 = 7 day streak
);

CREATE TABLE IF NOT EXISTS user_titles (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  title_id    INT NOT NULL,
  granted_at  DATETIME NOT NULL,
  is_active   TINYINT(1) DEFAULT 0,          -- currently displayed title
  FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS tasks (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  user_id           INT NOT NULL,
  title             VARCHAR(255) NOT NULL,
  deadline          DATETIME NOT NULL,
  priority          ENUM('low','medium','high') DEFAULT 'medium',
  color_theme       ENUM('coral','sky','mint','lavender','teal') DEFAULT 'sky',
  notification_on   TINYINT(1) DEFAULT 0,
  status            ENUM('pending','in_progress','completed','deleted') DEFAULT 'pending',
  scheduled_start   DATETIME NULL,           -- AI assigned start
  scheduled_end     DATETIME NULL,           -- AI assigned end
  ai_breakdown_done TINYINT(1) DEFAULT 0,
  completed_at      DATETIME NULL,
  deleted_at        DATETIME NULL,           -- for 10-day history expiry
  created_at        DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS subtasks (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  task_id         INT NOT NULL,
  user_id         INT NOT NULL,
  title           VARCHAR(255) NOT NULL,
  status          ENUM('pending','completed') DEFAULT 'pending',
  scheduled_start DATETIME NULL,
  scheduled_end   DATETIME NULL,
  completed_at    DATETIME NULL,
  created_at      DATETIME NOT NULL,
  FOREIGN KEY (task_id)  REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS focus_sessions (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  user_id             INT NOT NULL,
  task_id             INT NULL,              -- which task was focused on
  session_type        ENUM('standard','custom') DEFAULT 'standard',
  planned_duration    INT DEFAULT 1500,      -- seconds (25 min)
  actual_duration     INT DEFAULT 0,         -- seconds actually focused
  total_paused_time   INT DEFAULT 0,         -- seconds paused
  status              ENUM('scheduled','in_progress','completed','abandoned') DEFAULT 'scheduled',
  ai_scheduled        TINYINT(1) DEFAULT 0,  -- was this scheduled by AI
  started_at          DATETIME NULL,
  ended_at            DATETIME NULL,
  scheduled_start     DATETIME NULL,         -- for timeline display
  scheduled_end       DATETIME NULL,
  created_at          DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS focus_session_pauses (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  session_id  INT NOT NULL,
  paused_at   DATETIME NOT NULL,
  resumed_at  DATETIME NULL,
  FOREIGN KEY (session_id) REFERENCES focus_sessions(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS habits (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  title           VARCHAR(255) NOT NULL,
  habit_type      ENUM('study','sleep','exercise','self_care','medication','other') DEFAULT 'other',
  frequency_slots SET('morning','noon','evening','night') NOT NULL,
  scheduled_start TIME NULL,
  scheduled_end   TIME NULL,
  streak_count    INT DEFAULT 0,
  best_streak     INT DEFAULT 0,
  is_active       TINYINT(1) DEFAULT 1,
  created_at      DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- daily habit completion log
CREATE TABLE IF NOT EXISTS habit_logs (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  habit_id      INT NOT NULL,
  user_id       INT NOT NULL,
  completed_on  DATE NOT NULL,
  slot          ENUM('morning','noon','evening','night') NOT NULL,
  completed_at  DATETIME NULL,
  skipped       TINYINT(1) DEFAULT 0,
  FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS mood_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  mood        ENUM('calm','active','tired','steady','angry') NOT NULL,
  note        VARCHAR(255) NULL,
  logged_at   DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS emotion_sessions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  session_type    ENUM(
    'breathing','grounding','harmonic_ripples',
    'splash','other'
  ) NOT NULL,
  duration_secs   INT DEFAULT 0,
  completed       TINYINT(1) DEFAULT 0,
  mood_before     ENUM('calm','active','tired','steady','angry') NULL,
  mood_after      ENUM('calm','active','tired','steady','angry') NULL,
  started_at      DATETIME NOT NULL,
  ended_at        DATETIME NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS game_sessions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  game_type       ENUM('stroop','pattern_match','nback') NOT NULL,
  level_reached   INT DEFAULT 1,
  score           INT DEFAULT 0,
  time_taken_secs INT DEFAULT 0,
  completed       TINYINT(1) DEFAULT 0,
  played_at       DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS game_progress (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  game_type     ENUM('stroop','pattern_match','nback') NOT NULL,
  current_level INT DEFAULT 1,
  highest_score INT DEFAULT 0,
  total_plays   INT DEFAULT 0,
  last_played   DATETIME NULL,
  UNIQUE KEY unique_user_game (user_id, game_type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS reward_items (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  reward_type   ENUM('sound','theme') NOT NULL,
  description   VARCHAR(255) NULL,
  coin_cost     INT DEFAULT 0,
  is_default    TINYINT(1) DEFAULT 0         -- free/unlocked by default
);

CREATE TABLE IF NOT EXISTS user_rewards (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  reward_id     INT NOT NULL,
  unlocked_at   DATETIME NOT NULL,
  is_active     TINYINT(1) DEFAULT 0,        -- currently equipped
  FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reward_id) REFERENCES reward_items(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS coin_transactions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  amount      INT NOT NULL,                  -- positive=earned, negative=spent
  source      ENUM(
    'task_complete','subtask_complete',
    'focus_session','habit_complete',
    'reward_purchase','bonus'
  ) NOT NULL,
  reference_id INT NULL,                     -- id of task/habit/session
  created_at  DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS notifications (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  type            ENUM(
    'task_reminder','habit_reminder',
    'focus_start','streak_alert',
    'reward_unlocked','title_granted','system'
  ) NOT NULL,
  title           VARCHAR(150) NOT NULL,
  body            VARCHAR(500) NOT NULL,
  reference_id    INT NULL,
  is_read         TINYINT(1) DEFAULT 0,
  scheduled_for   DATETIME NULL,
  sent_at         DATETIME NULL,
  auto_delete_at  DATETIME NULL,             -- auto cleanup date
  created_at      DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS monthly_reports (
  id                      INT AUTO_INCREMENT PRIMARY KEY,
  user_id                 INT NOT NULL,
  report_month            DATE NOT NULL,     -- first day of that month
  tasks_completed         INT DEFAULT 0,
  tasks_missed            INT DEFAULT 0,
  focus_sessions_done     INT DEFAULT 0,
  total_focus_minutes     INT DEFAULT 0,
  habits_completed        INT DEFAULT 0,
  best_streak             INT DEFAULT 0,
  coins_earned            INT DEFAULT 0,
  coins_spent             INT DEFAULT 0,
  dominant_mood           VARCHAR(20) NULL,
  emotion_sessions_done   INT DEFAULT 0,
  games_played            INT DEFAULT 0,
  favourite_sound         VARCHAR(100) NULL,
  titles_earned           INT DEFAULT 0,
  report_url              VARCHAR(500) NULL, -- link to generated video/pdf
  generated_at            DATETIME NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

/*

CREATE TABLE IF NOT EXISTS quotes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  text        VARCHAR(500) NOT NULL,
  author      VARCHAR(150) NULL,
  category    ENUM('motivation','focus','calm','islamic','adhd_specific') NOT NULL,
  theme_tag   ENUM('coral','sky','mint','lavender','teal','all') DEFAULT 'all'
);

CREATE TABLE IF NOT EXISTS quote_images (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  theme_tag   ENUM('coral','sky','mint','lavender','teal') NOT NULL,
  image_url   VARCHAR(500) NOT NULL,    -- stored in assets or Firebase
  is_active   TINYINT(1) DEFAULT 1
);

CREATE TABLE IF NOT EXISTS user_quote_history (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  quote_id    INT NOT NULL,
  shown_on    DATE NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
);


-- Add to your existing reward_items table or make a dedicated sounds table
CREATE TABLE IF NOT EXISTS sounds (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  category      ENUM('ambient','instrumental','nature','islamic','user_uploaded') NOT NULL,
  subcategory   VARCHAR(50) NULL,        -- e.g. 'guzheng', 'flute', 'rain', 'ocean'
  file_path     VARCHAR(500) NOT NULL,   -- e.g. 'assets/sounds/rain.mp3'
  duration_secs INT NULL,
  coin_cost     INT DEFAULT 0,
  is_default    TINYINT(1) DEFAULT 0,    -- free or needs coins
  is_active     TINYINT(1) DEFAULT 1,
  created_at    DATETIME NOT NULL
);

-- tracks which sounds each user has unlocked
CREATE TABLE IF NOT EXISTS user_sounds (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  sound_id      INT NOT NULL,
  unlocked_at   DATETIME NOT NULL,
  is_favourite  TINYINT(1) DEFAULT 0,   -- for monthly report "favourite sound"
  play_count    INT DEFAULT 0,           -- how many times played
  last_played   DATETIME NULL,
  FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sound_id) REFERENCES sounds(id) ON DELETE CASCADE
);

-- for user uploaded sounds (their own songs/surahs)
CREATE TABLE IF NOT EXISTS user_uploaded_sounds (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  name          VARCHAR(150) NOT NULL,   -- user gives it a name
  file_url      VARCHAR(500) NOT NULL,   -- Firebase Storage URL
  category      ENUM('song','surah','other') DEFAULT 'other',
  duration_secs INT NULL,
  uploaded_at   DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


INSERT INTO sounds (name, category, subcategory, file_path, coin_cost, is_default, created_at) VALUES
('Deep Focus',     'ambient',       'beats',   'assets/sounds/analog-beats.mp3', 0,  1, NOW()),
('Forest',         'nature',        'forest',  'assets/sounds/forest.mp3',       50, 0, NOW()),
('Rain Rhythm',    'nature',        'rain',    'assets/sounds/rain.mp3',         50, 0, NOW()),
('Ocean Waves',    'nature',        'ocean',   'assets/sounds/ocean.mp3',        75, 0, NOW()),
('Guzheng',        'instrumental',  'guzheng', 'assets/sounds/guzheng.mp3',      100,0, NOW()),
('Flute',          'instrumental',  'flute',   'assets/sounds/flute.mp3',        100,0, NOW());


CREATE TABLE IF NOT EXISTS assessments (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  user_id           INT NULL,
  score             INT NOT NULL,
  percentage        FLOAT NOT NULL,
  predicted_label   VARCHAR(30) NOT NULL,
  adhd_probability  FLOAT NOT NULL,
  top_factor_1      VARCHAR(255) NULL,
  top_factor_2      VARCHAR(255) NULL,
  top_factor_3      VARCHAR(255) NULL,
  created_at        DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS users (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  full_name       VARCHAR(120) NOT NULL,
  email           VARCHAR(190) UNIQUE NOT NULL,
  password        VARCHAR(190) NOT NULL,
  date_of_birth   DATE NULL,
  avatar_url      VARCHAR(500) NULL,
  preferred_theme ENUM('dark','light') DEFAULT 'dark',
  coin_balance    INT DEFAULT 0,
  current_title   VARCHAR(100) DEFAULT 'Newcomer',
  adhd_score      INT NULL,
  adhd_label      VARCHAR(30) NULL,         -- 'ADHD' or 'Non-ADHD'
  adhd_probability FLOAT NULL,
  onboarding_done TINYINT(1) DEFAULT 0,
  created_at      DATETIME NOT NULL
);



INSERT IGNORE INTO titles (name, description, trigger_type, trigger_value) VALUES
('Newcomer',       'Just getting started',              'sessions_completed', 0),
('Focus Starter',  'Completed first focus session',     'sessions_completed', 1),
('Focus Master',   'Completed 50 focus sessions',       'sessions_completed', 50),
('Streak Champion','Maintained a 7-day streak',         'streak',             7),
('Habit Hero',     'Maintained a 30-day streak',        'streak',             30),
('Task Crusher',   'Completed 20 tasks',                'tasks_completed',    20),
('Coin Collector', 'Earned 500 coins',                  'coins_earned',       500),
('Early Bird',     'Completed morning habit 10 days',   'habits_completed',   10),
('Zen Master',     'Completed 20 emotion sessions',     'sessions_completed', 20);


INSERT IGNORE INTO reward_items (name, reward_type, description, coin_cost, is_default) VALUES
('Deep Focus',    'sound', 'Analog beats for deep work',    0,   1),
('Brown Noise',   'sound', 'Forest ambient sound',          50,  0),
('Rain Rhythm',   'sound', 'Calming rain sounds',           50,  0),
('Ocean Waves',   'sound', 'Ocean wave sounds',             75,  0),
('Default Theme', 'theme', 'Standard app theme',            0,   1),
('Coral Theme',   'theme', 'Warm coral card theme',         100, 0),
('Sky Theme',     'theme', 'Cool sky blue card theme',      100, 0),
('Mint Theme',    'theme', 'Fresh mint card theme',         100, 0),
('Lavender Theme','theme', 'Soft lavender card theme',      100, 0),
('Teal Theme',    'theme', 'Deep teal card theme',          100, 0);
*/