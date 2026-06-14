-- ============================================================================
-- mttq_lop_tap_huan: to_chuc_id (FK mttq_thiet_lap loai = to_chuc)
-- ============================================================================

ALTER TABLE public.mttq_lop_tap_huan
  ADD COLUMN IF NOT EXISTS to_chuc_id BIGINT;

ALTER TABLE public.mttq_lop_tap_huan
  DROP CONSTRAINT IF EXISTS mttq_lop_tap_huan_to_chuc_id_fkey;

ALTER TABLE public.mttq_lop_tap_huan
  ADD CONSTRAINT mttq_lop_tap_huan_to_chuc_id_fkey
  FOREIGN KEY (to_chuc_id) REFERENCES public.mttq_thiet_lap (id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_mttq_lop_tap_huan_to_chuc
  ON public.mttq_lop_tap_huan (to_chuc_id);

CREATE OR REPLACE FUNCTION public.mttq_lop_tap_huan_validate_to_chuc_loai()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.to_chuc_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.mttq_thiet_lap t
      WHERE t.id = NEW.to_chuc_id AND t.loai = 'to_chuc'
    ) THEN
      RAISE EXCEPTION 'mttq_lop_tap_huan.to_chuc_id must reference mttq_thiet_lap with loai = to_chuc';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mttq_lop_tap_huan_validate_to_chuc ON public.mttq_lop_tap_huan;
CREATE TRIGGER trg_mttq_lop_tap_huan_validate_to_chuc
  BEFORE INSERT OR UPDATE ON public.mttq_lop_tap_huan
  FOR EACH ROW EXECUTE FUNCTION public.mttq_lop_tap_huan_validate_to_chuc_loai();
