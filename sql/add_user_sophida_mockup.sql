-- เพิ่ม user mockup: โสภิดา มลพิชัย
-- เลขบัตร: 01025343 (8 หลัก - mockup)
-- รหัสผ่าน: 01025343

-- หมายเหตุ: สำหรับ mockup ต้องปรับ constraint ในตารางก่อน
-- เพราะ default ต้องการ 13 หลัก

-- Option 1: ปรับ constraint ให้รองรับ mockup data
ALTER TABLE public.user_ebook DROP CONSTRAINT IF EXISTS check_id_card_length;
ALTER TABLE public.user_ebook DROP CONSTRAINT IF EXISTS check_password_length;

-- เพิ่ม constraint ใหม่ที่ยืดหยุ่นกว่า
ALTER TABLE public.user_ebook 
ADD CONSTRAINT check_id_card_format CHECK (id_card ~ '^[0-9]+$');

ALTER TABLE public.user_ebook 
ADD CONSTRAINT check_password_format CHECK (password ~ '^[0-9]+$');

-- เพิ่ม user mockup
INSERT INTO public.user_ebook (id_card, full_name, password, is_active) 
VALUES ('01025343', 'โสภิดา มลพิชัย', '01025343', true)
ON CONFLICT (id_card) 
DO UPDATE SET 
  full_name = EXCLUDED.full_name,
  password = EXCLUDED.password,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ตรวจสอบ
SELECT id_card, full_name, is_active, created_at 
FROM public.user_ebook 
WHERE id_card = '01025343';

