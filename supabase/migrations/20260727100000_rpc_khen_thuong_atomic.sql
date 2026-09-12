-- ============================================================================
-- Khen thưởng: ghi cha + dòng con trong MỘT transaction (mẫu: rpc_kho_*)
--
-- Trước đây client ghi nhiều lượt rời rạc: insert cha → xoá con → update từng
-- dòng → insert con. Lỗi giữa chừng để lại quyết định rỗng hoặc mất dòng cũ.
-- Mỗi lời gọi plpgsql là một transaction ngầm ⇒ lỗi bất kỳ chỗ nào là rollback
-- toàn bộ.
--
-- Trigger `tg_gan_id_nguoi_tao_mttq_khen_thuong` (BEFORE INSERT) vẫn chạy và
-- vẫn ghi đè `id_nguoi_tao` theo phiên đăng nhập — RPC chỉ truyền giá trị dự
-- phòng cho trường NOT NULL.
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_khen_thuong_tao_quyet_dinh(TEXT, DATE, TEXT, TEXT, TEXT, BIGINT, JSONB);
DROP FUNCTION IF EXISTS public.rpc_khen_thuong_cap_nhat_quyet_dinh(BIGINT, TEXT, DATE, TEXT, TEXT, TEXT, JSONB);

-- ---------------------------------------------------------------------------
-- Tạo mới
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_khen_thuong_tao_quyet_dinh(
  p_so_qd            TEXT,
  p_ngay_khen_thuong DATE,
  p_don_vi_de_xuat   TEXT,
  p_ghi_chu          TEXT,
  p_trang_thai       TEXT,
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
    RAISE EXCEPTION 'KHEN_THUONG_CHI_TIET_RONG: Quyết định khen thưởng phải có ít nhất 1 cán bộ được khen.';
  END IF;

  INSERT INTO public.mttq_khen_thuong (
    so_qd, ngay_khen_thuong, don_vi_de_xuat, ghi_chu, trang_thai, id_nguoi_tao
  ) VALUES (
    p_so_qd, p_ngay_khen_thuong, p_don_vi_de_xuat, p_ghi_chu, p_trang_thai, p_id_nguoi_tao
  )
  RETURNING id INTO v_id;

  INSERT INTO public.mttq_khen_thuong_ct
    (id_khen_thuong, can_bo_id, cap_khen_thuong, hinh_thuc_khen, danh_hieu, noi_dung_khen, ho_so_khen)
  SELECT
    v_id,
    (line->>'can_bo_id')::BIGINT,
    line->>'cap_khen_thuong',
    line->>'hinh_thuc_khen',
    line->>'danh_hieu',
    NULLIF(line->>'noi_dung_khen', ''),
    NULLIF(line->>'ho_so_khen', '')
  FROM jsonb_array_elements(p_chi_tiet) WITH ORDINALITY AS t(line, thu_tu)
  ORDER BY t.thu_tu;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_khen_thuong_tao_quyet_dinh(
  TEXT, DATE, TEXT, TEXT, TEXT, BIGINT, JSONB
) TO authenticated;

-- ---------------------------------------------------------------------------
-- Cập nhật — giữ nguyên id dòng cũ (xoá dòng bị bỏ · sửa dòng giữ lại · chèn dòng mới)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_khen_thuong_cap_nhat_quyet_dinh(
  p_id               BIGINT,
  p_so_qd            TEXT,
  p_ngay_khen_thuong DATE,
  p_don_vi_de_xuat   TEXT,
  p_ghi_chu          TEXT,
  p_trang_thai       TEXT,
  p_chi_tiet         JSONB
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_dong_la BIGINT;
BEGIN
  IF p_chi_tiet IS NULL OR jsonb_array_length(p_chi_tiet) = 0 THEN
    RAISE EXCEPTION 'KHEN_THUONG_CHI_TIET_RONG: Quyết định khen thưởng phải có ít nhất 1 cán bộ được khen.';
  END IF;

  UPDATE public.mttq_khen_thuong SET
    so_qd            = p_so_qd,
    ngay_khen_thuong = p_ngay_khen_thuong,
    don_vi_de_xuat   = p_don_vi_de_xuat,
    ghi_chu          = p_ghi_chu,
    trang_thai       = p_trang_thai
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'KHEN_THUONG_KHONG_TON_TAI: Không tìm thấy quyết định khen thưởng %.', p_id;
  END IF;

  -- Dòng cũ client gửi lên phải đúng là dòng của quyết định này.
  SELECT NULLIF(line->>'id', '')::BIGINT INTO v_dong_la
  FROM jsonb_array_elements(p_chi_tiet) AS line
  WHERE NULLIF(line->>'id', '') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.mttq_khen_thuong_ct c
      WHERE c.id = NULLIF(line->>'id', '')::BIGINT AND c.id_khen_thuong = p_id
    )
  LIMIT 1;

  IF v_dong_la IS NOT NULL THEN
    RAISE EXCEPTION 'KHEN_THUONG_DONG_LA: Dòng chi tiết % không thuộc quyết định %.', v_dong_la, p_id;
  END IF;

  DELETE FROM public.mttq_khen_thuong_ct c
  WHERE c.id_khen_thuong = p_id
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_chi_tiet) AS line
      WHERE NULLIF(line->>'id', '')::BIGINT = c.id
    );

  UPDATE public.mttq_khen_thuong_ct c SET
    can_bo_id       = (l.line->>'can_bo_id')::BIGINT,
    cap_khen_thuong = l.line->>'cap_khen_thuong',
    hinh_thuc_khen  = l.line->>'hinh_thuc_khen',
    danh_hieu       = l.line->>'danh_hieu',
    noi_dung_khen   = NULLIF(l.line->>'noi_dung_khen', ''),
    ho_so_khen      = NULLIF(l.line->>'ho_so_khen', '')
  FROM (
    SELECT line FROM jsonb_array_elements(p_chi_tiet) AS line
    WHERE NULLIF(line->>'id', '') IS NOT NULL
  ) AS l
  WHERE c.id_khen_thuong = p_id
    AND c.id = NULLIF(l.line->>'id', '')::BIGINT;

  INSERT INTO public.mttq_khen_thuong_ct
    (id_khen_thuong, can_bo_id, cap_khen_thuong, hinh_thuc_khen, danh_hieu, noi_dung_khen, ho_so_khen)
  SELECT
    p_id,
    (t.line->>'can_bo_id')::BIGINT,
    t.line->>'cap_khen_thuong',
    t.line->>'hinh_thuc_khen',
    t.line->>'danh_hieu',
    NULLIF(t.line->>'noi_dung_khen', ''),
    NULLIF(t.line->>'ho_so_khen', '')
  FROM jsonb_array_elements(p_chi_tiet) WITH ORDINALITY AS t(line, thu_tu)
  WHERE NULLIF(t.line->>'id', '') IS NULL
  ORDER BY t.thu_tu;

  RETURN p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_khen_thuong_cap_nhat_quyet_dinh(
  BIGINT, TEXT, DATE, TEXT, TEXT, TEXT, JSONB
) TO authenticated;

NOTIFY pgrst, 'reload schema';
