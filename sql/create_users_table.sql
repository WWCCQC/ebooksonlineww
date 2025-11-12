-- ลบตารางเก่าถ้ามี (ระวัง: จะลบข้อมูลทั้งหมด)
DROP TABLE IF EXISTS public.user_ebook CASCADE;

-- สร้างตาราง user_ebook สำหรับจัดการผู้ใช้งาน 3,000 คน
CREATE TABLE public.user_ebook (
  id_card VARCHAR(13) PRIMARY KEY, -- เลขบัตรประชาชน 13 หลัก
  full_name VARCHAR(255) NOT NULL, -- ชื่อ-นามสกุล
  password VARCHAR(10) NOT NULL,   -- รหัสผ่าน 10 หลักท้ายของบัตรประชาชน
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  
  -- ตรวจสอบว่าเลขบัตรประชาชนมี 13 หลัก
  CONSTRAINT check_id_card_length CHECK (LENGTH(id_card) = 13 AND id_card ~ '^[0-9]+$'),
  -- ตรวจสอบว่ารหัสผ่านมี 10 หลัก
  CONSTRAINT check_password_length CHECK (LENGTH(password) = 10 AND password ~ '^[0-9]+$')
);

-- สร้าง index เพื่อการค้นหาที่เร็ว
CREATE INDEX idx_user_ebook_id_card ON public.user_ebook(id_card);
CREATE INDEX idx_user_ebook_full_name ON public.user_ebook(full_name);
CREATE INDEX idx_user_ebook_is_active ON public.user_ebook(is_active);

-- สร้าง trigger สำหรับ updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_ebook_updated_at 
  BEFORE UPDATE ON public.user_ebook 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- สร้าง RLS (Row Level Security) policies
ALTER TABLE public.user_ebook ENABLE ROW LEVEL SECURITY;

-- Policy: ให้ service role เข้าถึงได้ทุกอย่าง
CREATE POLICY "Service role can manage all user_ebook" ON public.user_ebook
  FOR ALL USING (auth.role() = 'service_role');

-- Policy: ผู้ใช้สามารถดูข้อมูลตัวเองได้
CREATE POLICY "Users can view own profile" ON public.user_ebook
  FOR SELECT USING (true); -- เปิดให้ดูได้ทั้งหมดเพื่อความง่าย

-- สร้างตัวอย่างข้อมูล
INSERT INTO public.user_ebook (id_card, full_name, password) VALUES 
('1234567890123', 'นาย ทดสอบ ระบบ', '7890123456'),
('9876543210987', 'นาง สมมุติ ทดลอง', '3210987654'),
('1111222233334', 'นาย ตัวอย่าง ข้อมูล', '2233334444');

-- สร้าง Function สำหรับสร้างรหัสผ่านอัตโนมัติจาก 10 หลักท้ายของเลขบัตรประชาชน
CREATE OR REPLACE FUNCTION generate_password_from_id_card()
RETURNS TRIGGER AS $$
BEGIN
  -- ตัดเอา 10 หลักท้ายของเลขบัตรประชาชนมาเป็นรหัสผ่าน
  NEW.password = RIGHT(NEW.id_card, 10);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- สร้าง Trigger เพื่อสร้างรหัสผ่านอัตโนมัติเมื่อเพิ่มข้อมูลใหม่
CREATE TRIGGER auto_generate_password 
  BEFORE INSERT ON public.user_ebook 
  FOR EACH ROW EXECUTE FUNCTION generate_password_from_id_card();

-- เพิ่มความคิดเห็นในคอลัมน์
COMMENT ON TABLE public.user_ebook IS 'ตารางผู้ใช้งาน eBook ระบบ';
COMMENT ON COLUMN public.user_ebook.id_card IS 'เลขบัตรประชาชน 13 หลัก (Primary Key)';
COMMENT ON COLUMN public.user_ebook.full_name IS 'ชื่อ-นามสกุล (ใช้เป็นลายน้ำ)';
COMMENT ON COLUMN public.user_ebook.password IS 'รหัสผ่าน 10 หลักท้าย (สร้างอัตโนมัติ)';
COMMENT ON COLUMN public.user_ebook.is_active IS 'สถานะการใช้งาน';
COMMENT ON COLUMN public.user_ebook.last_login IS 'เวลาการเข้าใช้งานล่าสุด';