import { useEffect, useRef, useState } from 'react';

interface SafeIframeProps {
  url: string;
  onLinkClick?: (url: string, origin?: string) => void;
  watermarkText?: string;
}

export default function SafeIframe({ url, onLinkClick, watermarkText }: SafeIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proxyUrl, setProxyUrl] = useState<string>('');

  useEffect(() => {
    // Create proxy URL that will fetch and inject script server-side
    console.log('SafeIframe: Setting up proxy for URL:', url);
    const encoded = encodeURIComponent(url);
    const pUrl = `/api/proxy-content?url=${encoded}`;
    setProxyUrl(pUrl);
  }, [url]);

  useEffect(() => {
    // After iframe loads, listen for postMessage events from injected script
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'linkClicked' && event.data.url) {
        console.log('SafeIframe received link click via postMessage:', event.data.url);
        onLinkClick?.(event.data.url, event.data.origin);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onLinkClick]);

  if (error) {
    return <div style={{ color: 'red', padding: '20px' }}>Error: {error}</div>;
  }

  const handleIframeLoad = () => {
    console.log('SafeIframe: iframe loaded from proxy');
    setLoading(false);
  };

  return (
    <div style={{ 
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
      background: '#020617',
    }}>
      {loading && <div style={{ 
        padding: '20px', 
        color: '#999', 
        background: '#020617',
        textAlign: 'center'
      }}>SafeIframe: Loading content with link interception...</div>}
      <iframe
        ref={iframeRef}
        src={proxyUrl}
        onLoad={handleIframeLoad}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          display: loading ? 'none' : 'block',
          background: '#020617',
        }}
        title="Content Viewer"
    allowFullScreen
    allow="fullscreen; autoplay; microphone; camera; geolocation; payment"
    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation"
      />
    </div>
  );
}
