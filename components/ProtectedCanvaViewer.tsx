import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import SafeIframe from "./SafeIframe";

interface ProtectedCanvaViewerProps {
  url: string;
  watermarkText: string;
  userEmail?: string;
  fullName?: string;
}

type ModalStackEntry = {
  url: string;
  origin?: string;
};

export default function ProtectedCanvaViewer({
  url,
  watermarkText,
  userEmail,
  fullName,
}: ProtectedCanvaViewerProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [iframeUrl, setIframeUrl] = useState(url);
  const [modalStack, setModalStack] = useState<ModalStackEntry[]>([]);
  const modalCanvasRef = useRef<HTMLCanvasElement>(null);

  // Sync iframeUrl when url prop changes
  useEffect(() => {
    setIframeUrl(url);
  }, [url]);

  const handleLogout = () => {
    // ลบข้อมูล localStorage
    localStorage.removeItem('user_data');
    localStorage.removeItem('canva_token');
    
    // ย้ายไปหน้า login
    router.push('/login');
  };

  useEffect(() => {
    // ทำให้ไม่สามารถ copy, cut, paste ได้
    const container = containerRef.current;
    if (!container) return;

    const hasCopyOverride = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      return Boolean(target.closest('[data-allow-copy="true"]'));
    };

    const preventCopy = (e: ClipboardEvent) => {
      if (hasCopyOverride(e.target)) {
        return true;
      }
      e.preventDefault();
      return false;
    };

    const preventRightClick = (e: MouseEvent) => {
      if (hasCopyOverride(e.target)) {
        return true;
      }
      e.preventDefault();
      return false;
    };

    const preventDrag = (e: DragEvent) => {
      if (hasCopyOverride(e.target)) {
        return true;
      }
      e.preventDefault();
      return false;
    };

    container.addEventListener("copy", preventCopy);
    container.addEventListener("cut", preventCopy);
    container.addEventListener("contextmenu", preventRightClick);
    container.addEventListener("drag", preventDrag);

    // Disable keyboard shortcuts
    const preventKeyCopy = (e: KeyboardEvent) => {
      if (hasCopyOverride(e.target)) {
        return true;
      }
      // Ctrl+C, Ctrl+X, Ctrl+S
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "c" || e.key === "x" || e.key === "s")
      ) {
        e.preventDefault();
      }
    };
    container.addEventListener("keydown", preventKeyCopy);

    // Zoom in/out with Ctrl/Cmd + Mouse Wheel
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoomLevel((prev) => {
          let newZoom = prev + (e.deltaY > 0 ? -10 : 10);
          newZoom = Math.max(50, Math.min(200, newZoom)); // ระหว่าง 50% ถึง 200%
          return newZoom;
        });
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("copy", preventCopy);
      container.removeEventListener("cut", preventCopy);
      container.removeEventListener("contextmenu", preventRightClick);
      container.removeEventListener("drag", preventDrag);
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("keydown", preventKeyCopy);
    };
  }, []);

  // Intercept link navigation ที่เกิดจาก Canva embed
  // ป้องกัน link จาก Canva ให้เปิดใน tab/window ใหม่
  // แทนที่จะเปิด link ให้อยู่ใน iframe เดียว
  
  // SafeIframe จะจัดการ link interception แล้ว
  // ส่วน useEffect เก่าลบออกไป

  useEffect(() => {
    // วาดลายน้ำ
    const drawWatermark = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      canvas.width = rect.width;
      canvas.height = rect.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // ล้างข้อมูลเก่า
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // ตั้งค่าลายน้ำ - สีขาวจางๆ ที่มองเห็นชัด
      ctx.font = "bold 25px Arial";
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)"; // สีขาว ความเข้ม 35% (มองเห็นชัดขึ้น)
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // วาดลายน้ำหลาย ๆ ครั้ง แบบ diagonal
      for (let i = -1; i < 5; i++) {
        for (let j = -1; j < 5; j++) {
          ctx.save();
          ctx.translate(
            (rect.width / 4) * (i + 0.5),
            (rect.height / 4) * (j + 0.5)
          );
          ctx.rotate((-Math.PI / 4));
          ctx.fillText(watermarkText, 0, 0);
          ctx.restore();
        }
      }
    };

    // รอให้ iframe โหลดเสร็จ
    setTimeout(() => {
      drawWatermark();
      setIsLoading(false);
    }, 500);

    // วาดลายน้ำใหม่เมื่อ resize
    const handleResize = () => {
      drawWatermark();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [watermarkText]);

  // Draw watermark on modal
  useEffect(() => {
    if (modalStack.length === 0 || !modalCanvasRef.current) return;

    const drawModalWatermark = () => {
      const canvas = modalCanvasRef.current;
      if (!canvas) return;

      const viewportRect = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      canvas.width = viewportRect.width;
      canvas.height = viewportRect.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.font = "bold 25px Arial";
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)"; // สีขาว ความเข้ม 35% (มองเห็นชัดขึ้น)
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Draw watermark pattern
      for (let i = -1; i < 5; i++) {
        for (let j = -1; j < 5; j++) {
          ctx.save();
          ctx.translate(
            (viewportRect.width / 4) * (i + 0.5),
            (viewportRect.height / 4) * (j + 0.5)
          );
          ctx.rotate((-Math.PI / 4));
          ctx.fillText(watermarkText, 0, 0);
          ctx.restore();
        }
      }
    };

    drawModalWatermark();

    const handleResize = () => {
      drawModalWatermark();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [modalStack, watermarkText]);

  const normalizeModalLink = useCallback((rawUrl: string | undefined, fallbackOrigin?: string) => {
    if (!rawUrl) {
      return { url: undefined, origin: fallbackOrigin };
    }

    try {
      const baseHref = typeof window !== 'undefined' ? window.location.href : undefined;
      const parsed = baseHref ? new URL(rawUrl, baseHref) : new URL(rawUrl);
      const currentHost = typeof window !== 'undefined' ? window.location.host : parsed.host;
      const shouldDecodeTarget = parsed.pathname === '/link' && parsed.searchParams.has('target');
      if (shouldDecodeTarget) {
        const targetParam = parsed.searchParams.get('target');
        if (targetParam) {
          try {
            const decoded = decodeURIComponent(targetParam);
            const decodedParsed = new URL(decoded);
            return {
              url: decodedParsed.toString(),
              origin: decodedParsed.origin,
            };
          } catch (decodeErr) {
            console.warn('Modal normalize: Unable to decode target param', decodeErr);
          }
        }
      }
      return {
        url: parsed.toString(),
        origin: parsed.origin || fallbackOrigin,
      };
    } catch (err) {
      console.warn('Modal normalize: Unable to parse link URL', rawUrl, err);
      return { url: rawUrl, origin: fallbackOrigin };
    }
  }, []);

  // Listen for postMessage from modal iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log("📨 Message received:", event.data);
      
      if (event.data && event.data.type === 'linkClicked') {
        const rawUrl = event.data.url as string | undefined;
        const fallbackOrigin = event.data.origin as string | undefined;
        const normalized = normalizeModalLink(rawUrl, fallbackOrigin);
        const linkUrl = normalized.url;
        const origin = normalized.origin;
        console.log("🔗 Link clicked in modal iframe:", linkUrl, "origin:", origin);
        
        if (!linkUrl) {
          return;
        }

        // ตรวจสอบว่าเป็น FlipHTML5 - ต้องอยู่ใน modal เท่านั้น
        if (linkUrl.includes('fliphtml5.com') || linkUrl.includes('fliphtml5')) {
          console.log("📖 FlipHTML5 link from modal - keeping in modal:", linkUrl);
          // อัพเดท modal stack สำหรับ FlipHTML5
          setModalStack(prev => {
            const last = prev[prev.length - 1];
            if (last && last.url === linkUrl && last.origin === origin) {
              return prev;
            }

            const shouldReplaceLast = !!last && last.url.includes('/link?target=');

            if (shouldReplaceLast) {
              const updated = [...prev];
              updated[updated.length - 1] = { url: linkUrl, origin };
              return updated;
            }

            return [...prev, { url: linkUrl, origin }];
          });
          return;
        }

        // ตรวจสอบว่าเป็น Canva link หรือไม่ - แสดงใน iframe หลัก
        if (linkUrl.includes('canva.com') || linkUrl.includes('canva.cn')) {
          console.log("🔗 Loading Canva link in main iframe from modal:", linkUrl);
          setIframeUrl(linkUrl);
          // ปิด modal ทั้งหมด
          setModalStack([]);
          return;
        }

        // Links อื่นๆ - อัพเดท modal stack
        setModalStack(prev => {
          const last = prev[prev.length - 1];
          if (last && last.url === linkUrl && last.origin === origin) {
            return prev;
          }

          const shouldReplaceLast = !!last && last.url.includes('/link?target=');

          if (shouldReplaceLast) {
            const updated = [...prev];
            updated[updated.length - 1] = { url: linkUrl, origin };
            return updated;
          }

          return [...prev, { url: linkUrl, origin }];
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [normalizeModalLink]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100vh",
        background: "#020617",
        overflow: "hidden",
        WebkitUserSelect: "none",
        userSelect: "none" as any,
      }}
    >
      {/* Header ที่แสดงชื่อผู้ใช้ */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          background: "rgba(15, 23, 42, 0.95)",
          color: "white",
          padding: "12px 24px",
          zIndex: 101,
          borderBottom: "1px solid #334155",
          backdropFilter: "blur(10px)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* Left: Logo/Info */}
        <div style={{ textAlign: "left" }}>
          <strong style={{ fontSize: "14px" }}>WIRE & WIRELESS</strong>
        </div>

        {/* Right: User info and controls */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "16px" }}>
          <div>
            <span style={{ fontSize: "13px", opacity: 0.8 }}>
              ยินดีต้อนรับ: <strong>{fullName}</strong>
            </span>
          </div>

          {/* Zoom Controls */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center", borderLeft: "1px solid #475569", paddingLeft: "12px" }}>
            <button
              onClick={() => setZoomLevel((prev) => Math.max(50, prev - 10))}
              style={{
                background: "#334155",
                border: "none",
                color: "white",
                padding: "4px 8px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: "bold",
                transition: "background 0.2s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#475569")}
              onMouseOut={(e) => (e.currentTarget.style.background = "#334155")}
            >
              −
            </button>
            <span style={{ fontSize: "11px", minWidth: "40px", textAlign: "center" }}>
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel((prev) => Math.min(200, prev + 10))}
              style={{
                background: "#334155",
                border: "none",
                color: "white",
                padding: "4px 8px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: "bold",
                transition: "background 0.2s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#475569")}
              onMouseOut={(e) => (e.currentTarget.style.background = "#334155")}
            >
              +
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              style={{
                background: "#22c55e",
                border: "none",
                color: "white",
                padding: "4px 8px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: "bold",
                transition: "background 0.2s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#16a34a")}
              onMouseOut={(e) => (e.currentTarget.style.background = "#22c55e")}
            >
              Reset
            </button>
          </div>

          {/* ปุ่มออกจากระบบ */}
          <button
            onClick={handleLogout}
            style={{
              background: "#ef4444",
              border: "none",
              color: "white",
              padding: "4px 12px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: "bold",
              transition: "background 0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#dc2626")}
            onMouseOut={(e) => (e.currentTarget.style.background = "#ef4444")}
          >
            🚪 ออก
          </button>
        </div>
      </div>

      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "#020617",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            zIndex: 10,
          }}
        >
          <div>กำลังโหลด...</div>
        </div>
      )}

      <div
        ref={iframeContainerRef}
        style={{
          position: "relative",
          width: "100%",
          height: 0,
          paddingTop: "56.2225%",
          paddingBottom: 0,
          boxShadow: "0 2px 8px 0 rgba(63,69,81,0.16)",
          margin: "70px 1.6em 0.9em 1.6em",
          overflow: "hidden",
          borderRadius: "8px",
          transformOrigin: "top center",
          transform: `scale(${zoomLevel / 100})`,
          transition: "transform 0.2s ease-out",
        }}
      >
        {/* ใช้ SafeIframe สำหรับทุก URL เพื่อจับ link clicks */}
        <SafeIframe 
          url={iframeUrl} 
          onLinkClick={(clickedUrl, origin) => {
            console.log("📍 SafeIframe link clicked:", clickedUrl, "origin:", origin);
            if (!clickedUrl) {
              return;
            }
            
            const normalized = normalizeModalLink(clickedUrl, origin);
            if (!normalized.url) {
              return;
            }
            
            // ตรวจสอบว่าเป็น FlipHTML5 - แสดงใน modal เท่านั้น
            if (normalized.url.includes('fliphtml5.com') || normalized.url.includes('fliphtml5') ||
                normalized.url.includes('online.fliphtml5')) {
              console.log("📖 Opening FlipHTML5 link in modal:", normalized.url);
              setModalStack([{ url: normalized.url, origin: normalized.origin }]);
              return;
            }
            
            // ตรวจสอบว่าเป็น Canva link หรือไม่ - แสดงใน iframe หลัก
            if (normalized.url.includes('canva.com') || normalized.url.includes('canva.cn')) {
              console.log("🔗 Loading Canva link in main iframe:", normalized.url);
              setIframeUrl(normalized.url);
              return;
            }
            
            // Links อื่นๆ - แสดงใน modal
            console.log("📖 Opening other link in modal:", normalized.url);
            setModalStack([{ url: normalized.url, origin: normalized.origin }]);
          }}
          watermarkText={watermarkText}
        />
      </div>

      {/* Watermark Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 50, // เปลี่ยนจาก 5 เป็น 50 ให้มันอยู่หน้า
          opacity: 1, // เปลี่ยนจาก 0.25 เป็น 1 ให้เห็นชัด
        }}
      />

      {/* Protective overlay - ป้องกันการคลิก */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 4,
        }}
        onMouseDown={(e) => e.preventDefault()}
      />

      {/* Modal Popup สำหรับ external links - Stack Modals */}
      {modalStack.map((modalEntry, index) => {
        if (!modalEntry.url) {
          return null;
        }
        const query = new URLSearchParams({ url: modalEntry.url });
        if (modalEntry.origin) {
          query.append('sourceOrigin', modalEntry.origin);
        }
        const iframeSrc = `/api/link-proxy?${query.toString()}`;

        return (
          <div
            key={`modal-${index}`}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.7)",
              zIndex: 200 + index * 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
          >
            {/* Modal Content */}
            <div
              style={{
                position: "relative",
                width: "90%",
                height: "90vh",
                maxWidth: "1200px",
                background: "#020617",
                borderRadius: "12px",
                border: "1px solid #334155",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.95)",
                  borderBottom: "1px solid #334155",
                  padding: "12px 24px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  zIndex: 210 + index * 10,
                }}
              >
                <div
                  style={{
                    color: "white",
                    fontSize: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <span aria-hidden="true">📖</span>
                  <span style={{ fontWeight: "bold" }}>FlipHTML5 Viewer</span>
                </div>
                <button
                  onClick={() => {
                    setModalStack(prev => prev.filter((_, i) => i !== index));
                  }}
                  style={{
                    background: "#ef4444",
                    border: "none",
                    color: "white",
                    padding: "6px 12px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "#dc2626")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "#ef4444")}
                >
                  ✕ ปิด
                </button>
              </div>

              {/* Modal iframe - ใช้ iframe โดยตรงสำหรับ FlipHTML5, ใช้ proxy สำหรับอื่นๆ */}
              {modalEntry.url && (modalEntry.url.includes('fliphtml5.com') || modalEntry.url.includes('fliphtml5') || modalEntry.url.includes('online.fliphtml5')) ? (
                <iframe
                  key={`fliphtml5-iframe-${index}`}
                  src={modalEntry.url}
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                    padding: 0,
                    margin: 0,
                    background: "white",
                  }}
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation allow-modals allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
                  allow="fullscreen; autoplay; microphone; camera; geolocation; payment; clipboard-read; clipboard-write"
                  allowFullScreen
                  onLoad={() => console.log("📚 FlipHTML5 iframe loaded in modal:", modalEntry.url)}
                />
              ) : (
                <iframe
                  key={`iframe-${index}`}
                  src={iframeSrc}
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                    padding: 0,
                    margin: 0,
                  }}
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
                  allow="fullscreen; autoplay; microphone; camera; geolocation; payment"
                />
              )}

              {/* Modal Watermark Canvas */}
              <canvas
                ref={index === modalStack.length - 1 ? modalCanvasRef : undefined}
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                  zIndex: 205 + index * 10,
                  opacity: 1,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
