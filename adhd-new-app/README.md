# FocusMind ADHD Companion

A React Native/Expo app backed by an Express API and Supabase Auth/data services.

## Project layout

The repository root intentionally contains one application directory: `adhd-new-app/`. Run all app commands from that directory.

## Setup

1. Install JavaScript dependencies from this directory: `npm install`. This creates
   `adhd-new-app/node_modules/` (which is intentionally ignored by Git).
2. Create the Python environment in the application backend: `python3 -m venv backend/venv`.
   Activate it with `source backend/venv/bin/activate`, then install the Python
   dependencies with `python -m pip install -r backend/requirements.txt`. The
   `backend/venv/` directory is also intentionally ignored by Git.
3. Copy `backend/.env.example` to `backend/.env` and replace the placeholder
   Supabase values. The example also documents the optional MySQL settings used by
   the standalone Python assessment service.
4. Start the Express API and WebSocket server: `npm run backend`.
5. In a second terminal, start Expo: `npm start`.

For a physical Android device, Expo automatically detects the development host. Otherwise configure `EXPO_PUBLIC_API_URL`, for example `http://192.168.1.20:5000`. Do not include `/api`; the mobile client adds it automatically.

The app sends the Supabase access token as `Authorization: Bearer <token>` for protected task, habit, profile, focus-session, and statistics endpoints. `socket.io` is included on both server and client for live updates.

## Checks

Run `npm run backend:check` to validate the Express entry point syntax. After the
Python environment has been installed, run `npm run test:python` to execute the
Python API tests. The standalone Python assessment server can be started with
`npm run backend:python`; set `PORT` to a port other than `5000` if the Express API
is running at the same time.

## Structure report

Run `npm run structure` to regenerate `project-structure.txt`.
