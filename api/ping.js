/**
 * GET /api/ping - Instant "server is up" check. No DB, minimal cold start.
 * Use this first to verify the deployment is reachable.
 */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') {
    res.status(404).json({ error: 'GET /api/ping' });
    return;
  }
  res.status(200).json({ ok: true });
};
