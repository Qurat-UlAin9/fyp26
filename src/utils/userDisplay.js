export function looksLikeEmail(value) {
  return typeof value === 'string' && value.includes('@');
}

export function displayUsername(profile) {
  const username = (profile?.username || '').trim();
  const name = (profile?.name || '').trim();

  if (username && !looksLikeEmail(username)) return username;
  if (name && !looksLikeEmail(name)) return name;
  if (username) return username.split('@')[0];
  if (name) return name.split('@')[0];
  return 'Friend';
}
