import type { NextApiRequest, NextApiResponse } from 'next';

type ResponseData = {
  html?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // ดึง content จาก URL
    const response = await fetch(url);
    let html = await response.text();

    // Inject script เพื่อ intercept links ภายใน content
    const injectedScript = `
      <script>
        // Intercept all links
        document.addEventListener('click', function(e) {
          const link = e.target.closest('a');
          if (link && link.href && link.href.startsWith('http')) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Link clicked:', link.href);
            // ส่ง message ไป parent window
            window.top.postMessage({
              type: 'linkClicked',
              url: link.href
            }, '*');
            return false;
          }
        }, true);

        // Override window.open
        const originalOpen = window.open;
        window.open = function(url, target, features) {
          console.log('window.open called:', url);
          if (url) {
            window.top.postMessage({
              type: 'linkClicked',
              url: url
            }, '*');
          }
          return null;
        };

        // Remove all target="_blank"
        document.querySelectorAll('a[target="_blank"]').forEach(link => {
          link.removeAttribute('target');
        });
      </script>
    `;

    // เพิ่ม script ลงท้าย body
    html = html.replace('</body>', injectedScript + '</body>');

    // ตั้ง headers ให้ไม่ cache
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    
    return res.status(200).json({ html });
  } catch (error) {
    console.error('Error fetching URL:', error);
    return res.status(500).json({ error: 'Failed to fetch URL' });
  }
}
