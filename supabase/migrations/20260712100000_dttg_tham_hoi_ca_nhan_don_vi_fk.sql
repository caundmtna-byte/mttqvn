-- ============================================================================
-- DTTG Thăm hỏi cá nhân — FK đơn vị thăm hỏi + xã/phường, thời gian dự kiến DATE
-- ============================================================================

-- 1a. FK đơn vị thăm hỏi + xã/phường
ALTER TABLE public.dttg_tham_hoi_ca_nhan
  ADD COLUMN IF NOT EXISTS don_vi_tham_hoi_id BIGINT
    CONSTRAINT dttg_tham_hoi_ca_nhan_don_vi_tham_hoi_id_fkey
    REFERENCES public.var_ssn_xa_phuong (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS xa_phuong_id BIGINT
    CONSTRAINT dttg_tham_hoi_ca_nhan_xa_phuong_id_fkey
    REFERENCES public.var_ssn_xa_phuong (id)
    ON UPDATE CASCADE ON DELETE SET NULL;

-- Backfill don_vi_tham_hoi_id từ TEXT don_vi_tham_hoi (nếu cột còn tồn tại)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'dttg_tham_hoi_ca_nhan'
      AND column_name = 'don_vi_tham_hoi'
  ) THEN
    UPDATE public.dttg_tham_hoi_ca_nhan t
    SET don_vi_tham_hoi_id = sub.id
    FROM (
      SELECT t2.id AS row_id, xp.id
      FROM public.dttg_tham_hoi_ca_nhan t2
      JOIN public.var_ssn_xa_phuong xp
        ON lower(trim(xp.ten)) = lower(trim(t2.don_vi_tham_hoi))
      WHERE t2.don_vi_tham_hoi IS NOT NULL
        AND trim(t2.don_vi_tham_hoi) <> ''
        AND lower(trim(t2.don_vi_tham_hoi)) NOT IN ('cqmttq tỉnh', 'cqmttq tinh')
    ) sub
    WHERE t.id = sub.row_id;

    UPDATE public.dttg_tham_hoi_ca_nhan
    SET don_vi_tham_hoi_id = NULL
    WHERE don_vi_tham_hoi IS NULL
       OR trim(don_vi_tham_hoi) = ''
       OR lower(trim(don_vi_tham_hoi)) IN ('cqmttq tỉnh', 'cqmttq tinh');
  END IF;
END $$;

-- Backfill xa_phuong_id từ TEXT don_vi_xa_phuong
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'dttg_tham_hoi_ca_nhan'
      AND column_name = 'don_vi_xa_phuong'
  ) THEN
    UPDATE public.dttg_tham_hoi_ca_nhan t
    SET xa_phuong_id = sub.id
    FROM (
      SELECT t2.id AS row_id, xp.id
      FROM public.dttg_tham_hoi_ca_nhan t2
      JOIN public.var_ssn_xa_phuong xp
        ON lower(trim(xp.ten)) = lower(trim(t2.don_vi_xa_phuong))
      WHERE t2.don_vi_xa_phuong IS NOT NULL
        AND trim(t2.don_vi_xa_phuong) <> ''
    ) sub
    WHERE t.id = sub.row_id;
  END IF;
END $$;

ALTER TABLE public.dttg_tham_hoi_ca_nhan
  DROP COLUMN IF EXISTS don_vi_tham_hoi,
  DROP COLUMN IF EXISTS don_vi_xa_phuong;

CREATE INDEX IF NOT EXISTS idx_dttg_tham_hoi_ca_nhan_don_vi_tham_hoi
  ON public.dttg_tham_hoi_ca_nhan (don_vi_tham_hoi_id);
CREATE INDEX IF NOT EXISTS idx_dttg_tham_hoi_ca_nhan_xa_phuong
  ON public.dttg_tham_hoi_ca_nhan (xa_phuong_id);

-- 1b. Thời gian dự kiến — TEXT → DATE (ngày đầu tháng)
ALTER TABLE public.dttg_tham_hoi_ca_nhan
  ADD COLUMN IF NOT EXISTS thoi_gian_du_kien_new DATE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'dttg_tham_hoi_ca_nhan'
      AND column_name = 'thoi_gian_du_kien'
      AND data_type = 'text'
  ) THEN
    UPDATE public.dttg_tham_hoi_ca_nhan
    SET thoi_gian_du_kien_new = CASE
      WHEN thoi_gian_du_kien IS NULL OR trim(thoi_gian_du_kien) = '' THEN NULL
      WHEN thoi_gian_du_kien ~ '^\d{4}-\d{2}$' THEN (thoi_gian_du_kien || '-01')::date
      WHEN thoi_gian_du_kien ~ '^\d{4}-\d{2}-\d{2}' THEN date_trunc('month', thoi_gian_du_kien::date)::date
      WHEN thoi_gian_du_kien ~* '^tháng\s+\d{1,2}/\d{4}$' THEN
        make_date(
          (regexp_match(lower(trim(thoi_gian_du_kien)), '/(\d{4})$'))[1]::int,
          (regexp_match(lower(trim(thoi_gian_du_kien)), 'tháng\s+(\d{1,2})/'))[1]::int,
          1
        )
      WHEN thoi_gian_du_kien ~ '^\d{1,2}/\d{4}$' THEN
        make_date(
          (regexp_match(trim(thoi_gian_du_kien), '/(\d{4})$'))[1]::int,
          (regexp_match(trim(thoi_gian_du_kien), '^(\d{1,2})/'))[1]::int,
          1
        )
      ELSE NULL
    END;

    ALTER TABLE public.dttg_tham_hoi_ca_nhan DROP COLUMN thoi_gian_du_kien;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'dttg_tham_hoi_ca_nhan'
      AND column_name = 'thoi_gian_du_kien'
      AND data_type = 'date'
  ) THEN
    UPDATE public.dttg_tham_hoi_ca_nhan
    SET thoi_gian_du_kien_new = date_trunc('month', thoi_gian_du_kien)::date
    WHERE thoi_gian_du_kien IS NOT NULL;

    ALTER TABLE public.dttg_tham_hoi_ca_nhan DROP COLUMN thoi_gian_du_kien;
  END IF;
END $$;

ALTER TABLE public.dttg_tham_hoi_ca_nhan
  RENAME COLUMN thoi_gian_du_kien_new TO thoi_gian_du_kien;

CREATE INDEX IF NOT EXISTS idx_dttg_tham_hoi_ca_nhan_thoi_gian
  ON public.dttg_tham_hoi_ca_nhan (thoi_gian_du_kien);
