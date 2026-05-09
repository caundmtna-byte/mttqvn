-- ============================================================================
-- Ủy viên ủy ban: liên kết mttq_can_bo, bỏ cột trùng hồ sơ cán bộ
-- ============================================================================

ALTER TABLE public.mttq_uy_vien_uy_ban
  ADD COLUMN IF NOT EXISTS can_bo_id BIGINT
  REFERENCES public.mttq_can_bo (id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

-- Gán can_bo theo họ tên + ngày sinh (khi khớp duy nhất — lấy id nhỏ nhất)
WITH ranked AS (
  SELECT
    u.id AS uy_id,
    c.id AS cb_id,
    ROW_NUMBER() OVER (
      PARTITION BY u.id
      ORDER BY c.id
    ) AS rn
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
WHERE u.id = r.uy_id
  AND r.rn = 1
  AND u.can_bo_id IS NULL;

-- Bước 2: họ tên trùng duy nhất trên mttq_can_bo (không cần khớp ngày sinh)
WITH uniq_name AS (
  SELECT
    lower(trim(c.ho_ten)) AS hn,
    min(c.id) AS cb_id
  FROM public.mttq_can_bo c
  GROUP BY lower(trim(c.ho_ten))
  HAVING count(*) = 1
)
UPDATE public.mttq_uy_vien_uy_ban u
SET can_bo_id = n.cb_id
FROM uniq_name n
WHERE u.can_bo_id IS NULL
  AND lower(trim(u.ho_va_ten)) = n.hn;

DO $$
DECLARE
  n_missing int;
BEGIN
  SELECT count(*)::int INTO n_missing
  FROM public.mttq_uy_vien_uy_ban
  WHERE can_bo_id IS NULL;

  IF n_missing > 0 THEN
    RAISE EXCEPTION
      'mttq_uy_vien_uy_ban: còn % bản ghi chưa map được can_bo_id (khớp lower(trim(ho_va_ten)) + ngay_sinh với mttq_can_bo). Tạo/sửa cán bộ hoặc cập nhật tay rồi chạy lại migration.',
      n_missing;
  END IF;
END $$;

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
