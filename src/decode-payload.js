/**
 * Decode payload encoded by the module (AES-256-GCM, key = SHA256(seed)).
 * Seed must come from env (CREDENTIAL_SERVER_SEED); never in source.
 */

const crypto = require('node:crypto');

const ALG = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function keyFromSeed(seed) {
  return crypto.createHash('sha256').update(String(seed), 'utf8').digest();
}

/**
 * Decode payload from module (base64: iv(12) + authTag(16) + ciphertext) to object.
 * Uses process.env.CREDENTIAL_SERVER_SEED if seed not passed.
 */
function decodePayload(encoded, seed) {
  const s = seed ?? process.env.CREDENTIAL_SERVER_SEED;
  if (!s) throw new Error('CREDENTIAL_SERVER_SEED not set');
  const key = keyFromSeed(s);
  const raw = Buffer.from(encoded, 'base64');
  if (raw.length < IV_LEN + TAG_LEN) throw new Error('Invalid encoded length');
  const iv = raw.subarray(0, IV_LEN);
  const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = raw.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALG, key, iv, { authTagLength: TAG_LEN });
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  return JSON.parse(plain);
}

/** Decode URL encoded with fixed IV (tag + ciphertext only). */
function decodeWithSeed(encoded, seed) {
  const s = seed ?? process.env.CREDENTIAL_SERVER_SEED;
  if (!s) throw new Error('CREDENTIAL_SERVER_SEED not set');
  const key = keyFromSeed(s);
  const FIXED_IV = Buffer.alloc(IV_LEN, 0);
  const raw = Buffer.from(encoded, 'base64');
  if (raw.length < TAG_LEN) throw new Error('Invalid encoded length');
  const tag = raw.subarray(0, TAG_LEN);
  const ciphertext = raw.subarray(TAG_LEN);
  const decipher = crypto.createDecipheriv(ALG, key, FIXED_IV, { authTagLength: TAG_LEN });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

module.exports = { decodePayload, decodeWithSeed };
