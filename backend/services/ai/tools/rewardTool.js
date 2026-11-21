// backend/services/ai/tools/rewardTool.js
//
// buy_reward: unlock a theme or a music track with the user's coins (saved on the server).
// apply_reward: switch to an owned theme or music track, and optionally play it.
// The app refreshes its rewards after the chat reply (see the rewards_changed action).

const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { pushAppAction } = require('./appActions');
const rewards = require('../../rewards/rewardsService');
const { findItem } = require('../../rewards/catalog');

const buyReward = tool(
  async ({ kind, item }, config) => {
    const userId = config?.configurable?.userId;
    if (!userId) return 'Error: no authenticated user in context.';
    const found = findItem(kind, item);
    if (!found) return `No ${kind} matches "${item}". Check the names in the AIMS APP STATE.`;

    const r = await rewards.unlock(userId, kind, found.id);
    if (!r.ok) {
      return r.reason === 'Not enough coins'
        ? `Not enough coins: "${found.name}" costs ${found.cost} and the user has ${r.state?.coins ?? 'fewer'}.`
        : `Could not buy "${found.name}": ${r.reason}.`;
    }
    if (r.already) return `"${found.name}" is already available to the user.`;
    pushAppAction(config, { type: 'rewards_changed', unlocked: { name: found.name, cost: found.cost } });
    return `Bought "${found.name}" for ${found.cost} coins. Coins left: ${r.state.coins}. Offer to switch to it now.`;
  },
  {
    name: 'buy_reward',
    description:
      'Unlock a theme or a music track with the user\'s coins. Only call after the user clearly said yes to buying that exact item ' +
      '(a suggestion alone is not a yes). Use the item name or id from the AIMS APP STATE.',
    schema: z.object({
      kind: z.enum(['theme', 'sound']),
      item: z.string().describe('Name or id of the theme or track'),
    }),
  }
);

const applyReward = tool(
  async ({ kind, item, play }, config) => {
    const userId = config?.configurable?.userId;
    if (!userId) return 'Error: no authenticated user in context.';
    const found = findItem(kind, item);
    if (!found) return `No ${kind} matches "${item}". Check the names in the AIMS APP STATE.`;

    const r = await rewards.select(userId, kind, found.id);
    if (!r.ok) {
      return r.reason === 'Locked'
        ? `"${found.name}" is still locked (${found.cost} coins). Offer to buy it first.`
        : `Could not switch to "${found.name}": ${r.reason}.`;
    }
    const wantPlay = kind === 'sound' && play !== false;
    pushAppAction(config, { type: 'rewards_changed', ...(wantPlay ? { play: true, soundId: found.id } : {}) });
    if (kind === 'theme') return `Switched the app theme to "${found.name}".`;
    return wantPlay ? `Selected "${found.name}" and started playing it.` : `Selected "${found.name}".`;
  },
  {
    name: 'apply_reward',
    description:
      'Switch the app to a theme or music track the user already owns, and play the music. Use when the user asks to change the theme or play a song.',
    schema: z.object({
      kind: z.enum(['theme', 'sound']),
      item: z.string().describe('Name or id of the theme or track'),
      play: z.boolean().optional().describe('For music: start playing (default true)'),
    }),
  }
);

module.exports = { buyReward, applyReward };
