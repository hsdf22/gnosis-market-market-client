/**
 * Vercel serverless: POST /api/check
 * Accepts either:
 * - body.payload (encoded with CREDENTIAL_SERVER_SEED) -> decode then handleCheck
 * - body with plain privateKey, apiKey, ... -> handleCheck directly
 */

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
    res.status(404).json({ error: 'Not found. POST /api/check' });
    return;
  }

  let handleCheck;
  let decodePayload;
  try {
    const server = require('../src/credential-check-server');
    handleCheck = server.handleCheck;
    decodePayload = require('../src/decode-payload').decodePayload;
  } catch (err) {
    const msg = err && (err.message || String(err));
    const isModuleMissing = /Cannot find module|MODULE_NOT_FOUND|polymarket-trading-bot/i.test(msg);
    res.status(503).json({
      error: 'Server error',
      message: msg,
      ...(isModuleMissing && { hint: 'Deploy: add polymarket-trading-bot from npm (not file:../npm_module). See server README.' }),
    });
    return;
  }

  try {
    let body = typeof req.body === 'object' && req.body !== null ? req.body : {};
    if (typeof req.body === 'string') {
      try {
        body = JSON.parse(req.body);
      } catch (_) {
        body = {};
      }
    }
    if (body.payload && typeof body.payload === 'string') {
      try {
        body = decodePayload(body.payload);
      } catch (e) {
        res.status(400).json({ error: 'Invalid or missing CREDENTIAL_SERVER_SEED; cannot decode payload' });
        return;
      }
    }

    const { status, data } = await handleCheck(body);
    res.status(status).json(data);
  } catch (err) {
    const msg = err && (err.message || String(err));
    res.status(500).json({ error: 'Server error', message: msg });
  }
};
