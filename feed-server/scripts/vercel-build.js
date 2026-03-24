/**
 * Legacy hook: feed-server is API-only on Vercel (no public/ output).
 * Vercel project should have no Output Directory, or Build Command empty.
 */
console.log('feed-server: API only (no static output)');
