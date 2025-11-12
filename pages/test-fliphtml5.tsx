import { useState } from "react";
import { useRouter } from "next/router";

export default function TestFlipHTML5Page() {
  const router = useRouter();
  const [fliphtml5Url, setFliphtml5Url] = useState("https://online.fliphtml5.com/");
  
  // ตัวอย่าง URLs ของ FlipHTML5 ที่นิยมใช้
  const exampleUrls = [
    "https://online.fliphtml5.com/",
    "https://fliphtml5.com/",
    // เพิ่ม URLs ตัวอย่างของคุณที่นี่
  ];

  const handleTestFlipHTML5 = () => {
    // ตั้งค่า user data จำลอง (ถ้ายังไม่มี)
    const userDataStr = localStorage.getItem('user_data');
    if (!userDataStr) {
      const mockUserData = {
        id_card: "test_user",
        full_name: "ผู้ทดสอบระบบ"
      };
      localStorage.setItem('user_data', JSON.stringify(mockUserData));
    }
    
    // บันทึก FlipHTML5 URL เป็น target_url
    console.log('🧪 Test: Setting FlipHTML5 URL as target:', fliphtml5Url);
    localStorage.setItem('target_url', fliphtml5Url);
    
    // ไปหน้า ebook-viewer ซึ่งจะเปิด FlipHTML5 ใน modal
    router.push('/ebook-viewer');
  };

  const handleTestWithCanva = () => {
    // ตั้งค่า user data จำลอง (ถ้ายังไม่มี)
    const userDataStr = localStorage.getItem('user_data');
    if (!userDataStr) {
      const mockUserData = {
        id_card: "test_user",
        full_name: "ผู้ทดสอบระบบ"
      };
      localStorage.setItem('user_data', JSON.stringify(mockUserData));
    }
    
    // ไปหน้า ebook-viewer ด้วย Canva URL ปกติ
    // FlipHTML5 links จะถูกเปิดใน modal เมื่อคลิกจาก Canva
    router.push('/ebook-viewer');
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ marginBottom: "30px" }}>🧪 ทดสอบ FlipHTML5 Modal</h1>
        
        {/* ส่วนทดสอบ Direct FlipHTML5 URL */}
        <div style={{
          background: "rgba(30, 41, 59, 0.8)",
          border: "1px solid #334155",
          borderRadius: "8px",
          padding: "24px",
          marginBottom: "24px"
        }}>
          <h2 style={{ marginBottom: "16px" }}>1. ทดสอบเปิด FlipHTML5 โดยตรง</h2>
          <p style={{ opacity: 0.8, marginBottom: "16px" }}>
            ใส่ URL ของ FlipHTML5 แล้วระบบจะเปิดใน modal พร้อม SafeFrame
          </p>
          
          <input
            type="text"
            value={fliphtml5Url}
            onChange={(e) => setFliphtml5Url(e.target.value)}
            placeholder="https://online.fliphtml5.com/..."
            style={{
              width: "100%",
              padding: "10px",
              background: "#1e293b",
              border: "1px solid #475569",
              borderRadius: "4px",
              color: "white",
              marginBottom: "12px",
              fontSize: "14px"
            }}
          />
          
          <div style={{ marginBottom: "16px" }}>
            <strong>URLs ตัวอย่าง:</strong>
            <ul style={{ marginTop: "8px", paddingLeft: "20px" }}>
              {exampleUrls.map((url, index) => (
                <li key={index} style={{ marginBottom: "4px" }}>
                  <button
                    onClick={() => setFliphtml5Url(url)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#60a5fa",
                      cursor: "pointer",
                      textDecoration: "underline",
                      fontSize: "13px"
                    }}
                  >
                    {url}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          
          <button
            onClick={handleTestFlipHTML5}
            style={{
              background: "#3b82f6",
              border: "none",
              color: "white",
              padding: "10px 20px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold"
            }}
          >
            🚀 ทดสอบเปิด FlipHTML5 ใน Modal
          </button>
        </div>

        {/* ส่วนทดสอบ Canva + FlipHTML5 */}
        <div style={{
          background: "rgba(30, 41, 59, 0.8)",
          border: "1px solid #334155",
          borderRadius: "8px",
          padding: "24px",
          marginBottom: "24px"
        }}>
          <h2 style={{ marginBottom: "16px" }}>2. ทดสอบ Canva พร้อม FlipHTML5 Links</h2>
          <p style={{ opacity: 0.8, marginBottom: "16px" }}>
            เปิดหน้า Canva ปกติ และเมื่อคลิก link ไป FlipHTML5 จะเปิดใน modal อัตโนมัติ
          </p>
          
          <button
            onClick={handleTestWithCanva}
            style={{
              background: "#22c55e",
              border: "none",
              color: "white",
              padding: "10px 20px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold"
            }}
          >
            📚 เปิดหน้า Canva (พร้อมรองรับ FlipHTML5 links)
          </button>
        </div>

        {/* คำอธิบายการทำงาน */}
        <div style={{
          background: "rgba(30, 41, 59, 0.5)",
          border: "1px solid #334155",
          borderRadius: "8px",
          padding: "20px",
        }}>
          <h3 style={{ marginBottom: "12px" }}>📖 วิธีการทำงาน:</h3>
          <ul style={{ paddingLeft: "24px", lineHeight: "1.8" }}>
            <li>เมื่อระบบตรวจพบ FlipHTML5 URL จะเปิดใน modal อัตโนมัติ</li>
            <li>ใช้ SafeIframe เพื่อจัดการ content และ navigation</li>
            <li>รองรับการคลิก links ภายใน FlipHTML5</li>
            <li>มี watermark แสดงชื่อผู้ใช้</li>
            <li>สามารถปิด modal เพื่อกลับไปหน้า Canva หลัก</li>
          </ul>
          
          <h3 style={{ marginTop: "20px", marginBottom: "12px" }}>🛠️ Domains ที่รองรับ:</h3>
          <ul style={{ paddingLeft: "24px" }}>
            <li>fliphtml5.com</li>
            <li>fliphtml5.net</li>
            <li>online.fliphtml5.com</li>
            <li>และ subdomains อื่นๆ ของ fliphtml5</li>
          </ul>
        </div>
        
        {/* ปุ่มกลับ */}
        <div style={{ marginTop: "32px", textAlign: "center" }}>
          <button
            onClick={() => router.push('/')}
            style={{
              background: "#64748b",
              border: "none",
              color: "white",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            ← กลับหน้าหลัก
          </button>
        </div>
      </div>
    </div>
  );
}
