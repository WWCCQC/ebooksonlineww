-- เพิ่ม user ใหม่: โสภิดา มลพิชัย
-- เลขบัตรประชาชน: 0000001025343 (13 หลัก)
-- รหัสผ่าน: 0001025343 (10 หลักท้าย - สร้างอัตโนมัติ)

INSERT INTO public.user_ebook (id_card, full_name, password, is_active) 
VALUES ('0000001025343', 'โสภิดา มลพิชัย', '0001025343', true)
ON CONFLICT (id_card) 
DO UPDATE SET 
  full_name = EXCLUDED.full_name,
  password = EXCLUDED.password,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ตรวจสอบว่าเพิ่มสำเร็จ
SELECT id_card, full_name, is_active, created_at 
FROM public.user_ebook 
WHERE id_card = '0000001025343';

