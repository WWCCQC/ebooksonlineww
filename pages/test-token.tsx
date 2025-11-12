import { useState } from "react";

export default function TestPage() {
  const [token, setToken] = useState("");
  const [userId, setUserId] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleVerifyToken = async () => {
    if (!token || !userId) {
      alert("กรุณากรอก token และ user ID");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/verify-canva-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, user_id: userId }),
      });

      const data = await response.json();
      setResult(data);
      console.log("Response:", data);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTestToken = () => {
    // สร้าง token ตัวอย่าง
    const testToken = btoa(unescape(encodeURIComponent(JSON.stringify({
      id_card: "1234567890123",
      full_name: "นาย ทดสอบ ระบบ",
      timestamp: Date.now(),
    }))));
    setToken(testToken);
    setUserId("1234567890123");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#020617", color: "white", padding: 32 }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <h1>🧪 Test Token Verification</h1>

        <div style={{ background: "#1e293b", padding: 24, borderRadius: 12, marginTop: 24 }}>
          <h3>สร้าง Token ตัวอย่าง</h3>
          <button
            onClick={handleGenerateTestToken}
            style={{
              background: "#22c55e",
              border: "none",
              color: "white",
              padding: "10px 16px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Generate Test Token
          </button>
        </div>

        <div style={{ background: "#1e293b", padding: 24, borderRadius: 12, marginTop: 24 }}>
          <h3>Token</h3>
          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            style={{
              width: "100%",
              minHeight: 100,
              padding: 12,
              borderRadius: 6,
              border: "1px solid #334155",
              background: "#0f172a",
              color: "white",
              fontFamily: "monospace",
              fontSize: 12,
            }}
            placeholder="เด็กเบสส 64 token ที่นี่"
          />
        </div>

        <div style={{ background: "#1e293b", padding: 24, borderRadius: 12, marginTop: 24 }}>
          <h3>User ID</h3>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 6,
              border: "1px solid #334155",
              background: "#0f172a",
              color: "white",
            }}
            placeholder="เลขบัตรประชาชน (13 หลัก)"
          />
        </div>

        <button
          onClick={handleVerifyToken}
          disabled={loading}
          style={{
            width: "100%",
            marginTop: 24,
            background: "#3b82f6",
            border: "none",
            color: "white",
            padding: "12px 16px",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 16,
            fontWeight: "bold",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "กำลัง Verify..." : "Verify Token"}
        </button>

        {result && (
          <div style={{ background: "#1e293b", padding: 24, borderRadius: 12, marginTop: 24 }}>
            <h3>ผลลัพธ์:</h3>
            <pre
              style={{
                background: "#0f172a",
                padding: 16,
                borderRadius: 6,
                overflow: "auto",
                fontSize: 12,
              }}
            >
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
