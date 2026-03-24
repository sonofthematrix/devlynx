/**
 * Vercel entry (repo root): all non-/api/* traffic is rewritten here — see /vercel.json.
 * Handler lives in feed-server/server-with-ai.js (shared with local `node feed-server/server-with-ai.js`).
 */
const { feedServerHandler } = require('../feed-server/server-with-ai');

module.exports = async (req, res) => {
  await feedServerHandler(req, res);
};
