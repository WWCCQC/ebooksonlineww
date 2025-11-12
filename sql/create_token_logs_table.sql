-- สร้างตาราง token_logs เพื่อบันทึกการใช้ token สำหรับ Canva
CREATE TABLE IF NOT EXISTS public.token_logs (
  id BIGSERIAL PRIMARY KEY,
  id_card VARCHAR(13) NOT NULL,
  token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_at TIMESTAMP WITH TIME ZONE,
  is_valid BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- สร้าง Foreign Key ไปยัง user_ebook
  CONSTRAINT fk_token_logs_id_card FOREIGN KEY (id_card) 
    REFERENCES public.user_ebook(id_card) ON DELETE CASCADE
);

-- สร้าง index เพื่อการค้นหาที่เร็ว
CREATE INDEX IF NOT EXISTS idx_token_logs_id_card ON public.token_logs(id_card);
CREATE INDEX IF NOT EXISTS idx_token_logs_created_at ON public.token_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_token_logs_expires_at ON public.token_logs(expires_at);
CREATE INDEX IF NOT EXISTS idx_token_logs_is_valid ON public.token_logs(is_valid);

-- สร้าง RLS (Row Level Security) policies
ALTER TABLE public.token_logs ENABLE ROW LEVEL SECURITY;

-- Policy: ให้ service role เข้าถึงได้ทั้งหมด
CREATE POLICY "Service role can manage all token_logs" ON public.token_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Policy: ให้ anonymous users เพิ่มข้อมูลได้ (สำหรับบันทึก token)
CREATE POLICY "Anyone can insert token logs" ON public.token_logs
  FOR INSERT WITH CHECK (true);

-- เพิ่มความคิดเห็นในตาราง
COMMENT ON TABLE public.token_logs IS 'บันทึกการใช้ token สำหรับ Canva';
COMMENT ON COLUMN public.token_logs.id_card IS 'เลขบัตรประชาชนของผู้ใช้';
COMMENT ON COLUMN public.token_logs.token IS 'Token ที่สร้าง (Base64 encoded)';
COMMENT ON COLUMN public.token_logs.created_at IS 'เวลาที่สร้าง token';
COMMENT ON COLUMN public.token_logs.verified_at IS 'เวลาที่ verify token';
COMMENT ON COLUMN public.token_logs.is_valid IS 'สถานะ token ว่าใช้ได้หรือไม่';
COMMENT ON COLUMN public.token_logs.expires_at IS 'เวลา expiration ของ token';
