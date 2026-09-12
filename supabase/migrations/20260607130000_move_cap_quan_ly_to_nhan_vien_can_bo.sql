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
  DROP CONSTRAINT IF EXISTS var_nhan_vien_cap_quan_ly_check;

ALTER TABLE public.var_nhan_vien
  ADD CONSTRAINT var_nhan_vien_cap_quan_ly_check
  CHECK (cap_quan_ly <@ ARRAY['Tỉnh', 'Xã phường']::TEXT[]);

ALTER TABLE public.mttq_can_bo
  ADD COLUMN IF NOT EXISTS cap_quan_ly TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.mttq_can_bo
  DROP CONSTRAINT IF EXISTS mttq_can_bo_cap_quan_ly_check;

ALTER TABLE public.mttq_can_bo
  ADD CONSTRAINT mttq_can_bo_cap_quan_ly_check
  CHECK (cap_quan_ly <@ ARRAY['Tỉnh', 'Xã phường']::TEXT[]);

-- ============================================================
-- BƯỚC 2: Backfill — copy cap_quan_ly từ var_chuc_vu
--          (phải chạy TRƯỚC khi drop column)
--
-- Bọc trong DO + kiểm tra cột nguồn còn tồn tại: BƯỚC 3 ngay bên dưới xoá
-- var_chuc_vu.cap_quan_ly, nên lần chạy thứ hai hai câu UPDATE này tham chiếu
-- một cột không còn ⇒ lỗi "column cv.cap_quan_ly does not exist".
-- Lần chạy ĐẦU không đổi: cột còn ⇒ backfill chạy y hệt.
-- (Cùng khuôn với 20260611120000 và 20260607150000.)
-- ============================================================

DO $backfill_cap_quan_ly$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'var_chuc_vu'
      AND column_name = 'cap_quan_ly'
  ) THEN
    RETURN;
  END IF;

  -- Nhân viên: join qua id_chuc_vu → var_chuc_vu.cap_quan_ly
  EXECUTE $q$
    UPDATE public.var_nhan_vien nv
    SET cap_quan_ly = CASE
      WHEN cv.cap_quan_ly IS NOT NULL AND cv.cap_quan_ly <> ''
        THEN ARRAY[cv.cap_quan_ly]::TEXT[]
      ELSE '{}'::TEXT[]
    END
    FROM public.var_chuc_vu cv
    WHERE nv.id_chuc_vu = cv.id
  $q$;

  -- Cán bộ MTTQ: join qua chuc_vu_id → var_chuc_vu.cap_quan_ly
  EXECUTE $q$
    UPDATE public.mttq_can_bo cb
    SET cap_quan_ly = CASE
      WHEN cv.cap_quan_ly IS NOT NULL AND cv.cap_quan_ly <> ''
        THEN ARRAY[cv.cap_quan_ly]::TEXT[]
      ELSE '{}'::TEXT[]
    END
    FROM public.var_chuc_vu cv
    WHERE cb.chuc_vu_id = cv.id
  $q$;
END $backfill_cap_quan_ly$;

-- ============================================================
-- BƯỚC 3: Xoá cap_quan_ly khỏi var_chuc_vu
-- ============================================================

ALTER TABLE public.var_chuc_vu
  DROP CONSTRAINT IF EXISTS var_chuc_vu_cap_quan_ly_check;

ALTER TABLE public.var_chuc_vu
  DROP COLUMN IF EXISTS cap_quan_ly;
