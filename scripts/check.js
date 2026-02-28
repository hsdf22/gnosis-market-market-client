#!/usr/bin/env node
/**
 * Call credential server POST /api/check. Env or CLI: PRIVATE_KEY, API_KEY, API_SECRET, API_PASSPHRASE, CREDENTIAL_SERVER_URL.
 * CLI: --url, --private-key, --api-key, --api-secret, --api-passphrase, --help
 */

const BASE = process.env.CREDENTIAL_SERVER_URL || 'https://gnosis-market-market-client.vercel.app';
const ERROR_CODES = { E01: 'Missing/invalid privateKey', E02: 'Invalid private key', E03: 'API credentials invalid', E10: 'Payload decode failed', E20: 'Mongo not configured' };

const CLI_FLAGS = [
  ['--url', 'url'],
  ['--private-key', 'privateKey'],
  ['--api-key', 'apiKey'],
  ['--api-secret', 'apiSecret'],
  ['--api-passphrase', 'apiPassphrase'],
];

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    url: BASE,
    privateKey: process.env.PRIVATE_KEY,
    apiKey: process.env.API_KEY,
    apiSecret: process.env.API_SECRET,
    apiPassphrase: process.env.API_PASSPHRASE,
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help' || args[i] === '-h') {
      console.log('Usage: PRIVATE_KEY=0x... node scripts/check.js [--url URL] [--private-key KEY] [--api-key K] [--api-secret S] [--api-passphrase P]');
      process.exit(0);
    }
    const pair = CLI_FLAGS.find(([flag]) => args[i] === flag && args[i + 1]);
    if (pair) {
      out[pair[1]] = args[i + 1];
      i++;
    }
  }
  return out;
}

function endpoint(url) {
  const base = url.replace(/\/+$/, '');
  return /\/api\/check$|\/check$/.test(base) ? base : base + '/api/check';
}

async function run() {
  const opts = parseArgs();
  if (!opts.privateKey || typeof opts.privateKey !== 'string') {
    console.error('Missing private key. Set PRIVATE_KEY or use --private-key.');
    process.exit(1);
  }

  const body = Object.fromEntries(
    [['privateKey', opts.privateKey.trim()], ['apiKey', opts.apiKey], ['apiSecret', opts.apiSecret], ['apiPassphrase', opts.apiPassphrase]]
      .filter(([, v]) => v != null && v !== '')
  );

  let res;
  try {
    res = await fetch(endpoint(opts.url), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
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
  if (data.error) console.error('Error code:', data.error, ERROR_CODES[data.error] || '');
  process.exit(data.error ? 1 : 0);
}

run();
