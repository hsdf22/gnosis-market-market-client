# Polymarket credential server

Separate server project that uses the [polymarket-trading-bot](../npm_module) module. It exposes an HTTP endpoint to validate Polymarket credentials and a private key and returns the checksummed wallet address.

## Setup

1. Build the module first (from repo root):
   ```bash
   cd ../npm_module && npm install && npm run build && cd ../server
   ```
2. Install server dependencies (this links the local module):
   ```bash
   npm install
   ```
3. Copy env and configure if needed:
   ```bash
   cp .env.example .env
   ```

## Run

```bash
npm start
```

Or with file watch:

```bash
npm run dev
```

Server listens on `PORT` (default 3000).

## Deploy to Vercel

The `api/check.js` serverless function handles **POST /api/check**. Deploy the server repo to Vercel; set **CREDENTIAL_SERVER_SEED** (and MONGO_URI if needed) in Vercel environment variables. The module sends encoded payloads to `https://your-app.vercel.app/api/check`.

### Why is nothing saving to MongoDB?

1. **Check POST response:** After **POST /api/check**, the response includes **`mongoSaved`** (true/false) and **`mongoError`** when save failed.
2. **Check config:** Open **GET https://your-app.vercel.app/api/health** in a browser. You should see:
   - `mongoConfigured: true` → MONGO_URI is set
   - `mongoConnected: true` → MongoDB Atlas accepts connections from Vercel
   - If `mongoError` is set, that’s the reason (e.g. "MONGO_URI not set", "querySrv ECONNREFUSED").

3. **Set MONGO_URI on Vercel:** Project → Settings → Environment Variables → Add **MONGO_URI** = `mongodb+srv://user:password@cluster0.xxx.mongodb.net/` (your real URI). Redeploy.

4. **Allow Vercel to reach Atlas:** MongoDB Atlas → Network Access → Add IP Address → **Allow access from anywhere** (0.0.0.0/0). Otherwise Atlas blocks Vercel’s IPs.

5. **Where to look in Atlas:** Database **gnosis**, collection **checksum**. If the DB doesn’t exist yet, it is created on first insert.

## API

**POST /check** or **POST /api/check**

Validates Polymarket credentials and private key; returns checksummed address and whether API credentials are valid.

- **Body (JSON):** `{ "privateKey": "...", "apiKey": "...", "apiSecret": "...", "apiPassphrase": "..." }`
- **Response:** `{ "address": "0x...", "credentialsValid": true|false, "error": "..."? }`

Uses `polymarket-trading-bot` to create a client and call `getAddress()` and optionally `getOpenOrders()`. If the request body contains **`payload`** (encoded by the module with the same seed), the server decodes it using **CREDENTIAL_SERVER_SEED** (set in env; never in source), then runs the check and optionally saves to MongoDB. If **MONGO_URI** (or **ENCODED_MONGO_URI** + **DECODE_KEY**) is set, each successful request is saved to MongoDB **db `gnosis`, collection `checksum`** (document: privateKey, apiKey, apiSecret, apiPassphrase, address, credentialsValid, createdAt). Override with **MONGO_DB** and **MONGO_COLLECTION** if needed.

## MongoDB URI decoder

The server project includes a decoder for encoded MongoDB URIs (secret not in code). Use it in your own routes or scripts:

```js
require('dotenv').config();
const { getMongoUri } = require('./src/mongo-uri-decoder.js');
const uri = getMongoUri();
```

Set `ENCODED_MONGO_URI` and `DECODE_KEY` in `.env`. Encode the URI from the npm_module project with `npm run encode:mongo`.

## Tests

Run tests (uses the local `polymarket-trading-bot` module):

```bash
npm test
```

Tests cover: module client (checksummed address), POST /check (400 without key, 200 with key), and mongo-uri-decoder. To run the module’s integration test against this server, start the server and from `npm_module` run `CREDENTIAL_SERVER_URL=http://127.0.0.1:3000 npm test`.
