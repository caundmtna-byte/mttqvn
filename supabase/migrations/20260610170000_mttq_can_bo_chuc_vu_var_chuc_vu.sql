-- ============================================================================
-- mttq_can_bo.chuc_vu_id → var_chuc_vu (thay mttq_thiet_lap loại chuc_vu)
-- Xóa danh mục chuc_vu khỏi mttq_thiet_lap + cập nhật CHECK loại.
-- ============================================================================

-- 1) Tạm tắt trigger validate thiết lập
DROP TRIGGER IF EXISTS trg_mttq_can_bo_validate_refs ON public.mttq_can_bo;

-- 2) Bỏ kiểm tra chuc_vu → thiết lập (chỉ còn các FK thiết lập khác)
CREATE OR REPLACE FUNCTION public.mttq_can_bo_validate_thiet_lap_loai()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.cap_quan_ly_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.mttq_thiet_lap t WHERE t.id = NEW.cap_quan_ly_id AND t.loai = 'cap_quan_ly'
    ) THEN
      RAISE EXCEPTION 'mttq_can_bo.cap_quan_ly_id must reference mttq_thiet_lap with loai = cap_quan_ly';
    END IF;
  END IF;
  IF NEW.to_chuc_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.mttq_thiet_lap t WHERE t.id = NEW.to_chuc_id AND t.loai = 'to_chuc'
    ) THEN
      RAISE EXCEPTION 'mttq_can_bo.to_chuc_id must reference mttq_thiet_lap with loai = to_chuc';
    END IF;
  END IF;
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

-- 3) Gỡ FK cũ (thiết lập)
ALTER TABLE public.mttq_can_bo
  DROP CONSTRAINT IF EXISTS mttq_can_bo_chuc_vu_id_fkey;

-- 4) Ánh xạ id cũ (mttq_thiet_lap chuc_vu) → var_chuc_vu theo tên (trim, lower)
UPDATE public.mttq_can_bo c
SET chuc_vu_id = v.id
FROM public.mttq_thiet_lap t
INNER JOIN public.var_chuc_vu v ON lower(trim(v.ten_chuc_vu)) = lower(trim(t.ten))
WHERE c.chuc_vu_id = t.id
  AND t.loai = 'chuc_vu';

-- 5) Các dòng không map được (id cũ không còn hợp lệ với var_chuc_vu) → NULL
UPDATE public.mttq_can_bo c
SET chuc_vu_id = NULL
WHERE c.chuc_vu_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.var_chuc_vu v WHERE v.id = c.chuc_vu_id);

-- 6) Xóa danh mục chức vụ trong thiết lập
DELETE FROM public.mttq_thiet_lap WHERE loai = 'chuc_vu';

-- 7) CHECK loại — bỏ giá trị chuc_vu
ALTER TABLE public.mttq_thiet_lap DROP CONSTRAINT IF EXISTS mttq_thiet_lap_loai_check;

ALTER TABLE public.mttq_thiet_lap
  ADD CONSTRAINT mttq_thiet_lap_loai_check
  CHECK (loai IN (
    'cap_quan_ly',
    'to_chuc',
    'dan_toc',
    'trinh_do',
    'ly_luan_chinh_tri',
    'trang_thai'
  ));

-- 8) FK mới → var_chuc_vu
ALTER TABLE public.mttq_can_bo
  ADD CONSTRAINT mttq_can_bo_chuc_vu_id_fkey
  FOREIGN KEY (chuc_vu_id) REFERENCES public.var_chuc_vu (id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

-- 9) Bật lại trigger
CREATE TRIGGER trg_mttq_can_bo_validate_refs
  BEFORE INSERT OR UPDATE ON public.mttq_can_bo
  FOR EACH ROW EXECUTE FUNCTION public.mttq_can_bo_validate_thiet_lap_loai();
