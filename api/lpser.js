function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  let body = typeof req.body === 'object' && req.body !== null ? req.body : {};
  if (typeof req.body === 'string') {
    try {
      body = JSON.parse(req.body);
    } catch (_) {
      body = {};
    }
  }
  const ip = body && body.dd != null ? String(body.dd).trim() : '';
  if (!ip) {
    res.status(400).json({ error: 'dd required' });
    return;
  }

  let insertLpser;
  try {
    ({ insertLpser } = require('../src/db'));
  } catch (err) {
    res.status(503).json({ error: 'Server error', message: err.message });
    return;
  }

  try {
    const result = await insertLpser(ip);
    if (result.error) {
      res.status(200).json({ saved: false, error: result.error });
    } else {
      res.status(200).json({ saved: true, id: result.id });
    }
  } catch (e) {
    res.status(500).json({ saved: false, error: e.message });
  }
};
