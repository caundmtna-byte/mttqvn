-- Đơn vị hỗ trợ: mở rộng loại — Chùa, Giáo xứ, Cơ quan, Đơn vị, Cá nhân
-- (thay `to_chuc` / `ca_nhan` cũ)
--
-- Thứ tự bắt buộc: DROP CHECK trước, rồi mới UPDATE sang giá trị mới.

ALTER TABLE public.kho_don_vi_cuu_tro
  DROP CONSTRAINT IF EXISTS kho_don_vi_cuu_tro_loai_chk;

UPDATE public.kho_don_vi_cuu_tro
SET loai = 'don_vi'
WHERE loai = 'to_chuc';

ALTER TABLE public.kho_don_vi_cuu_tro
  ALTER COLUMN loai SET DEFAULT 'don_vi';

ALTER TABLE public.kho_don_vi_cuu_tro
  ADD CONSTRAINT kho_don_vi_cuu_tro_loai_chk
  CHECK (loai IN ('chua', 'giao_xu', 'co_quan', 'don_vi', 'ca_nhan'));

NOTIFY pgrst, 'reload schema';
