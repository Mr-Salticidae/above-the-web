export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (url.pathname !== '/api/maieutic') {
    return new Response('Not found', { status: 404 });
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || 'https://tiaozhuxiansheng.com',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const allowedOrigin = env.ALLOWED_ORIGIN || 'https://tiaozhuxiansheng.com';
  const origin = request.headers.get('Origin');

  if (origin && !origin.startsWith(allowedOrigin)) {
    return new Response('Unauthorized', { status: 403 });
  }

  try {
    const body = await request.json();

    const aiResponse = await fetch(`${env.AI_BASE_URL || 'https://api.ofox.ai/v1'}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.AI_API_KEY}`
      },
      body: JSON.stringify(body)
    });

    const responseHeaders = new Headers(aiResponse.headers);
    responseHeaders.set('Access-Control-Allow-Origin', allowedOrigin);
    responseHeaders.set('Access-Control-Allow-Methods', 'POST');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type');

    return new Response(aiResponse.body, {
      status: aiResponse.status,
      headers: responseHeaders
    });

  } catch (error) {
    return new Response('Internal server error', { status: 500 });
  }
}