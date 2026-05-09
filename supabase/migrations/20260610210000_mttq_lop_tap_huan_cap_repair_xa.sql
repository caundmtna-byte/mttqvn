-- ============================================================================
-- Sửa DB nếu đã chạy bản migration cũ đặt CHECK cap = (Cấp tỉnh | Cấp huyện):
-- gỡ CHECK → đổi dữ liệu Cấp huyện → Cấp xã → thêm CHECK đúng (Cấp tỉnh | Cấp xã).
-- ============================================================================

DO $drop_cap_checks$
DECLARE
  r record;
BEGIN
  FOR r IN (
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'mttq_lop_tap_huan'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%cap_tap_huan%'
  ) LOOP
    EXECUTE format('ALTER TABLE public.mttq_lop_tap_huan DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $drop_cap_checks$;

UPDATE public.mttq_lop_tap_huan
SET cap_tap_huan = 'Cấp xã'
WHERE cap_tap_huan = 'Cấp huyện';

ALTER TABLE public.mttq_lop_tap_huan
  ADD CONSTRAINT mttq_lop_tap_huan_cap_tap_huan_check
  CHECK (cap_tap_huan IN ('Cấp tỉnh', 'Cấp xã'));
