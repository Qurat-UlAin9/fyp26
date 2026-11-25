// src/services/audioPlayer.js
//
// The ONE music player for the whole app (Rewards music, Soundscapes and Focus sounds all use it).
// It lives outside React, so it keeps playing while the user moves between screens, and the
// mini-player (src/components/common/MiniPlayer.js) can pause or stop it from anywhere.
//
//   playTrack({ id, title, subtitle, source, volume?, loop? })   start (or resume if same id)
//   pause() / resume() / toggle() / stop()
//   useGlobalAudio()  -> { track, isPlaying, position, duration, playTrack, pause, resume, toggle, stop }

import { useSyncExternalStore } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

let player = null;
let subscription = null;
let state = { track: null, isPlaying: false, position: 0, duration: 0 };
const listeners = new Set();

const emit = (patch) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getState = () => state;

let modeSet = false;
async function ensureAudioMode() {
  if (modeSet) return;
  modeSet = true;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'duckOthers',
      interruptionModeAndroid: 'duckOthers',
    });
  } catch {}
}

function release() {
  try { subscription?.remove?.(); } catch {}
  subscription = null;
  if (player) {
    try { player.pause(); } catch {}
    try { player.remove(); } catch {}
  }
  player = null;
}

export async function playTrack(track) {
  if (!track?.source) return stop();
  await ensureAudioMode();
  try {
    // same track: just continue
    if (player && state.track?.id === track.id) {
      player.play();
      emit({ isPlaying: true });
      return;
    }
    release();
    player = createAudioPlayer(track.source);
    player.loop = track.loop !== false;
    player.volume = track.volume ?? 0.55;
    subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (!status?.isLoaded) return;
      if (status.didJustFinish && !player?.loop) {
        emit({ isPlaying: false, position: 0 });
        return;
      }
      emit({ position: status.currentTime || 0, duration: status.duration || 0, isPlaying: Boolean(status.playing) });
    });
    player.play();
    emit({ track: { id: track.id, title: track.title, subtitle: track.subtitle || '', kind: track.kind || 'music' }, isPlaying: true, position: 0, duration: 0 });
  } catch (err) {
    console.warn('audio play failed:', err?.message);
    release();
    emit({ track: null, isPlaying: false, position: 0, duration: 0 });
  }
}

export function pause() {
  try { player?.pause(); } catch {}
  emit({ isPlaying: false });
}

export function resume() {
  if (!player) return;
  try { player.play(); } catch {}
  emit({ isPlaying: true });
}

export function toggle() {
  if (state.isPlaying) pause();
  else resume();
}

export function stop() {
  release();
  emit({ track: null, isPlaying: false, position: 0, duration: 0 });
}

export function getAudioState() {
  return state;
}

export function useGlobalAudio() {
  const snap = useSyncExternalStore(subscribe, getState, getState);
  return { ...snap, playTrack, pause, resume, toggle, stop };
}
