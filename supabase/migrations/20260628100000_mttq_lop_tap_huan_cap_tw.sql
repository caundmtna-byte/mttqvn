-- Thêm cấp tập huấn TW (Trung ương) vào CHECK `cap_tap_huan`.

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

ALTER TABLE public.mttq_lop_tap_huan
  ADD CONSTRAINT mttq_lop_tap_huan_cap_tap_huan_check
  CHECK (cap_tap_huan IN ('TW', 'Cấp tỉnh', 'Cấp xã'));
