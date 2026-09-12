-- ============================================================================
-- Tập huấn: ghi lớp + dòng cán bộ trong MỘT transaction (mẫu: rpc_kho_*)
--
-- Cùng bệnh với khen thưởng: client ghi nhiều lượt rời rạc nên lỗi giữa chừng
-- để lại lớp rỗng hoặc mất danh sách cán bộ cũ.
--
-- Trigger `tg_gan_id_nguoi_tao_mttq_lop_tap_huan` và
-- `trg_mttq_lop_tap_huan_validate_to_chuc` vẫn chạy bình thường.
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_tap_huan_tao_lop(TEXT, INTEGER, TEXT, BIGINT, BIGINT, TEXT, BIGINT, JSONB);
DROP FUNCTION IF EXISTS public.rpc_tap_huan_cap_nhat_lop(BIGINT, TEXT, INTEGER, TEXT, BIGINT, BIGINT, TEXT, JSONB);

-- ---------------------------------------------------------------------------
-- Tạo mới
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_tap_huan_tao_lop(
  p_ten_lop_tap_huan TEXT,
  p_nam_tap_huan     INTEGER,
  p_cap_tap_huan     TEXT,
  p_don_vi_id        BIGINT,
  p_to_chuc_id       BIGINT,
  p_ghi_chu          TEXT,
  p_id_nguoi_tao     BIGINT,
  p_chi_tiet         JSONB
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_id BIGINT;
BEGIN
  IF p_chi_tiet IS NULL OR jsonb_array_length(p_chi_tiet) = 0 THEN
    RAISE EXCEPTION 'TAP_HUAN_CHI_TIET_RONG: Lớp tập huấn phải có ít nhất 1 cán bộ tham gia.';
  END IF;

  INSERT INTO public.mttq_lop_tap_huan (
    ten_lop_tap_huan, nam_tap_huan, cap_tap_huan, don_vi_id, to_chuc_id, ghi_chu, id_nguoi_tao
  ) VALUES (
    p_ten_lop_tap_huan, p_nam_tap_huan, p_cap_tap_huan, p_don_vi_id, p_to_chuc_id, p_ghi_chu, p_id_nguoi_tao
  )
  RETURNING id INTO v_id;

  INSERT INTO public.mttq_lop_tap_huan_ct (id_lop_tap_huan, can_bo_id, thuoc_dien)
  SELECT
    v_id,
    (t.line->>'can_bo_id')::BIGINT,
    t.line->>'thuoc_dien'
  FROM jsonb_array_elements(p_chi_tiet) WITH ORDINALITY AS t(line, thu_tu)
  ORDER BY t.thu_tu;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_tap_huan_tao_lop(
  TEXT, INTEGER, TEXT, BIGINT, BIGINT, TEXT, BIGINT, JSONB
) TO authenticated;

-- ---------------------------------------------------------------------------
-- Cập nhật — giữ nguyên id dòng cũ (xoá dòng bị bỏ · sửa dòng giữ lại · chèn dòng mới)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_tap_huan_cap_nhat_lop(
  p_id               BIGINT,
  p_ten_lop_tap_huan TEXT,
  p_nam_tap_huan     INTEGER,
  p_cap_tap_huan     TEXT,
  p_don_vi_id        BIGINT,
  p_to_chuc_id       BIGINT,
  p_ghi_chu          TEXT,
  p_chi_tiet         JSONB
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_dong_la BIGINT;
BEGIN
  IF p_chi_tiet IS NULL OR jsonb_array_length(p_chi_tiet) = 0 THEN
    RAISE EXCEPTION 'TAP_HUAN_CHI_TIET_RONG: Lớp tập huấn phải có ít nhất 1 cán bộ tham gia.';
  END IF;

  UPDATE public.mttq_lop_tap_huan SET
    ten_lop_tap_huan = p_ten_lop_tap_huan,
    nam_tap_huan     = p_nam_tap_huan,
    cap_tap_huan     = p_cap_tap_huan,
    don_vi_id        = p_don_vi_id,
    to_chuc_id       = p_to_chuc_id,
    ghi_chu          = p_ghi_chu
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TAP_HUAN_KHONG_TON_TAI: Không tìm thấy lớp tập huấn %.', p_id;
  END IF;

  SELECT NULLIF(line->>'id', '')::BIGINT INTO v_dong_la
  FROM jsonb_array_elements(p_chi_tiet) AS line
  WHERE NULLIF(line->>'id', '') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.mttq_lop_tap_huan_ct c
      WHERE c.id = NULLIF(line->>'id', '')::BIGINT AND c.id_lop_tap_huan = p_id
    )
  LIMIT 1;

  IF v_dong_la IS NOT NULL THEN
    RAISE EXCEPTION 'TAP_HUAN_DONG_LA: Dòng cán bộ % không thuộc lớp tập huấn %.', v_dong_la, p_id;
  END IF;

  DELETE FROM public.mttq_lop_tap_huan_ct c
  WHERE c.id_lop_tap_huan = p_id
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_chi_tiet) AS line
      WHERE NULLIF(line->>'id', '')::BIGINT = c.id
    );

  UPDATE public.mttq_lop_tap_huan_ct c SET
    can_bo_id  = (l.line->>'can_bo_id')::BIGINT,
    thuoc_dien = l.line->>'thuoc_dien'
  FROM (
    SELECT line FROM jsonb_array_elements(p_chi_tiet) AS line
    WHERE NULLIF(line->>'id', '') IS NOT NULL
  ) AS l
  WHERE c.id_lop_tap_huan = p_id
    AND c.id = NULLIF(l.line->>'id', '')::BIGINT;

  INSERT INTO public.mttq_lop_tap_huan_ct (id_lop_tap_huan, can_bo_id, thuoc_dien)
  SELECT
    p_id,
    (t.line->>'can_bo_id')::BIGINT,
    t.line->>'thuoc_dien'
  FROM jsonb_array_elements(p_chi_tiet) WITH ORDINALITY AS t(line, thu_tu)
  WHERE NULLIF(t.line->>'id', '') IS NULL
  ORDER BY t.thu_tu;

  RETURN p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_tap_huan_cap_nhat_lop(
  BIGINT, TEXT, INTEGER, TEXT, BIGINT, BIGINT, TEXT, JSONB
) TO authenticated;

NOTIFY pgrst, 'reload schema';
