import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function DebugPage() {
  const [session, setSession] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session) {
        try {
          const res = await fetch(
            "https://sggunyytungtyhezchft.functions.supabase.co/get-ebook-url",
            {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            }
          );
          
          const data = await res.json();
          
          if (!res.ok) {
            setError(`API Error: ${res.status} - ${JSON.stringify(data)}`);
          } else {
            setPdfUrl(data.url);
          }
        } catch (err: any) {
          setError(err.message);
        }
      }
    };
    
    checkSession();
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', background: '#1a1a1a', color: 'white', minHeight: '100vh' }}>
      <h1>Debug Status</h1>
      
      <h2>Session Status:</h2>
      <pre>{JSON.stringify(session, null, 2)}</pre>
      
      <h2>PDF URL:</h2>
      <pre>{pdfUrl || 'Not loaded'}</pre>
      
      <h2>Error:</h2>
      <pre>{error || 'No errors'}</pre>
      
      {session && (
        <div>
          <h2>Test Direct PDF Access:</h2>
          {pdfUrl && (
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              Open PDF in new tab
            </a>
          )}
        </div>
      )}
    </div>
  );
}