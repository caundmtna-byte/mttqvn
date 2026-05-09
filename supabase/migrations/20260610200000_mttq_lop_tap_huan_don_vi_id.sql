-- ============================================================================
-- mttq_lop_tap_huan: don_vi_id (xã/phường) — bắt buộc ở app khi cap = Cấp xã
-- (cap_tap_huan vẫn chỉ 'Cấp tỉnh' | 'Cấp xã' theo migration gốc)
-- ============================================================================

ALTER TABLE public.mttq_lop_tap_huan
  ADD COLUMN IF NOT EXISTS don_vi_id BIGINT;

ALTER TABLE public.mttq_lop_tap_huan
  DROP CONSTRAINT IF EXISTS mttq_lop_tap_huan_don_vi_id_fkey;

ALTER TABLE public.mttq_lop_tap_huan
  ADD CONSTRAINT mttq_lop_tap_huan_don_vi_id_fkey
  FOREIGN KEY (don_vi_id) REFERENCES public.var_ssn_xa_phuong (id)
  ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mttq_lop_tap_huan_don_vi ON public.mttq_lop_tap_huan (don_vi_id);
