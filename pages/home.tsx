import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function HomePage() {
  const router = useRouter();
  const [fullName, setFullName] = useState<string>("");

  useEffect(() => {
    // ตรวจสอบว่า user ได้ login หรือไม่
    const userDataStr = localStorage.getItem('user_data');
    if (!userDataStr) {
      router.push("/login");
      return;
    }

    const userData = JSON.parse(userDataStr);
    setFullName(userData.full_name);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('user_data');
    localStorage.removeItem('canva_token');
    router.push('/login');
  };

  const handleHomepage = () => {
    // ไปหน้าแรก - Canva Design URL
    const targetUrl = 'https://www.canva.com/design/DAG3_k1T9QM/IduYl9hTy3l4PhxslXTJ5w/view?embed';
    console.log('🏠 Home: Setting target_url:', targetUrl);
    localStorage.setItem('target_url', targetUrl);
    router.push('/ebook-viewer');
  };

  const handleEbook = () => {
    // ไปหน้า E-Book - Canva Design URL (ใส่ Design ID ของ E-Book)
    const targetUrl = 'https://www.canva.com/design/DAG3_k1T9QM/IduYl9hTy3l4PhxslXTJ5w/view?embed';
    console.log('📖 E-Book: Setting target_url:', targetUrl);
    localStorage.setItem('target_url', targetUrl);
    router.push('/ebook-viewer');
  };

  const handleSOP = () => {
    // ไปหน้า SOP - Canva Design URL (แทนที่ด้วย Design ID ของ SOP)
    const targetUrl = 'https://www.canva.com/design/ANOTHER_CANVA_ID/view?embed';
    console.log('📋 SOP: Setting target_url:', targetUrl);
    localStorage.setItem('target_url', targetUrl);
    router.push('/ebook-viewer');
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        color: "#ffffff",
        fontFamily: "Arial, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background decoration */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
                        radial-gradient(circle at 80% 80%, rgba(34, 197, 94, 0.1) 0%, transparent 50%)`,
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          background: "rgba(15, 23, 42, 0.95)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(71, 85, 105, 0.3)",
          padding: "16px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "bold" }}>
            📚 eBook Online
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
          <span style={{ fontSize: "14px", opacity: 0.8 }}>
            ยินดีต้อนรับ: <strong>{fullName}</strong>
          </span>
          <button
            onClick={handleLogout}
            style={{
              background: "#ef4444",
              border: "none",
              color: "white",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
              transition: "all 0.3s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#dc2626")}
            onMouseOut={(e) => (e.currentTarget.style.background = "#ef4444")}
          >
            🚪 ออกจากระบบ
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          paddingTop: "100px",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Logo/Title Section */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "60px",
            animation: "slideDown 0.6s ease-out",
          }}
        >
          <h2
            style={{
              fontSize: "64px",
              fontWeight: "bold",
              margin: "0 0 16px 0",
              background: "linear-gradient(135deg, #3b82f6 0%, #22c55e 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            EBOOK
          </h2>
          <p
            style={{
              fontSize: "32px",
              fontStyle: "italic",
              margin: 0,
              color: "#64b5f6",
            }}
          >
            Online
          </p>
          <p
            style={{
              fontSize: "14px",
              opacity: 0.7,
              marginTop: "12px",
              maxWidth: "500px",
            }}
          >
            ระบบจัดการ eBook ออนไลน์ สำหรับการเข้าถึงเอกสารอย่างปลอดภัย
          </p>
        </div>

        {/* Menu Buttons */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "24px",
            maxWidth: "800px",
            width: "100%",
            padding: "0 32px",
          }}
        >
          {/* ปุ่มหน้าแรก */}
          <MenuButton
            title="🏠 หน้าแรก"
            description="กลับไปหน้าแรก"
            onClick={handleHomepage}
            color="#22c55e"
            icon="🏠"
          />

          {/* ปุ่ม E-Book */}
          <MenuButton
            title="� E-Book"
            description="เข้าสู่ห้องสมุด eBook"
            onClick={handleEbook}
            color="#3b82f6"
            icon="�"
          />

          {/* ปุ่ม SOP */}
          <MenuButton
            title="� SOP"
            description="ขั้นตอนการใช้งาน"
            onClick={handleSOP}
            color="#8b5cf6"
            icon="�"
          />
        </div>

        {/* Footer Info */}
        <div
          style={{
            marginTop: "80px",
            textAlign: "center",
            fontSize: "12px",
            opacity: 0.6,
            maxWidth: "600px",
            lineHeight: "1.6",
          }}
        >
          <p>
            ⚠️ เอกสารทั้งหมดได้รับการป้องกัน หากมีปัญหา โปรดติดต่อแอดมิน
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

interface MenuButtonProps {
  title: string;
  description: string;
  onClick: () => void;
  color: string;
  icon: string;
}

function MenuButton({
  title,
  description,
  onClick,
  color,
  icon,
}: MenuButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: "rgba(30, 41, 59, 0.8)",
        border: `2px solid ${color}`,
        borderRadius: "12px",
        padding: "32px 24px",
        cursor: "pointer",
        color: "white",
        textAlign: "center",
        transition: "all 0.3s ease",
        transform: isHovered ? "translateY(-8px)" : "translateY(0)",
        boxShadow: isHovered
          ? `0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 0 30px ${color}40`
          : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div style={{ fontSize: "48px", marginBottom: "12px" }}>{icon}</div>
      <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "bold" }}>
        {title}
      </h3>
      <p
        style={{
          margin: 0,
          fontSize: "13px",
          opacity: 0.7,
          lineHeight: "1.4",
        }}
      >
        {description}
      </p>
    </button>
  );
}
