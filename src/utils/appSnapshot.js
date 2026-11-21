// src/utils/appSnapshot.js
//
// A compact picture of the user's rewards (coins, themes, music, badges) that is sent with
// every chat message, so the coach knows what exists, what is owned and what can be afforded.
// `t` is the object returned by useTheme().

export function buildAppSnapshot(t) {
  if (!t) return null;
  const playable = new Set(t.playableSoundIds || []);
  return {
    coins: t.coins || 0,
    stats: t.stats || {},
    themes: (t.themes || []).map((x) => ({
      id: x.id,
      name: x.name,
      mode: x.mode,
      cost: x.cost || 0,
      owned: (t.unlockedThemes || []).includes(x.id),
      active: t.selectedThemeId === x.id,
    })),
    sounds: (t.sounds || []).map((x) => ({
      id: x.id,
      name: x.name,
      genre: x.genre,
      cost: x.cost || 0,
      owned: (t.unlockedSounds || []).includes(x.id),
      active: t.selectedSoundId === x.id,
      playable: playable.has(x.id),
    })),
    badges: (t.titles || []).map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      unlocked: !!b.unlocked,
      pct: Math.round((b.progress || 0) * 100),
    })),
    musicPlaying: !!t.isSoundPlaying,
  };
}
