/**
 * Vercel: GET/POST https://…/api (exact) — same handler as [[...slug]].js.
 */
const { feedServerHandler } = require('../feed-server/server-with-ai');

module.exports = async (req, res) => {
  await feedServerHandler(req, res);
};
