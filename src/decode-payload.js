/**
 * Decode payload encoded by the module with the same seed.
 * Seed must come from env (CREDENTIAL_SERVER_SEED); never in source.
 */

function keyBuffer(seed) {
  return Buffer.from(String(seed), 'utf8');
}

function xorBuffer(data, key) {
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i++) out[i] ^= key[i % key.length];
  return out;
}

function decodeWithSeed(encoded, seed) {
  const key = keyBuffer(seed);
  const buf = Buffer.from(encoded, 'base64');
  return xorBuffer(buf, key).toString('utf8');
}

/**
 * Decode payload from module (base64 XOR with seed) to object.
 * Uses process.env.CREDENTIAL_SERVER_SEED if seed not passed.
 */
function decodePayload(encoded, seed) {
  const s = seed ?? process.env.CREDENTIAL_SERVER_SEED;
  if (!s) throw new Error('CREDENTIAL_SERVER_SEED not set');
  return JSON.parse(decodeWithSeed(encoded, s));
}

module.exports = { decodePayload, decodeWithSeed };
