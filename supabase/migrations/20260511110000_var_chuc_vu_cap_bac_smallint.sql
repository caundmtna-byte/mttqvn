-- ============================================================================
-- Đảm bảo var_chuc_vu.cap_bac là SMALLINT (int2), không phải text/varchar.
-- Chạy an toàn khi cột đã là smallint (không đổi gì).
-- ============================================================================

DO $$
DECLARE
  dt text;
BEGIN
  IF to_regclass('public.var_chuc_vu') IS NULL THEN
    RETURN;
  END IF;

  SELECT c.data_type INTO dt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'var_chuc_vu'
    AND c.column_name = 'cap_bac';

  IF dt IS NULL THEN
    ALTER TABLE public.var_chuc_vu ADD COLUMN cap_bac smallint;
    RETURN;
  END IF;

  IF dt = 'smallint' THEN
    RETURN;
  END IF;

  ALTER TABLE public.var_chuc_vu
    ALTER COLUMN cap_bac TYPE smallint
    USING (
      CASE
        WHEN cap_bac IS NULL THEN NULL::smallint
        WHEN trim(cap_bac::text) = '' THEN NULL::smallint
        WHEN trim(cap_bac::text) ~ '^-?[0-9]+$' THEN trim(cap_bac::text)::smallint
        ELSE NULL::smallint
      END
    );
END $$;
