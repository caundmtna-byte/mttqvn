-- ══════════════════════════════════════════════════════════
-- A. mttq_can_bo: chuyển to_chuc_id (single FK) → to_chuc_ids (BIGINT[])
-- ══════════════════════════════════════════════════════════

-- 1. Thêm cột mảng mới (idempotent)
ALTER TABLE public.mttq_can_bo
  ADD COLUMN IF NOT EXISTS to_chuc_ids BIGINT[] NOT NULL DEFAULT '{}';

-- 2. Migrate dữ liệu: chỉ chạy nếu to_chuc_id còn tồn tại
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'mttq_can_bo'
      AND column_name  = 'to_chuc_id'
  ) THEN
    UPDATE public.mttq_can_bo
      SET to_chuc_ids = ARRAY[to_chuc_id]
      WHERE to_chuc_id IS NOT NULL;
  END IF;
END;
$$;

-- 3. Xoá trigger cũ (tên cũ trước migration 20260610180000)
DROP TRIGGER IF EXISTS mttq_can_bo_validate_fk_trigger ON public.mttq_can_bo;

-- 4. Xoá trigger hiện tại (tên mới từ migration 20260610180000)
DROP TRIGGER IF EXISTS trg_mttq_can_bo_validate_refs ON public.mttq_can_bo;

-- 5. Xoá cột FK cũ (idempotent)
ALTER TABLE public.mttq_can_bo
  DROP COLUMN IF EXISTS to_chuc_id;

-- 6. Cập nhật trigger function — bỏ check to_chuc_id (cột đã xoá),
--    giữ nguyên check các FK khác
CREATE OR REPLACE FUNCTION public.mttq_can_bo_validate_thiet_lap_loai()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.dan_toc_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.mttq_thiet_lap t WHERE t.id = NEW.dan_toc_id AND t.loai = 'dan_toc'
    ) THEN
      RAISE EXCEPTION 'mttq_can_bo.dan_toc_id must reference mttq_thiet_lap with loai = dan_toc';
    END IF;
  END IF;
  IF NEW.trinh_do_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.mttq_thiet_lap t WHERE t.id = NEW.trinh_do_id AND t.loai = 'trinh_do'
    ) THEN
      RAISE EXCEPTION 'mttq_can_bo.trinh_do_id must reference mttq_thiet_lap with loai = trinh_do';
    END IF;
  END IF;
  IF NEW.ly_luan_chinh_tri_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.mttq_thiet_lap t WHERE t.id = NEW.ly_luan_chinh_tri_id AND t.loai = 'ly_luan_chinh_tri'
    ) THEN
      RAISE EXCEPTION 'mttq_can_bo.ly_luan_chinh_tri_id must reference mttq_thiet_lap with loai = ly_luan_chinh_tri';
    END IF;
  END IF;
  IF NEW.trang_thai_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.mttq_thiet_lap t WHERE t.id = NEW.trang_thai_id AND t.loai = 'trang_thai'
    ) THEN
      RAISE EXCEPTION 'mttq_can_bo.trang_thai_id must reference mttq_thiet_lap with loai = trang_thai';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 7. Tạo lại trigger với function đã cập nhật
CREATE TRIGGER trg_mttq_can_bo_validate_refs
  BEFORE INSERT OR UPDATE ON public.mttq_can_bo
  FOR EACH ROW EXECUTE FUNCTION public.mttq_can_bo_validate_thiet_lap_loai();

-- ══════════════════════════════════════════════════════════
-- B. var_nhan_vien: thêm cột to_chuc_ids mới (idempotent)
-- ══════════════════════════════════════════════════════════

ALTER TABLE public.var_nhan_vien
  ADD COLUMN IF NOT EXISTS to_chuc_ids BIGINT[] NOT NULL DEFAULT '{}';
