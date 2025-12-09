import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

const ParticlesBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    let animationFrameId: number;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    class Particle {
      x: number;
      y: number;
      directionX: number;
      directionY: number;
      size: number;
      color: string;

      constructor() {
        this.x = Math.random() * (canvas?.width || 0);
        this.y = Math.random() * (canvas?.height || 0);
        this.directionX = (Math.random() * 2) - 1; // -1 to 1
        this.directionY = (Math.random() * 2) - 1;
        this.size = (Math.random() * 2) + 1;
        this.color = '#06b6d4';
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.fill();
      }

      update() {
        if (!canvas) return;
        if (this.x > canvas.width || this.x < 0) {
          this.directionX = -this.directionX;
        }
        if (this.y > canvas.height || this.y < 0) {
          this.directionY = -this.directionY;
        }

        this.x += this.directionX * 0.5;
        this.y += this.directionY * 0.5;
        this.draw();
      }
    }

    const init = () => {
      particles = [];
      const numberOfParticles = (canvas.width * canvas.height) / 15000;
      for (let i = 0; i < numberOfParticles; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
      }

      connect();
      animationFrameId = requestAnimationFrame(animate);
    };

    const connect = () => {
      if (!ctx || !canvas) return;
      let opacityValue = 1;
      for (let a = 0; a < particles.length; a++) {
        for (let b = a; b < particles.length; b++) {
          let distance = ((particles[a].x - particles[b].x) * (particles[a].x - particles[b].x))
            + ((particles[a].y - particles[b].y) * (particles[a].y - particles[b].y));

          if (distance < (canvas.width / 7) * (canvas.height / 7)) {
            opacityValue = 1 - (distance / 20000);
            ctx.strokeStyle = 'rgba(6, 182, 212,' + opacityValue + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.stroke();
          }
        }
      }
    };

    init();
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none'
      }}
    />
  );
};

export default function LoginPage() {
  const router = useRouter();
  const [idCard, setIdCard] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // ตรวจสอบรหัสพนักงาน (รองรับตัวเลขและตัวอักษร)
      if (idCard.length < 1) {
        setError('กรุณากรอกรหัสพนักงาน');
        setLoading(false);
        return;
      }

      let userData = null;
      let userSource = '';

      // 1. ตรวจสอบใน user_ebook ก่อน
      const { data: ebookUser, error: ebookError } = await supabase
        .from('user_ebook')
        .select('*')
        .eq('id_card', idCard)
        .eq('is_active', true)
        .single();

      if (ebookUser && !ebookError) {
        // ตรวจสอบรหัสผ่าน user_ebook
        if (password === ebookUser.password) {
          userData = {
            id_card: ebookUser.id_card,
            full_name: ebookUser.full_name
          };
          userSource = 'user_ebook';
        } else {
          setError('รหัสผ่านไม่ถูกต้อง');
          setLoading(false);
          return;
        }
      }

      // 2. ถ้าไม่พบใน user_ebook ให้ตรวจสอบใน technicians
      if (!userData) {
        const { data: techUser, error: techError } = await supabase
          .from('technicians')
          .select('tech_id, full_name, national_id')
          .eq('tech_id', idCard)
          .single();

        if (techUser && !techError) {
          // ใช้ 8 หลักสุดท้ายของ national_id เป็นรหัสผ่าน
          const last8Digits = techUser.national_id ? techUser.national_id.slice(-8) : '';
          
          if (password === last8Digits) {
            userData = {
              id_card: techUser.tech_id,
              full_name: techUser.full_name
            };
            userSource = 'technicians';
          } else {
            setError('รหัสผ่านไม่ถูกต้อง');
            setLoading(false);
            return;
          }
        }
      }

      // ถ้าไม่พบในทั้ง 2 ตาราง
      if (!userData) {
        setError('รหัสพนักงานไม่ถูกต้อง หรือบัญชีถูกปิดใช้งาน');
        setLoading(false);
        return;
      }

      // อัพเดตเวลาการเข้าใช้งานล่าสุด (เฉพาะ user_ebook)
      if (userSource === 'user_ebook') {
        await supabase
          .from('user_ebook')
          .update({ last_login: new Date().toISOString() })
          .eq('id_card', userData.id_card);
      }

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
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;600&display=swap');
        
        body {
          margin: 0;
          font-family: 'Prompt', sans-serif;
          background-color: #0f172a;
          overflow-x: hidden;
        }

        .login-container {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%);
          position: relative;
          padding: 20px;
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          background: rgba(30, 41, 59, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          z-index: 1;
          animation: slideUp 0.5s ease-out;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .login-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .login-logo {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #06b6d4, #3b82f6);
          border-radius: 16px;
          margin: 0 auto 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(6, 182, 212, 0.3);
        }

        .login-title {
          font-size: 24px;
          font-weight: 600;
          color: #fff;
          margin: 0;
          background: linear-gradient(to right, #fff, #94a3b8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .login-subtitle {
          color: #94a3b8;
          font-size: 14px;
          margin-top: 8px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          color: #cbd5e1;
          font-size: 14px;
          margin-bottom: 8px;
          font-weight: 400;
        }

        .form-input {
          width: 100%;
          padding: 12px 16px;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 10px;
          color: #fff;
          font-size: 16px;
          transition: all 0.2s;
          outline: none;
          font-family: 'Prompt', sans-serif;
        }

        .form-input:focus {
          border-color: #06b6d4;
          box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1);
          background: rgba(15, 23, 42, 0.8);
        }

        .form-input::placeholder {
          color: #475569;
        }

        .login-button {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #06b6d4, #3b82f6);
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 12px;
          font-family: 'Prompt', sans-serif;
          position: relative;
          overflow: hidden;
        }

        .login-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 20px -5px rgba(6, 182, 212, 0.4);
        }

        .login-button:active {
          transform: translateY(0);
        }

        .login-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .error-message {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Responsive adjustments */
        @media (max-width: 480px) {
          .login-card {
            padding: 24px;
            border-radius: 16px;
          }
          
          .login-title {
            font-size: 20px;
          }
        }
      `}</style>

      <div className="login-container">
        <ParticlesBackground />

        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
              </svg>
            </div>
            <h1 className="login-title">E-book online by W&W</h1>
            <p className="login-subtitle">Technician Training Portal</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">รหัสพนักงาน</label>
              <input
                type="text"
                className="form-input"
                value={idCard}
                onChange={(e) => setIdCard(e.target.value)}
                placeholder="กรอกรหัสพนักงาน"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">รหัสผ่าน</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่าน"
                  required
                  style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="error-message">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {error}
              </div>
            )}

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                  </svg>
                  กำลังเข้าสู่ระบบ...
                </span>
              ) : "เข้าสู่ระบบ"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
