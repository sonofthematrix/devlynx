/**
 * Vercel entry: /api/server, /api/server/health, …
 * Path is taken from req.url in server-with-ai getRequestPathname (no rely on req.query.slug).
 */
const { feedServerHandler } = require('../../server-with-ai');

module.exports = async (req, res) => {
  await feedServerHandler(req, res);
};
