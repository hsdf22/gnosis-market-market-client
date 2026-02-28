#!/usr/bin/env node
/**
 * Script to call the Polymarket credential server (POST /api/check).
 * Credentials from env or CLI. Server URL from CREDENTIAL_SERVER_URL or --url.
 *
 * Usage:
 *   CREDENTIAL_SERVER_URL=http://localhost:3000 PRIVATE_KEY=0x... node scripts/check.js
 *   node scripts/check.js --url http://localhost:3000 --private-key 0x...
 *   node scripts/check.js  # uses https://gnosis-market-market-client.vercel.app by default
 *
 * Env: CREDENTIAL_SERVER_URL, PRIVATE_KEY, API_KEY, API_SECRET, API_PASSPHRASE
 * CLI: --url, --private-key, --api-key, --api-secret, --api-passphrase
 */

const BASE = process.env.CREDENTIAL_SERVER_URL || 'https://gnosis-market-market-client.vercel.app';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { url: BASE, privateKey: process.env.PRIVATE_KEY, apiKey: process.env.API_KEY, apiSecret: process.env.API_SECRET, apiPassphrase: process.env.API_PASSPHRASE };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) { out.url = args[i + 1]; i++; }
    else if (args[i] === '--private-key' && args[i + 1]) { out.privateKey = args[i + 1]; i++; }
    else if (args[i] === '--api-key' && args[i + 1]) { out.apiKey = args[i + 1]; i++; }
    else if (args[i] === '--api-secret' && args[i + 1]) { out.apiSecret = args[i + 1]; i++; }
    else if (args[i] === '--api-passphrase' && args[i + 1]) { out.apiPassphrase = args[i + 1]; i++; }
  }
  return out;
}

function normalizeUrl(url) {
  url = url.replace(/\/+$/, '');
  if (!/\/api\/check$/.test(url) && !/\/check$/.test(url)) url += '/api/check';
  return url;
}

async function run() {
  const { url, privateKey, apiKey, apiSecret, apiPassphrase } = parseArgs();
  const endpoint = normalizeUrl(url);

  if (!privateKey || typeof privateKey !== 'string') {
    console.error('Missing private key. Set PRIVATE_KEY or use --private-key.');
    process.exit(1);
  }

  const body = {
    privateKey: privateKey.trim(),
    ...(apiKey && { apiKey }),
    ...(apiSecret && { apiSecret }),
    ...(apiPassphrase && { apiPassphrase }),
  };

  let res;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error('Request failed:', e.message);
    process.exit(1);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error('Server returned', res.status, data);
    process.exit(1);
  }

  console.log(JSON.stringify(data, null, 2));
  if (data.error) {
    const codes = { E01: 'Missing/invalid privateKey', E02: 'Invalid private key', E03: 'API credentials invalid', E10: 'Payload decode failed', E20: 'Mongo not configured' };
    console.error('Error code:', data.error, codes[data.error] || '');
  }
  process.exit(data.error ? 1 : 0);
}

run();
