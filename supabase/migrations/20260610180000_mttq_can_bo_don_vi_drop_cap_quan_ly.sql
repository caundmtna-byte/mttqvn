-- ============================================================================
-- mttq_can_bo: thêm don_vi_id (xã/phường), bỏ cap_quan_ly_id (thiết lập)
-- ============================================================================

DROP TRIGGER IF EXISTS trg_mttq_can_bo_validate_refs ON public.mttq_can_bo;

CREATE OR REPLACE FUNCTION public.mttq_can_bo_validate_thiet_lap_loai()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
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

DROP INDEX IF EXISTS public.idx_mttq_can_bo_cap_quan_ly;

ALTER TABLE public.mttq_can_bo
  DROP CONSTRAINT IF EXISTS mttq_can_bo_cap_quan_ly_id_fkey;

ALTER TABLE public.mttq_can_bo
  DROP COLUMN IF EXISTS cap_quan_ly_id;

ALTER TABLE public.mttq_can_bo
  ADD COLUMN IF NOT EXISTS don_vi_id BIGINT
  REFERENCES public.var_ssn_xa_phuong (id)
  ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mttq_can_bo_don_vi ON public.mttq_can_bo (don_vi_id);

CREATE TRIGGER trg_mttq_can_bo_validate_refs
  BEFORE INSERT OR UPDATE ON public.mttq_can_bo
  FOR EACH ROW EXECUTE FUNCTION public.mttq_can_bo_validate_thiet_lap_loai();
