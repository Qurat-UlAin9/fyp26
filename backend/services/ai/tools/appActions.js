// backend/services/ai/tools/appActions.js
//
// Things the coach does that change phone-only data (coins, unlocked items, theme, music).
// Tools push an action here; the chat route returns the list and the app applies it.

function pushAppAction(config, action) {
  const arr = config?.configurable?.appActions;
  if (Array.isArray(arr)) arr.push(action);
}

module.exports = { pushAppAction };
