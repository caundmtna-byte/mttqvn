-- ============================================================
-- Di chuyển cap_quan_ly từ var_chuc_vu → var_nhan_vien + mttq_can_bo
-- Thứ tự: ADD → BACKFILL → DROP  (không được đảo ngược)
-- ============================================================

-- ============================================================
-- BƯỚC 1: Thêm cột mới (DEFAULT '{}' để không lỗi NOT NULL)
-- ============================================================

ALTER TABLE public.var_nhan_vien
  ADD COLUMN IF NOT EXISTS cap_quan_ly TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.var_nhan_vien
  ADD CONSTRAINT var_nhan_vien_cap_quan_ly_check
  CHECK (cap_quan_ly <@ ARRAY['Tỉnh', 'Xã phường']::TEXT[]);

ALTER TABLE public.mttq_can_bo
  ADD COLUMN IF NOT EXISTS cap_quan_ly TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.mttq_can_bo
  ADD CONSTRAINT mttq_can_bo_cap_quan_ly_check
  CHECK (cap_quan_ly <@ ARRAY['Tỉnh', 'Xã phường']::TEXT[]);

-- ============================================================
-- BƯỚC 2: Backfill — copy cap_quan_ly từ var_chuc_vu
--          (phải chạy TRƯỚC khi drop column)
-- ============================================================

-- Nhân viên: join qua id_chuc_vu → var_chuc_vu.cap_quan_ly
UPDATE public.var_nhan_vien nv
SET cap_quan_ly = CASE
  WHEN cv.cap_quan_ly IS NOT NULL AND cv.cap_quan_ly <> ''
    THEN ARRAY[cv.cap_quan_ly]::TEXT[]
  ELSE '{}'::TEXT[]
END
FROM public.var_chuc_vu cv
WHERE nv.id_chuc_vu = cv.id;

-- Cán bộ MTTQ: join qua chuc_vu_id → var_chuc_vu.cap_quan_ly
UPDATE public.mttq_can_bo cb
SET cap_quan_ly = CASE
  WHEN cv.cap_quan_ly IS NOT NULL AND cv.cap_quan_ly <> ''
    THEN ARRAY[cv.cap_quan_ly]::TEXT[]
  ELSE '{}'::TEXT[]
END
FROM public.var_chuc_vu cv
WHERE cb.chuc_vu_id = cv.id;

-- ============================================================
-- BƯỚC 3: Xoá cap_quan_ly khỏi var_chuc_vu
-- ============================================================

ALTER TABLE public.var_chuc_vu
  DROP CONSTRAINT IF EXISTS var_chuc_vu_cap_quan_ly_check;

ALTER TABLE public.var_chuc_vu
  DROP COLUMN IF EXISTS cap_quan_ly;
