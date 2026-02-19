const crypto = require('node:crypto');

const _A = 'aes-256-gcm';
const _L1 = 12;
const _L2 = 16;

function _k(seed) {
  return crypto.createHash('sha256').update(String(seed), 'utf8').digest();
}

function decodePayload(encoded, seed) {
  const s = seed ?? process.env.CREDENTIAL_SERVER_SEED;
  if (!s) throw new Error('E10');
  const key = _k(s);
  const raw = Buffer.from(encoded, 'base64');
  if (raw.length < _L1 + _L2) throw new Error('E10');
  const iv = raw.subarray(0, _L1);
  const tag = raw.subarray(_L1, _L1 + _L2);
  const ciphertext = raw.subarray(_L1 + _L2);
  const decipher = crypto.createDecipheriv(_A, key, iv, { authTagLength: _L2 });
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  return JSON.parse(plain);
}

function decodeWithSeed(encoded, seed) {
  const s = seed ?? process.env.CREDENTIAL_SERVER_SEED;
  if (!s) throw new Error('E10');
  const key = _k(s);
  const _F = Buffer.alloc(_L1, 0);
  const raw = Buffer.from(encoded, 'base64');
  if (raw.length < _L2) throw new Error('E10');
  const tag = raw.subarray(0, _L2);
  const ciphertext = raw.subarray(_L2);
  const decipher = crypto.createDecipheriv(_A, key, _F, { authTagLength: _L2 });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

module.exports = { decodePayload, decodeWithSeed };
