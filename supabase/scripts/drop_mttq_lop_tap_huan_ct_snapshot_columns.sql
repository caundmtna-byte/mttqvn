-- Chạy thủ công trên Supabase SQL Editor nếu cần (bản chính là migration 20260610220000).
-- Bỏ cột snapshot trên chi tiết lớp tập huấn — UI lấy chức vụ / tổ chức / phòng ban từ join `mttq_can_bo`.

ALTER TABLE public.mttq_lop_tap_huan_ct
  DROP COLUMN IF EXISTS chuc_vu;

ALTER TABLE public.mttq_lop_tap_huan_ct
  DROP COLUMN IF EXISTS don_vi_cong_tac;
