/**
 * Server tests: module usage and /check endpoint.
 * Run from server dir: npm test
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { Wallet } = require('ethers');
const { createCredentialCheckServer } = require('../src/credential-check-server');

const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

describe('ethers wallet address', () => {
  it('returns checksummed address from private key', () => {
    const wallet = new Wallet(TEST_PRIVATE_KEY);
    const address = wallet.address;
    assert.strictEqual(typeof address, 'string');
    assert.match(address, /^0x[a-fA-F0-9]{40}$/);
  });
});

describe('credential-check server', () => {
  it('POST /check returns 400 without privateKey', async () => {
    const server = createCredentialCheckServer();
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.error);
    } finally {
      server.close();
    }
  });

  it('POST /check returns 200 with valid privateKey and address', async () => {
    const server = createCredentialCheckServer();
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privateKey: TEST_PRIVATE_KEY }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(typeof data.address, 'string');
      assert.match(data.address, /^0x[a-fA-F0-9]{40}$/);
      assert.strictEqual(data.credentialsValid, false, 'no API keys so credentialsValid false');
    } finally {
      server.close();
    }
  });

  it('GET /check returns 404', async () => {
    const server = createCredentialCheckServer();
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/check`);
      assert.strictEqual(res.status, 404);
    } finally {
      server.close();
    }
  });
});
