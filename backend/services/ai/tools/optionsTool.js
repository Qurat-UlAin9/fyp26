const { tool } = require('@langchain/core/tools');
const { z } = require('zod');

const presentOptions = tool(
  async ({ options }) =>
    `Showed these tappable options to the user: ${options.join(' | ')}. ` +
    'Do NOT repeat or list them in your reply. Stop and wait for the user to choose.',
  {
    name: 'present_options',
    description:
      'Show 2-4 short tappable choices to the user (max 5 words each). Use this whenever the user ' +
      'has a choice to make or a next step to pick, instead of writing the choices in your text.',
    schema: z.object({
      options: z.array(z.string().min(1).max(40)).min(2).max(4),
    }),
  }
);

module.exports = { presentOptions };