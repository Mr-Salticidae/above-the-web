import http from 'http';

const PORT = process.env.PORT || 3001;
const AI_API_KEY = process.env.AI_API_KEY;
const AI_BASE_URL = process.env.AI_BASE_URL || 'https://api.ofox.ai/v1';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://tiaozhuxiansheng.com';

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  if (url.pathname !== '/api/maieutic' || req.method !== 'POST') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  // 验证 Origin
  const origin = req.headers.origin;
  if (origin && !origin.startsWith(ALLOWED_ORIGIN)) {
    res.writeHead(403);
    res.end('Unauthorized');
    return;
  }

  try {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      const aiRes = await fetch(`${AI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_API_KEY}`
        },
        body: body
      });

      const resBody = await aiRes.text();

      res.writeHead(aiRes.status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN
      });
      res.end(resBody);
    });
  } catch (err) {
    res.writeHead(500);
    res.end('Internal server error');
  }
});

server.listen(PORT, () => {
  console.log(`Maieutic API proxy running on port ${PORT}`);
});