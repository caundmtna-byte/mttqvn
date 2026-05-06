-- Bỏ cột URL / mã định danh khỏi thiết lập khác (trang đăng, nguồn đăng).
ALTER TABLE public.bai_viet_thiet_lap_khac
  DROP COLUMN IF EXISTS gia_tri;
