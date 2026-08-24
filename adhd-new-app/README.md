# FocusMind ADHD Companion

A React Native/Expo app backed by an Express API and Supabase Auth/data services.

## Project layout

The repository root intentionally contains one application directory: `adhd-new-app/`. Run all app commands from that directory.

## Setup

1. Install JavaScript dependencies: `npm install`
2. Copy `backend/.env.example` to `backend/.env` and fill in the Supabase values.
3. Start the API and WebSocket server: `npm run backend`
4. In a second terminal, start Expo: `npm start`

For a physical Android device, Expo automatically detects the development host. Otherwise configure `EXPO_PUBLIC_API_URL`, for example `http://192.168.1.20:5000`. Do not include `/api`; the mobile client adds it automatically.

The app sends the Supabase access token as `Authorization: Bearer <token>` for protected task, habit, profile, focus-session, and statistics endpoints. `socket.io` is included on both server and client for live updates.

## Structure report

Run `npm run structure` to regenerate `project-structure.txt`.
