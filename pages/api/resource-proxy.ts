import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { url, origin } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  let targetUrl: URL;

  try {
    targetUrl = new URL(url);
  } catch (error) {
    return res.status(400).json({ error: 'Invalid URL provided' });
  }

  const upstreamHeaders: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': typeof req.headers['accept'] === 'string' ? req.headers['accept'] : '*/*',
    'Accept-Language': 'en-US,en;q=0.9,th;q=0.8',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Dest': 'empty',
  };

  const refererHeader = typeof origin === 'string' ? origin : undefined;
  if (refererHeader) {
    upstreamHeaders['Referer'] = refererHeader;
  } else {
    upstreamHeaders['Referer'] = targetUrl.origin;
  }

  try {
    const upstreamResponse = await fetch(targetUrl.toString(), {
      headers: upstreamHeaders,
      redirect: 'follow',
    });

    res.status(upstreamResponse.status);

    upstreamResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'transfer-encoding') {
        return;
      }
      res.setHeader(key, value);
    });

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Access-Control-Allow-Origin', '*');

  const buffer = Buffer.from(await upstreamResponse.arrayBuffer());
  res.setHeader('Content-Length', buffer.length.toString());
  res.send(buffer);
  } catch (error) {
    console.error('Resource proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch remote resource' });
  }
}
