-- สร้างตาราง user_permissions เพื่อจัดการสิทธิ์การเข้าถึง eBook
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id BIGSERIAL PRIMARY KEY,
  id_card VARCHAR(13) NOT NULL,
  permission_name VARCHAR(100) NOT NULL,
  is_granted BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- สร้าง Foreign Key ไปยัง user_ebook
  CONSTRAINT fk_user_permissions_id_card FOREIGN KEY (id_card) 
    REFERENCES public.user_ebook(id_card) ON DELETE CASCADE,
  
  -- ทำให้ไม่มี duplicate permission สำหรับ user คนเดียว
  CONSTRAINT uq_user_permission UNIQUE(id_card, permission_name)
);

-- สร้าง index
CREATE INDEX IF NOT EXISTS idx_user_permissions_id_card ON public.user_permissions(id_card);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_name ON public.user_permissions(permission_name);
CREATE INDEX IF NOT EXISTS idx_user_permissions_is_granted ON public.user_permissions(is_granted);

-- สร้าง trigger สำหรับ updated_at (ใช้ function เดิมจาก user_ebook)
DROP TRIGGER IF EXISTS update_user_permissions_updated_at ON public.user_permissions;

CREATE TRIGGER update_user_permissions_updated_at 
  BEFORE UPDATE ON public.user_permissions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- สร้าง RLS policies
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: ให้ service role เข้าถึงได้ทั้งหมด
CREATE POLICY "Service role can manage all permissions" ON public.user_permissions
  FOR ALL USING (auth.role() = 'service_role');

-- Policy: ให้ anonymous users ดูได้ (สำหรับ API verify)
CREATE POLICY "Anyone can view permissions" ON public.user_permissions
  FOR SELECT USING (true);

-- Policy: ให้ authenticated users อัปเดตของตัวเองได้ (optional)
CREATE POLICY "Users can view own permissions" ON public.user_permissions
  FOR SELECT USING (id_card = (SELECT id_card FROM public.user_ebook LIMIT 1));

-- เพิ่มตัวอย่างข้อมูล permissions
-- INSERT INTO public.user_permissions (id_card, permission_name, is_granted) 
-- VALUES 
--   ('1234567890123', 'view_ebook', true),
--   ('1234567890123', 'download_ebook', true),
--   ('1234567890123', 'print', false),
--   ('1234567890123', 'share', false),
--   ('9876543210987', 'view_ebook', true),
--   ('9876543210987', 'download_ebook', false),
--   ('9876543210987', 'print', false),
--   ('9876543210987', 'share', false);

-- เพิ่มความคิดเห็นในตาราง
COMMENT ON TABLE public.user_permissions IS 'จัดการสิทธิ์การเข้าถึง eBook ของผู้ใช้';
COMMENT ON COLUMN public.user_permissions.id_card IS 'เลขบัตรประชาชนของผู้ใช้';
COMMENT ON COLUMN public.user_permissions.permission_name IS 'ชื่อสิทธิ์ (เช่น view_ebook, download_ebook, print, share)';
COMMENT ON COLUMN public.user_permissions.is_granted IS 'สถานะสิทธิ์ว่าได้รับหรือไม่';
COMMENT ON COLUMN public.user_permissions.created_at IS 'เวลาที่สร้าง';
COMMENT ON COLUMN public.user_permissions.updated_at IS 'เวลาที่อัปเดตล่าสุด';
