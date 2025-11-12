import { Document, Page, pdfjs } from "react-pdf";
import { useState } from "react";

// ตั้งค่า worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function TestPdf() {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber] = useState(1);
  
  // ใช้ PDF ตัวอย่างจาก internet
  const testPdfUrl = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    console.log("Test PDF loaded, pages:", numPages);
    setNumPages(numPages);
  }

  function onDocumentLoadError(error: Error) {
    console.error("Test PDF error:", error);
  }

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "#0f172a", 
      color: "white", 
      padding: 20,
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    }}>
      <h1>PDF Test Page</h1>
      <p>Testing react-pdf with sample PDF</p>
      
      <div style={{ 
        border: "1px solid #374151", 
        padding: 20, 
        borderRadius: 8,
        background: "#1f2937"
      }}>
        <Document
          file={testPdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div style={{ padding: 40, textAlign: "center" }}>
              Loading test PDF...
            </div>
          }
          error={
            <div style={{ padding: 40, textAlign: "center", color: "#f87171" }}>
              Failed to load test PDF
            </div>
          }
        >
          <Page 
            pageNumber={pageNumber} 
            width={600}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>
      
      {numPages && (
        <p style={{ marginTop: 16 }}>
          Page {pageNumber} of {numPages}
        </p>
      )}
    </div>
  );
}