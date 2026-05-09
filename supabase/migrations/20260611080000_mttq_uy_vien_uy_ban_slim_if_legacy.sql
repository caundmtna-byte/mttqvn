-- ============================================================================
-- Thu gọn mttq_uy_vien_uy_ban: chỉ FK can_bo + cột riêng UB (idempotent).
-- Dùng khi DB vẫn còn schema cũ (ho_va_ten, ngay_sinh, …) + can_bo_id vì
-- migration 20260610230000 không chạy xong hoặc can_bo_id thêm tay.
-- Nếu bảng đã slim (không còn ho_va_ten), các bước backfill/DROP bị bỏ qua.
-- ============================================================================

ALTER TABLE public.mttq_uy_vien_uy_ban
  ADD COLUMN IF NOT EXISTS can_bo_id BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.mttq_uy_vien_uy_ban'::regclass
      AND conname = 'mttq_uy_vien_uy_ban_can_bo_id_fkey'
  ) THEN
    ALTER TABLE public.mttq_uy_vien_uy_ban
      ADD CONSTRAINT mttq_uy_vien_uy_ban_can_bo_id_fkey
      FOREIGN KEY (can_bo_id) REFERENCES public.mttq_can_bo (id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Backfill + DROP chỉ khi còn cột legacy ho_va_ten
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mttq_uy_vien_uy_ban'
      AND column_name = 'ho_va_ten'
  ) THEN
    RETURN;
  END IF;

  -- Gán can_bo theo họ tên + ngày sinh
  EXECUTE $q$
    WITH ranked AS (
      SELECT
        u.id AS uy_id,
        c.id AS cb_id,
        ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY c.id) AS rn
      FROM public.mttq_uy_vien_uy_ban u
      INNER JOIN public.mttq_can_bo c
        ON lower(trim(u.ho_va_ten)) = lower(trim(c.ho_ten))
       AND (
          (u.ngay_sinh IS NULL AND c.ngay_sinh IS NULL)
          OR (u.ngay_sinh IS NOT NULL AND c.ngay_sinh IS NOT NULL AND u.ngay_sinh = c.ngay_sinh)
        )
    )
    UPDATE public.mttq_uy_vien_uy_ban u
    SET can_bo_id = r.cb_id
    FROM ranked r
    WHERE u.id = r.uy_id AND r.rn = 1 AND u.can_bo_id IS NULL
  $q$;

  EXECUTE $q$
    WITH uniq_name AS (
      SELECT lower(trim(c.ho_ten)) AS hn, min(c.id) AS cb_id
      FROM public.mttq_can_bo c
      GROUP BY lower(trim(c.ho_ten))
      HAVING count(*) = 1
    )
    UPDATE public.mttq_uy_vien_uy_ban u
    SET can_bo_id = n.cb_id
    FROM uniq_name n
    WHERE u.can_bo_id IS NULL AND lower(trim(u.ho_va_ten)) = n.hn
  $q$;

  IF EXISTS (
    SELECT 1 FROM public.mttq_uy_vien_uy_ban WHERE can_bo_id IS NULL
  ) THEN
    RAISE EXCEPTION
      'mttq_uy_vien_uy_ban_slim: còn bản ghi can_bo_id NULL — bổ sung mttq_can_bo hoặc map tay rồi chạy lại.';
  END IF;

  ALTER TABLE public.mttq_uy_vien_uy_ban
    ALTER COLUMN can_bo_id SET NOT NULL;

  DROP INDEX IF EXISTS public.idx_mttq_uy_vien_uy_ban_ho_ten;

  CREATE UNIQUE INDEX IF NOT EXISTS uq_mttq_uy_vien_uy_ban_nhiem_ky_can_bo
    ON public.mttq_uy_vien_uy_ban (nhiem_ky_id, can_bo_id);

  CREATE INDEX IF NOT EXISTS idx_mttq_uy_vien_uy_ban_can_bo
    ON public.mttq_uy_vien_uy_ban (can_bo_id);

  ALTER TABLE public.mttq_uy_vien_uy_ban
    DROP COLUMN IF EXISTS ho_va_ten,
    DROP COLUMN IF EXISTS chuc_vu_don_vi,
    DROP COLUMN IF EXISTS ngay_sinh,
    DROP COLUMN IF EXISTS gioi_tinh,
    DROP COLUMN IF EXISTS dan_toc,
    DROP COLUMN IF EXISTS ton_giao,
    DROP COLUMN IF EXISTS dang_vien,
    DROP COLUMN IF EXISTS trinh_do_cm,
    DROP COLUMN IF EXISTS trinh_do_llct,
    DROP COLUMN IF EXISTS so_dien_thoai;
END $$;

-- Bảng đã slim từ trước: đảm bảo NOT NULL + index (không đụng cột đã xóa)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mttq_uy_vien_uy_ban'
      AND column_name = 'can_bo_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mttq_uy_vien_uy_ban'
      AND column_name = 'ho_va_ten'
  ) THEN
    IF EXISTS (SELECT 1 FROM public.mttq_uy_vien_uy_ban WHERE can_bo_id IS NULL) THEN
      RAISE EXCEPTION 'mttq_uy_vien_uy_ban_slim: can_bo_id NULL trên bảng đã thu gọn — sửa dữ liệu tay.';
    END IF;
    ALTER TABLE public.mttq_uy_vien_uy_ban
      ALTER COLUMN can_bo_id SET NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS uq_mttq_uy_vien_uy_ban_nhiem_ky_can_bo
      ON public.mttq_uy_vien_uy_ban (nhiem_ky_id, can_bo_id);
    CREATE INDEX IF NOT EXISTS idx_mttq_uy_vien_uy_ban_can_bo
      ON public.mttq_uy_vien_uy_ban (can_bo_id);
  END IF;
END $$;
