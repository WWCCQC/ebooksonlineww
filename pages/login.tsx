import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [idCard, setIdCard] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // ตรวจสอบเลขบัตรประชาชน (รองรับ mockup data ที่สั้นกว่า 13 หลัก)
      if (idCard.length < 1 || !/^\d+$/.test(idCard)) {
        setError('กรุณากรอกเลขบัตรประชาชน (ตัวเลขเท่านั้น)');
        setLoading(false);
        return;
      }

      // Mockup users (สำหรับทดสอบ - ไม่ต้องใช้ database)
      const mockupUsers = [
        { id_card: '1234567890123', full_name: 'นาย ทดสอบ ระบบ', password: '7890123456' },
        { id_card: '9876543210987', full_name: 'นาง สมมุติ ทดลอง', password: '3210987654' },
        { id_card: '1111222233334', full_name: 'นาย ตัวอย่าง ทดสอบ', password: '2233334444' },
        { id_card: '5555666677778', full_name: 'นาง ทดลอง ระบบ', password: '6677778888' },
        { id_card: '9999888877776', full_name: 'นาย สาธิต โปรแกรม', password: '8877776666' },
        { id_card: '01025343', full_name: 'โสภิดา มลพิชัย', password: '01025343' }
      ];

      // ตรวจสอบใน mockup users ก่อน
      const mockupUser = mockupUsers.find(u => u.id_card === idCard);
      
      if (mockupUser) {
        // ตรวจสอบรหัสผ่าน
        if (password !== mockupUser.password) {
          setError('รหัสผ่านไม่ถูกต้อง');
          setLoading(false);
          return;
        }

        // เก็บข้อมูลผู้ใช้ใน localStorage
        localStorage.setItem('user_data', JSON.stringify({
          id_card: mockupUser.id_card,
          full_name: mockupUser.full_name,
          watermark_text: mockupUser.full_name
        }));

        router.push("/ebook-viewer");
        return;
      }

      // ถ้าไม่พบใน mockup users ให้ลองเช็คใน database
      const { data: userData, error: userError } = await supabase
        .from('user_ebook')
        .select('*')
        .eq('id_card', idCard)
        .eq('is_active', true)
        .single();

      if (userError || !userData) {
        setError('เลขบัตรประชาชนไม่ถูกต้อง หรือบัญชีถูกปิดใช้งาน');
        setLoading(false);
        return;
      }

      // ตรวจสอบรหัสผ่าน
      if (password !== userData.password) {
        setError('รหัสผ่านไม่ถูกต้อง');
        setLoading(false);
        return;
      }

      // อัพเดตเวลาการเข้าใช้งานล่าสุด
      await supabase
        .from('user_ebook')
        .update({ last_login: new Date().toISOString() })
        .eq('id_card', userData.id_card);

      // เก็บข้อมูลผู้ใช้ใน localStorage
      localStorage.setItem('user_data', JSON.stringify({
        id_card: userData.id_card,
        full_name: userData.full_name,
        watermark_text: userData.full_name
      }));

      router.push("/ebook-viewer");
    } catch (error: any) {
      setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{minHeight:"100vh",display:"flex",justifyContent:"center",alignItems:"center",background:"#0f172a",color:"white"}}>
      <div style={{width:350,padding:24,background:"#1e293b",borderRadius:12}}>
        <h2>เข้าสู่ระบบ eBook</h2>
        <form onSubmit={handleLogin}>
          <div style={{marginTop:8}}>
            <label>เลขบัตรประชาชน</label>
            <input 
              type="text" 
              value={idCard} 
              onChange={(e)=>setIdCard(e.target.value.replace(/\D/g, ''))} 
              placeholder="01025343"
              required 
              style={{width:"100%",padding:8,borderRadius:6,border:"1px solid #ccc"}}
            />
          </div>
          <div style={{marginTop:8}}>
            <label>รหัسผ่าน (10 หลักท้ายของบัตรประชาชน)</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e)=>setPassword(e.target.value.replace(/\D/g, '').slice(0, 10))} 
              placeholder="7890123456"
              required 
              maxLength={10}
              style={{width:"100%",padding:8,borderRadius:6,border:"1px solid #ccc"}}
            />
          </div>
          {error && <p style={{color:"#f87171"}}>{error}</p>}
          <button type="submit" style={{marginTop:16,width:"100%",background:"#22c55e",border:"none",borderRadius:6,padding:10,color:"white",cursor:"pointer"}}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </div>
  );
}
