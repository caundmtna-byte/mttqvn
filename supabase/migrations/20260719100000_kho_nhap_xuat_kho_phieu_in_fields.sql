-- ============================================================================
-- kho_nhap_xuat_kho: trường in phiếu (C30-HD / C21-HD)
-- ============================================================================

ALTER TABLE public.kho_nhap_xuat_kho
  ADD COLUMN IF NOT EXISTS nguoi_giao_nhan TEXT,
  ADD COLUMN IF NOT EXISTS bo_phan TEXT,
  ADD COLUMN IF NOT EXISTS chung_tu_goc TEXT;

-- Drop old signatures before recreate (thêm 3 tham số in phiếu).
DROP FUNCTION IF EXISTS public.rpc_kho_tao_phieu_nhap_xuat(TEXT, DATE, BIGINT, BIGINT, BIGINT, BIGINT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.rpc_kho_cap_nhat_phieu_nhap_xuat(BIGINT, TEXT, DATE, BIGINT, BIGINT, BIGINT, BIGINT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.rpc_kho_tao_phieu_nhap_xuat(
  p_loai_phieu        TEXT,
  p_ngay_phieu        DATE,
  p_kho_xuat_id       BIGINT,
  p_kho_nhap_id       BIGINT,
  p_don_vi_cuu_tro_id BIGINT,
  p_dot_cuu_tro_id    BIGINT,
  p_ghi_chu           TEXT,
  p_nguoi_giao_nhan   TEXT,
  p_bo_phan           TEXT,
  p_chung_tu_goc      TEXT,
  p_chi_tiet          JSONB
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_phieu_id BIGINT;
BEGIN
  IF p_chi_tiet IS NULL OR jsonb_array_length(p_chi_tiet) = 0 THEN
    RAISE EXCEPTION 'CHI_TIET_RONG: Phiếu phải có ít nhất 1 dòng chi tiết.';
  END IF;

  INSERT INTO public.kho_nhap_xuat_kho (
    loai_phieu,
    ngay_phieu,
    kho_xuat_id,
    kho_nhap_id,
    don_vi_cuu_tro_id,
    dot_cuu_tro_id,
    ghi_chu,
    nguoi_giao_nhan,
    bo_phan,
    chung_tu_goc
  )
  VALUES (
    p_loai_phieu,
    p_ngay_phieu,
    p_kho_xuat_id,
    p_kho_nhap_id,
    p_don_vi_cuu_tro_id,
    p_dot_cuu_tro_id,
    p_ghi_chu,
    NULLIF(trim(p_nguoi_giao_nhan), ''),
    NULLIF(trim(p_bo_phan), ''),
    NULLIF(trim(p_chung_tu_goc), '')
  )
  RETURNING id INTO v_phieu_id;

  INSERT INTO public.kho_nhap_xuat_kho_ct
    (phieu_id, hang_hoa_id, don_vi_tinh, so_luong, don_gia, ghi_chu, thu_tu)
  SELECT
    v_phieu_id,
    (line->>'hang_hoa_id')::BIGINT,
    line->>'don_vi_tinh',
    (line->>'so_luong')::NUMERIC,
    COALESCE((line->>'don_gia')::NUMERIC, 0),
    NULLIF(line->>'ghi_chu', ''),
    COALESCE((line->>'thu_tu')::INTEGER, 0)
  FROM jsonb_array_elements(p_chi_tiet) AS line;

  RETURN v_phieu_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_kho_tao_phieu_nhap_xuat(
  TEXT, DATE, BIGINT, BIGINT, BIGINT, BIGINT, TEXT, TEXT, TEXT, TEXT, JSONB
) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_kho_cap_nhat_phieu_nhap_xuat(
  p_id                BIGINT,
  p_loai_phieu        TEXT,
  p_ngay_phieu        DATE,
  p_kho_xuat_id       BIGINT,
  p_kho_nhap_id       BIGINT,
  p_don_vi_cuu_tro_id BIGINT,
  p_dot_cuu_tro_id    BIGINT,
  p_ghi_chu           TEXT,
  p_nguoi_giao_nhan   TEXT,
  p_bo_phan           TEXT,
  p_chung_tu_goc      TEXT,
  p_chi_tiet          JSONB
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF p_chi_tiet IS NULL OR jsonb_array_length(p_chi_tiet) = 0 THEN
    RAISE EXCEPTION 'CHI_TIET_RONG: Phiếu phải có ít nhất 1 dòng chi tiết.';
  END IF;

  UPDATE public.kho_nhap_xuat_kho SET
    loai_phieu        = p_loai_phieu,
    ngay_phieu        = p_ngay_phieu,
    kho_xuat_id       = p_kho_xuat_id,
    kho_nhap_id       = p_kho_nhap_id,
    don_vi_cuu_tro_id = p_don_vi_cuu_tro_id,
    dot_cuu_tro_id    = p_dot_cuu_tro_id,
    ghi_chu           = p_ghi_chu,
    nguoi_giao_nhan   = NULLIF(trim(p_nguoi_giao_nhan), ''),
    bo_phan           = NULLIF(trim(p_bo_phan), ''),
    chung_tu_goc      = NULLIF(trim(p_chung_tu_goc), '')
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PHIEU_KHONG_TON_TAI: Không tìm thấy phiếu %.', p_id;
  END IF;

  DELETE FROM public.kho_nhap_xuat_kho_ct WHERE phieu_id = p_id;

  INSERT INTO public.kho_nhap_xuat_kho_ct
    (phieu_id, hang_hoa_id, don_vi_tinh, so_luong, don_gia, ghi_chu, thu_tu)
  SELECT
    p_id,
    (line->>'hang_hoa_id')::BIGINT,
    line->>'don_vi_tinh',
    (line->>'so_luong')::NUMERIC,
    COALESCE((line->>'don_gia')::NUMERIC, 0),
    NULLIF(line->>'ghi_chu', ''),
    COALESCE((line->>'thu_tu')::INTEGER, 0)
  FROM jsonb_array_elements(p_chi_tiet) AS line;

  RETURN p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_kho_cap_nhat_phieu_nhap_xuat(
  BIGINT, TEXT, DATE, BIGINT, BIGINT, BIGINT, BIGINT, TEXT, TEXT, TEXT, TEXT, JSONB
) TO authenticated;

NOTIFY pgrst, 'reload schema';
