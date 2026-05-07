-- Bổ sung cột snapshot trên chi tiết lớp tập huấn (đã chạy migration 20260515100000 trước khi có 2 cột này).

ALTER TABLE public.mttq_lop_tap_huan_ct
  ADD COLUMN IF NOT EXISTS chuc_vu TEXT NOT NULL DEFAULT '';

ALTER TABLE public.mttq_lop_tap_huan_ct
  ADD COLUMN IF NOT EXISTS don_vi_cong_tac TEXT NOT NULL DEFAULT '';
