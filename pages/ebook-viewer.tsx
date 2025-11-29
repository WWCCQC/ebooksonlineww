import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import ProtectedCanvaViewer from "../components/ProtectedCanvaViewer";

export default function EbookPage() {
  const router = useRouter();
  const [canvaUrl, setCanvaUrl] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        console.log("Loading ebook page...");
        
        // ตรวจสอบข้อมูลผู้ใช้จาก localStorage
        const userDataStr = localStorage.getItem('user_data');
        if (!userDataStr) {
          console.log("No user data found, redirecting to login");
          router.push("/login");
          return;
        }

        const userData = JSON.parse(userDataStr);
        console.log("Current user:", userData);

        // ตั้งค่าข้อมูลผู้ใช้
        setUserEmail(userData.id_card);
        setFullName(userData.full_name);

        // สร้าง token สำหรับ Canva (ใช้ id_card และ timestamp)
        const tokenData = {
          id_card: userData.id_card,
          full_name: userData.full_name,
          timestamp: Date.now(),
        };
        
        // Encode ให้รองรับภาษาไทย
        const token = btoa(unescape(encodeURIComponent(JSON.stringify(tokenData))));

        // บันทึก token ใน localStorage เพื่อใช้ในหน้าอื่น
        localStorage.setItem('canva_token', token);

        // ตรวจสอบว่ามี target_url จาก home page หรือไม่
        const targetUrl = localStorage.getItem('target_url');
        console.log("🔍 Target URL from localStorage:", targetUrl);
        
        const ebookEmbedUrl = targetUrl || "https://www.canva.com/design/DAG4dl4vPcc/coe4BRf6XquhoALk3JKK1g/view?embed";
        
        // ลบ target_url ออกหลังใช้งาน
        if (targetUrl) {
          console.log("✅ Using target URL:", targetUrl);
          localStorage.removeItem('target_url');
        } else {
          console.log("ℹ️ Using default URL");
        }
        
        console.log("Generated token:", token);
        console.log("eBook embed URL:", ebookEmbedUrl);
        console.log("Token data:", tokenData);
        setCanvaUrl(ebookEmbedUrl);
        setLoading(false);

      } catch (err: any) {
        console.error("Error processing ebook:", err);
        setError(err.message ?? "เกิดข้อผิดพลาด");
        setLoading(false);
      }
    };

    load();
  }, [router]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#020617",
          color: "white",
          gap: "16px",
        }}
      >
        <div>กำลังเตรียม Canva eBook...</div>
        <div style={{ fontSize: "14px", opacity: 0.7 }}>
          กำลังตรวจสอบสิทธิ์ของคุณ
        </div>
      </div>
    );
  }

  if (error || !canvaUrl) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#020617",
          color: "white",
          padding: 16,
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ marginBottom: 8 }}>เกิดข้อผิดพลาด</h1>
          <p>{error ?? "ไม่สามารถเตรียม eBook ได้"}</p>
          <button 
            onClick={() => router.push("/login")}
            style={{
              marginTop: 16,
              padding: "8px 16px",
              background: "#22c55e",
              border: "none",
              borderRadius: 6,
              color: "white",
              cursor: "pointer"
            }}
          >
            กลับไปหน้า Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'none' }}>
        Debug: canvaUrl={canvaUrl}, fullName={fullName}
      </div>
      <ProtectedCanvaViewer 
        url={canvaUrl} 
        watermarkText={fullName}
        userEmail={userEmail}
        fullName={fullName}
      />
    </>
  );
}
