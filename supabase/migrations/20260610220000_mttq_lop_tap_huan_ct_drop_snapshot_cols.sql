-- ============================================================================
-- mttq_lop_tap_huan_ct: bỏ cột snapshot chuc_vu, don_vi_cong_tac
-- (hiển thị lấy trực tiếp từ join mttq_can_bo trong app / PostgREST)
-- ============================================================================

ALTER TABLE public.mttq_lop_tap_huan_ct
  DROP COLUMN IF EXISTS chuc_vu;

ALTER TABLE public.mttq_lop_tap_huan_ct
  DROP COLUMN IF EXISTS don_vi_cong_tac;
