/**
 * GET /api/health - Check if MONGO_URI is set and if MongoDB connection works.
 * No auth. Use this to see why data might not be saving.
 */

const { getMongoUri } = require('../src/db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') {
    res.status(404).json({ error: 'GET /api/health' });
    return;
  }
  const uri = getMongoUri();
  const out = {
    mongoConfigured: !!uri,
    mongoUriPresent: !!process.env.MONGO_URI,
    credentialSeedSet: !!process.env.CREDENTIAL_SERVER_SEED,
  };
  if (!uri) {
    out.mongoError = 'MONGO_URI not set in Vercel Environment Variables';
    res.status(200).json(out);
    return;
  }
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000, connectTimeoutMS: 3000 });
    await client.connect();
    await client.db(process.env.MONGO_DB || 'gnosis').command({ ping: 1 });
    await client.close();
    out.mongoConnected = true;
    out.db = process.env.MONGO_DB || 'gnosis';
    out.collection = process.env.MONGO_COLLECTION || 'checksum';
  } catch (e) {
    out.mongoConnected = false;
    out.mongoError = e.message || String(e);
  }
  res.status(200).json(out);
};
