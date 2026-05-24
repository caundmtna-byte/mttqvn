-- Thêm snapshot lương (MLCS × hệ số bậc tại thời điểm ghi nhận)
ALTER TABLE public.mttq_tang_luong
  ADD COLUMN IF NOT EXISTS luong BIGINT NOT NULL DEFAULT 0;

ALTER TABLE public.mttq_tang_luong
  DROP CONSTRAINT IF EXISTS mttq_tang_luong_luong_chk;

ALTER TABLE public.mttq_tang_luong
  ADD CONSTRAINT mttq_tang_luong_luong_chk CHECK (luong >= 0);

NOTIFY pgrst, 'reload schema';
