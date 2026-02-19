/**
 * Decode an encoded MongoDB URI at runtime using DECODE_KEY from env.
 * The secret (e.g. 545) is never in this file — only in process.env.DECODE_KEY.
 */

function decodeUri(encoded, secret) {
  if (!secret) throw new Error('Missing DECODE_KEY in environment');
  const key = Buffer.from(String(secret), 'utf8');
  const buf = Buffer.from(encoded, 'base64');
  for (let i = 0; i < buf.length; i++) buf[i] ^= key[i % key.length];
  return buf.toString('utf8');
}

/**
 * Returns the MongoDB URI from the encoded value in env.
 * Requires ENCODED_MONGO_URI and DECODE_KEY in environment.
 * @param {string} [encoded] - Base64 encoded URI. If omitted, uses process.env.ENCODED_MONGO_URI.
 * @returns {string} Decoded MongoDB URI
 */
function getMongoUri(encoded) {
  const blob = encoded ?? process.env.ENCODED_MONGO_URI;
  if (!blob) throw new Error('Missing ENCODED_MONGO_URI');
  return decodeUri(blob, process.env.DECODE_KEY);
}

module.exports = { getMongoUri, decodeUri };
