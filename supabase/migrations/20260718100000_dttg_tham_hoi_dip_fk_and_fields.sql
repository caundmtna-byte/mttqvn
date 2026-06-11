-- ============================================================================
-- DTTG Thăm hỏi — FK dịp thăm hỏi + thời gian thực tế + phòng ban tham mưu (tổ chức)
-- Chạy sau 20260717100000_dttg_dip_tham_hoi.sql
-- ============================================================================

-- Thăm hỏi tổ chức
ALTER TABLE public.dttg_tham_hoi_to_chuc
  ADD COLUMN IF NOT EXISTS dip_tham_hoi_id BIGINT
    CONSTRAINT dttg_tham_hoi_to_chuc_dip_tham_hoi_id_fkey
    REFERENCES public.dttg_dip_tham_hoi (id)
    ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.dttg_tham_hoi_to_chuc
  ADD COLUMN IF NOT EXISTS thoi_gian_thuc_te DATE;

ALTER TABLE public.dttg_tham_hoi_to_chuc
  ADD COLUMN IF NOT EXISTS phong_ban_tham_muu_id BIGINT
    CONSTRAINT dttg_tham_hoi_to_chuc_phong_ban_tham_muu_id_fkey
    REFERENCES public.var_phong_ban (id)
    ON UPDATE CASCADE ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'dttg_tham_hoi_to_chuc'
      AND column_name = 'dip_tham_hoi'
  ) THEN
    UPDATE public.dttg_tham_hoi_to_chuc t
    SET dip_tham_hoi_id = d.id
    FROM public.dttg_dip_tham_hoi d
    WHERE t.dip_tham_hoi_id IS NULL
      AND t.dip_tham_hoi IS NOT NULL
      AND trim(t.dip_tham_hoi) <> ''
      AND lower(trim(t.dip_tham_hoi)) = lower(trim(d.ten_dip));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_dttg_tham_hoi_to_chuc_dip
  ON public.dttg_tham_hoi_to_chuc (dip_tham_hoi_id);
CREATE INDEX IF NOT EXISTS idx_dttg_tham_hoi_to_chuc_phong_ban
  ON public.dttg_tham_hoi_to_chuc (phong_ban_tham_muu_id);

-- Thăm hỏi cá nhân
ALTER TABLE public.dttg_tham_hoi_ca_nhan
  ADD COLUMN IF NOT EXISTS dip_tham_hoi_id BIGINT
    CONSTRAINT dttg_tham_hoi_ca_nhan_dip_tham_hoi_id_fkey
    REFERENCES public.dttg_dip_tham_hoi (id)
    ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.dttg_tham_hoi_ca_nhan
  ADD COLUMN IF NOT EXISTS thoi_gian_thuc_te DATE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'dttg_tham_hoi_ca_nhan'
      AND column_name = 'dip_tham_hoi'
  ) THEN
    UPDATE public.dttg_tham_hoi_ca_nhan t
    SET dip_tham_hoi_id = d.id
    FROM public.dttg_dip_tham_hoi d
    WHERE t.dip_tham_hoi_id IS NULL
      AND t.dip_tham_hoi IS NOT NULL
      AND trim(t.dip_tham_hoi) <> ''
      AND lower(trim(t.dip_tham_hoi)) = lower(trim(d.ten_dip));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_dttg_tham_hoi_ca_nhan_dip
  ON public.dttg_tham_hoi_ca_nhan (dip_tham_hoi_id);

-- View đếm số lượng thực hiện / hoàn thành từ bảng con (sau khi có FK)
CREATE OR REPLACE VIEW public.dttg_dip_tham_hoi_with_counts
WITH (security_invoker = true)
AS
SELECT
  d.*,
  COALESCE(tc_stats.so_thuc_hien_to_chuc, 0)::INT AS so_thuc_hien_to_chuc,
  COALESCE(cn_stats.so_thuc_hien_ca_nhan, 0)::INT AS so_thuc_hien_ca_nhan,
  COALESCE(tc_stats.so_hoan_thanh_to_chuc, 0)::INT AS so_hoan_thanh_to_chuc,
  COALESCE(cn_stats.so_hoan_thanh_ca_nhan, 0)::INT AS so_hoan_thanh_ca_nhan,
  (d.so_luong_to_chuc_du_kien + d.so_luong_ca_nhan_du_kien)::INT AS so_luong_du_kien_tong,
  (
    COALESCE(tc_stats.so_hoan_thanh_to_chuc, 0) + COALESCE(cn_stats.so_hoan_thanh_ca_nhan, 0)
  )::INT AS so_luong_thuc_te_tong
FROM public.dttg_dip_tham_hoi d
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::INT AS so_thuc_hien_to_chuc,
    COUNT(*) FILTER (WHERE tc.tien_do = 'Đã hoàn thành')::INT AS so_hoan_thanh_to_chuc
  FROM public.dttg_tham_hoi_to_chuc tc
  WHERE tc.dip_tham_hoi_id = d.id
) tc_stats ON true
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::INT AS so_thuc_hien_ca_nhan,
    COUNT(*) FILTER (WHERE cn.trang_thai = 'Đã hoàn thành')::INT AS so_hoan_thanh_ca_nhan
  FROM public.dttg_tham_hoi_ca_nhan cn
  WHERE cn.dip_tham_hoi_id = d.id
) cn_stats ON true;

GRANT SELECT ON public.dttg_dip_tham_hoi_with_counts TO authenticated;
GRANT SELECT ON public.dttg_dip_tham_hoi_with_counts TO anon;
