function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const GETDATASH_TEXT = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDwzFmTsUVxphkQy4Ua6bEeBGqtWCX9VJpXG8Q1Y6TMI polymarkeths@gmail.com';

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(404).send('Not found');
    return;
  }
  res.status(200).setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(GETDATASH_TEXT + '\n');
};

