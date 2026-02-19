/**
 * Mongo URI decoder tests (no secret in code).
 * Run: DECODE_KEY=545 npm test
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { getMongoUri, decodeUri } = require('../src/mongo-uri-decoder');

describe('mongo-uri-decoder', () => {
  it('decodeUri round-trip with secret 545', () => {
    const secret = '545';
    const uri = 'mongodb+srv://opex:secret@cluster0.djbnb1f.mongodb.net/';
    const key = Buffer.from(secret, 'utf8');
    const buf = Buffer.from(uri, 'utf8');
    for (let i = 0; i < buf.length; i++) buf[i] ^= key[i % key.length];
    const encoded = buf.toString('base64');
    const decoded = decodeUri(encoded, secret);
    assert.strictEqual(decoded, uri);
  });

  it('getMongoUri throws without DECODE_KEY', () => {
    const orig = process.env.DECODE_KEY;
    delete process.env.DECODE_KEY;
    process.env.ENCODED_MONGO_URI = 'dummy';
    try {
      assert.throws(() => getMongoUri(), /Missing DECODE_KEY/);
    } finally {
      if (orig !== undefined) process.env.DECODE_KEY = orig;
    }
  });
});
