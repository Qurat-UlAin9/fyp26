export const MAX_GAME_REWARD = 20;

export function coinsForGameScore(score) {
  if (!Number.isFinite(score) || score <= 0) return 0;
  return Math.min(MAX_GAME_REWARD, Math.floor(score / 10));
}