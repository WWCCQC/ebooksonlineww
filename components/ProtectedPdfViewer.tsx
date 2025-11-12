// components/ProtectedPdfViewer.tsx
import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";

// ตั้งค่า worker ของ pdf.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

type Props = {
  fileUrl: string;
  watermarkText: string;
};

export default function ProtectedPdfViewer({ fileUrl, watermarkText }: Props) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    console.log("ProtectedPdfViewer mounted with URL:", fileUrl);
    setIsLoading(true);
    setHasError(false);
    setNumPages(null);
    
    // ทดสอบว่า URL สามารถเข้าถึงได้หรือไม่
    if (fileUrl) {
      fetch(fileUrl, { method: 'HEAD' })
        .then(response => {
          console.log("PDF URL accessibility check:", response.status, response.headers.get('content-type'));
        })
        .catch(error => {
          console.error("PDF URL not accessible:", error);
        });
    }
  }, [fileUrl]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log("PDF loaded successfully, pages:", numPages);
    setNumPages(numPages);
    setIsLoading(false);
    setHasError(false);
    setErrorMessage("");
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("PDF load error:", error);
    setIsLoading(false);
    setHasError(true);
    setErrorMessage(error.message || "ไม่สามารถโหลดไฟล์ PDF ได้");
  };

  // เพิ่ม timeout สำหรับการโหลด PDF
  useEffect(() => {
    if (fileUrl && isLoading) {
      const timeout = setTimeout(() => {
        if (isLoading && !hasError) {
          console.log("PDF loading timeout");
          setErrorMessage("โหลด PDF ใช้เวลานานเกินไป");
          setHasError(true);
          setIsLoading(false);
        }
      }, 30000); // 30 วินาที

      return () => clearTimeout(timeout);
    }
  }, [fileUrl, isLoading, hasError]);

  const canGoPrev = pageNumber > 1;
  const canGoNext = !!numPages && pageNumber < numPages;

  console.log("ProtectedPdfViewer render:", { fileUrl, isLoading, numPages });

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#020617",
        color: "white",
        userSelect: "none",
      }}
      onContextMenu={(e) => e.preventDefault()} // กันคลิกขวา
    >
      {/* แถบหัวควบคุมง่ายๆ */}
      <header
        style={{
          padding: "8px 16px",
          borderBottom: "1px solid #1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#0f172a",
        }}
      >
        <div>
          <div style={{ fontWeight: 600 }}>EBOOK Online</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            ผู้ใช้งาน: {watermarkText || "-"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => canGoPrev && setPageNumber((p) => p - 1)}
            disabled={!canGoPrev}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: "none",
              cursor: canGoPrev ? "pointer" : "default",
              opacity: canGoPrev ? 1 : 0.4,
            }}
          >
            ◀
          </button>
          <span style={{ fontSize: 12 }}>
            หน้า {pageNumber}/{numPages ?? "-"}
          </span>
          <button
            onClick={() => canGoNext && setPageNumber((p) => p + 1)}
            disabled={!canGoNext}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: "none",
              cursor: canGoNext ? "pointer" : "default",
              opacity: canGoNext ? 1 : 0.4,
            }}
          >
            ▶
          </button>
        </div>
      </header>

      {/* พื้นที่แสดง PDF + ลายน้ำ */}
      <main
        style={{
          flex: 1,
          position: "relative",
          overflow: "auto",
          background: "#020617",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
      >
        {isLoading && !hasError && (
          <div style={{
            padding: 40,
            textAlign: "center",
            color: "white"
          }}>
            <div style={{ marginBottom: 16, fontSize: 18 }}>กำลังโหลดเอกสาร...</div>
            <div style={{ fontSize: 14, opacity: 0.7, wordBreak: 'break-all', marginBottom: 16 }}>
              URL: {fileUrl}
            </div>
            <a 
              href={fileUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                color: '#60a5fa',
                textDecoration: 'underline',
                fontSize: 14
              }}
            >
              🔗 ทดสอบเปิด PDF ใน tab ใหม่
            </a>
          </div>
        )}
        
        {hasError && (
          <div style={{
            padding: 40,
            textAlign: "center",
            color: "#f87171",
            background: "#1f2937",
            borderRadius: 8,
            maxWidth: 600
          }}>
            <div style={{ marginBottom: 16, fontSize: 18 }}>⚠️ โหลดเอกสารไม่สำเร็จ</div>
            <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 12 }}>
              {errorMessage}
            </div>
            <div style={{ fontSize: 12, opacity: 0.6, wordBreak: 'break-all' }}>
              URL: {fileUrl}
            </div>
            <button 
              onClick={() => window.location.reload()} 
              style={{
                marginTop: 16,
                padding: '8px 16px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              ลองใหม่
            </button>
          </div>
        )}

        <div
          style={{
            boxShadow: "0 10px 40px rgba(0,0,0,0.7)",
            background: "#111827",
            display: (isLoading || hasError) ? "none" : "block"
          }}
        >
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            onLoadProgress={({ loaded, total }) => {
              console.log("PDF loading progress:", loaded, "/", total);
            }}
            loading={
              <div style={{ padding: 40, textAlign: "center", color: "white" }}>
                กำลังโหลดเอกสาร...
              </div>
            }
            error={
              <div style={{ padding: 40, textAlign: "center", color: "#f87171" }}>
                โหลดเอกสารไม่สำเร็จ
              </div>
            }
            options={{
              cMapUrl: `//cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/cmaps/`,
              cMapPacked: true,
              standardFontDataUrl: `//cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
            }}
          >
            <Page
              pageNumber={pageNumber}
              width={900}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              onLoadSuccess={() => console.log("Page loaded successfully")}
              onLoadError={(error) => console.error("Page load error:", error)}
            />
          </Document>
        </div>

        {/* ลายน้ำชื่อผู้ใช้ */}
        {watermarkText && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              opacity: 0.12,
            }}
          >
            <div
              style={{
                transform: "rotate(-30deg)",
                fontSize: 40,
                fontWeight: 700,
                color: "white",
                textAlign: "center",
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
              }}
            >
              {watermarkText}
              {"\n"}
              {watermarkText}
              {"\n"}
              {watermarkText}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
