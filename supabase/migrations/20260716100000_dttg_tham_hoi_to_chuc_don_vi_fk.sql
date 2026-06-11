-- ============================================================================
-- DTTG Thăm hỏi tổ chức — FK đơn vị thăm hỏi → var_ssn_xa_phuong
-- NULL = MTTQ Tỉnh (cấp tỉnh)
-- ============================================================================

ALTER TABLE public.dttg_tham_hoi_to_chuc
  ADD COLUMN IF NOT EXISTS don_vi_tham_hoi_id BIGINT
    CONSTRAINT dttg_tham_hoi_to_chuc_don_vi_tham_hoi_id_fkey
    REFERENCES public.var_ssn_xa_phuong (id)
    ON UPDATE CASCADE ON DELETE SET NULL;

-- Backfill từ TEXT don_vi_tham_hoi (nếu cột còn tồn tại)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'dttg_tham_hoi_to_chuc'
      AND column_name = 'don_vi_tham_hoi'
  ) THEN
    UPDATE public.dttg_tham_hoi_to_chuc t
    SET don_vi_tham_hoi_id = sub.id
    FROM (
      SELECT t2.id AS row_id, xp.id
      FROM public.dttg_tham_hoi_to_chuc t2
      JOIN public.var_ssn_xa_phuong xp
        ON lower(trim(xp.ten)) = lower(trim(t2.don_vi_tham_hoi))
      WHERE t2.don_vi_tham_hoi IS NOT NULL
        AND trim(t2.don_vi_tham_hoi) <> ''
        AND lower(trim(t2.don_vi_tham_hoi)) NOT IN (
          'mttq tỉnh', 'mttq tinh',
          'cqmttq tỉnh', 'cqmttq tinh'
        )
    ) sub
    WHERE t.id = sub.row_id;

    UPDATE public.dttg_tham_hoi_to_chuc
    SET don_vi_tham_hoi_id = NULL
    WHERE don_vi_tham_hoi IS NULL
       OR trim(don_vi_tham_hoi) = ''
       OR lower(trim(don_vi_tham_hoi)) IN (
         'mttq tỉnh', 'mttq tinh',
         'cqmttq tỉnh', 'cqmttq tinh'
       );
  END IF;
END $$;

ALTER TABLE public.dttg_tham_hoi_to_chuc
  DROP COLUMN IF EXISTS don_vi_tham_hoi;

CREATE INDEX IF NOT EXISTS idx_dttg_tham_hoi_to_chuc_don_vi
  ON public.dttg_tham_hoi_to_chuc (don_vi_tham_hoi_id);
