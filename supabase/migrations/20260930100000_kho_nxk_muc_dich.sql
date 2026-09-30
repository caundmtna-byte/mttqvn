-- Nhập xuất kho: trường "Mục đích" của phiếu.
--   · Phiếu xuất có hai mục đích gợi ý sẵn ("Để tại kho dùng khi cần",
--     "Xuất cho hộ nghèo"); mọi loại phiếu đều cho gõ mục đích mới — lưu TEXT tự do.
--   · Gợi ý lặp lại lấy từ các mục đích đã dùng (RPC get_kho_nxk_muc_dich_goi_y).

ALTER TABLE public.kho_nhap_xuat_kho
  ADD COLUMN IF NOT EXISTS muc_dich TEXT;

ALTER TABLE public.kho_nhap_xuat_kho
  DROP CONSTRAINT IF EXISTS kho_nhap_xuat_kho_muc_dich_len_chk;
ALTER TABLE public.kho_nhap_xuat_kho
  ADD CONSTRAINT kho_nhap_xuat_kho_muc_dich_len_chk CHECK (muc_dich IS NULL OR char_length(muc_dich) <= 500);

COMMENT ON COLUMN public.kho_nhap_xuat_kho.muc_dich IS 'Mục đích nhập/xuất — chữ tự do, có gợi ý theo loại phiếu.';

-- ---------------------------------------------------------------------------
-- Hai RPC ghi phiếu: thân giữ nguyên bản 20260719100100, thêm p_muc_dich.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.rpc_kho_tao_phieu_nhap_xuat(TEXT, DATE, BIGINT, BIGINT, BIGINT, BIGINT, TEXT, TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.rpc_kho_cap_nhat_phieu_nhap_xuat(BIGINT, TEXT, DATE, BIGINT, BIGINT, BIGINT, BIGINT, TEXT, TEXT, TEXT, TEXT, JSONB);

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
  p_muc_dich          TEXT,
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
    chung_tu_goc,
    muc_dich
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
    NULLIF(trim(p_chung_tu_goc), ''),
    NULLIF(trim(p_muc_dich), '')
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
  TEXT, DATE, BIGINT, BIGINT, BIGINT, BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB
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
  p_muc_dich          TEXT,
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
    chung_tu_goc      = NULLIF(trim(p_chung_tu_goc), ''),
    muc_dich          = NULLIF(trim(p_muc_dich), '')
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
  BIGINT, TEXT, DATE, BIGINT, BIGINT, BIGINT, BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB
) TO authenticated;

-- ---------------------------------------------------------------------------
-- get_kho_nhap_xuat_kho_page: thân giữ nguyên bản 20260923104000, thêm muc_dich
-- (đổi kiểu trả về ⇒ DROP rồi CREATE).
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_kho_nhap_xuat_kho_page(
  text, integer, integer, text, boolean, bigint, text, bigint, bigint, bigint, jsonb
);

CREATE FUNCTION public.get_kho_nhap_xuat_kho_page(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_sort text DEFAULT NULL::text, p_view_all boolean DEFAULT true, p_viewer_don_vi_id bigint DEFAULT NULL::bigint, p_loai_phieu text DEFAULT NULL::text, p_kho_id bigint DEFAULT NULL::bigint, p_don_vi_cuu_tro_id bigint DEFAULT NULL::bigint, p_dot_cuu_tro_id bigint DEFAULT NULL::bigint, p_column_search jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(id bigint, tt integer, so_phieu text, loai_phieu text, ngay_phieu date, kho_xuat_id bigint, ten_kho_xuat text, kho_xuat_don_vi_id bigint, kho_nhap_id bigint, ten_kho_nhap text, kho_nhap_don_vi_id bigint, don_vi_cuu_tro_id bigint, ten_don_vi_cuu_tro text, dot_cuu_tro_id bigint, ten_dot_cuu_tro text, muc_dich text, so_dong bigint, id_nguoi_tao bigint, ho_va_ten_nguoi_tao text, tg_tao timestamp with time zone, tg_cap_nhat timestamp with time zone, total_count bigint)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT
    p.id, p.tt, p.so_phieu, p.loai_phieu, p.ngay_phieu,
    p.kho_xuat_id, kx.ten_kho AS ten_kho_xuat, kx.don_vi_id AS kho_xuat_don_vi_id,
    p.kho_nhap_id, kn.ten_kho AS ten_kho_nhap, kn.don_vi_id AS kho_nhap_don_vi_id,
    p.don_vi_cuu_tro_id, dv.ten AS ten_don_vi_cuu_tro,
    p.dot_cuu_tro_id,    dt.ten AS ten_dot_cuu_tro,
    p.muc_dich,
    COALESCE(ct.so_dong, 0) AS so_dong,
    p.id_nguoi_tao,
    COALESCE(NULLIF(btrim(nt.ho_va_ten), ''), NULLIF(btrim(nt.ten_tai_khoan), '')) AS ho_va_ten_nguoi_tao,
    p.tg_tao, p.tg_cap_nhat,
    COUNT(*) OVER () AS total_count
  FROM public.kho_nhap_xuat_kho p
  LEFT JOIN public.kho_danh_sach_kho  kx ON kx.id = p.kho_xuat_id
  LEFT JOIN public.kho_danh_sach_kho  kn ON kn.id = p.kho_nhap_id
  LEFT JOIN public.kho_don_vi_cuu_tro dv ON dv.id = p.don_vi_cuu_tro_id
  LEFT JOIN public.kho_dot_cuu_tro    dt ON dt.id = p.dot_cuu_tro_id
  LEFT JOIN public.var_nhan_vien      nt ON nt.id = p.id_nguoi_tao
  LEFT JOIN LATERAL (
    SELECT count(*) AS so_dong
    FROM public.kho_nhap_xuat_kho_ct c
    WHERE c.phieu_id = p.id
  ) ct ON true
  WHERE (
      p_search IS NULL
      OR public.fn_chuan_hoa_tim_kiem(concat_ws(' ',
        p.tt::text,
        p.so_phieu,
        CASE p.loai_phieu WHEN 'nhap_ngoai' THEN 'Nhập từ ngoài' WHEN 'xuat_ngoai' THEN 'Xuất ra ngoài' WHEN 'chuyen_kho' THEN 'Chuyển kho' END,
        p.ngay_phieu::text,
        to_char(p.ngay_phieu, 'DD/MM/YYYY'),
        kx.ten_kho,
        kn.ten_kho,
        dv.ten,
        dt.ten,
        p.muc_dich,
        COALESCE(ct.so_dong, 0)::text,
        nt.ho_va_ten,
        nt.ten_tai_khoan,
        to_char(p.tg_cap_nhat AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI')
      )) LIKE public.fn_mau_tim_kiem(p_search)
    )
    AND (
      -- KHÔNG nới lỏng khi thiếu đơn vị: cán bộ cấp Xã phường chưa được gán
      -- đơn vị phải thấy RỖNG, đúng như canViewNhapXuatKhoRow ở client.
      COALESCE(p_view_all, true)
      OR kx.don_vi_id = p_viewer_don_vi_id
      OR kn.don_vi_id = p_viewer_don_vi_id
    )
    AND (p_loai_phieu        IS NULL OR p.loai_phieu = p_loai_phieu)
    AND (p_kho_id            IS NULL OR p.kho_xuat_id = p_kho_id OR p.kho_nhap_id = p_kho_id)
    AND (p_don_vi_cuu_tro_id IS NULL OR p.don_vi_cuu_tro_id = p_don_vi_cuu_tro_id)
    AND (p_dot_cuu_tro_id    IS NULL OR p.dot_cuu_tro_id = p_dot_cuu_tro_id)
    -- Tìm theo từng cột. Ô trống/thiếu khoá ⇒ không lọc cột đó.
    AND (nullif(btrim(coalesce(p_column_search->>'tt','')),'') IS NULL
         OR p.tt::text ILIKE '%'||btrim(p_column_search->>'tt')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'so_phieu','')),'') IS NULL
         OR p.so_phieu ILIKE '%'||btrim(p_column_search->>'so_phieu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'loai_phieu','')),'') IS NULL
         OR p.loai_phieu ILIKE '%'||btrim(p_column_search->>'loai_phieu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ngay_phieu','')),'') IS NULL
         OR p.ngay_phieu::text ILIKE '%'||btrim(p_column_search->>'ngay_phieu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_kho_xuat','')),'') IS NULL
         OR kx.ten_kho ILIKE '%'||btrim(p_column_search->>'ten_kho_xuat')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_kho_nhap','')),'') IS NULL
         OR kn.ten_kho ILIKE '%'||btrim(p_column_search->>'ten_kho_nhap')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_don_vi_cuu_tro','')),'') IS NULL
         OR dv.ten ILIKE '%'||btrim(p_column_search->>'ten_don_vi_cuu_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_dot_cuu_tro','')),'') IS NULL
         OR dt.ten ILIKE '%'||btrim(p_column_search->>'ten_dot_cuu_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'muc_dich','')),'') IS NULL
         OR p.muc_dich ILIKE '%'||btrim(p_column_search->>'muc_dich')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ho_va_ten_nguoi_tao','')),'') IS NULL
         OR COALESCE(nt.ho_va_ten, nt.ten_tai_khoan) ILIKE '%'||btrim(p_column_search->>'ho_va_ten_nguoi_tao')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'so_dong','')),'') IS NULL
         OR COALESCE(ct.so_dong, 0)::text ILIKE '%'||btrim(p_column_search->>'so_dong')||'%')
    -- Cột thời gian: người dùng gõ ngày, nên so theo YYYY-MM-DD.
    AND (nullif(btrim(coalesce(p_column_search->>'tg_tao','')),'') IS NULL
         OR to_char(p.tg_tao, 'YYYY-MM-DD') ILIKE '%'||btrim(p_column_search->>'tg_tao')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tg_cap_nhat','')),'') IS NULL
         OR to_char(p.tg_cap_nhat, 'YYYY-MM-DD') ILIKE '%'||btrim(p_column_search->>'tg_cap_nhat')||'%')
  ORDER BY
    CASE WHEN p_sort = 'tt_asc'                  THEN p.tt              END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tt_desc'                 THEN p.tt              END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_phieu_asc'            THEN p.so_phieu        END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_phieu_desc'           THEN p.so_phieu        END DESC NULLS LAST,
    CASE WHEN p_sort = 'loai_phieu_asc'          THEN p.loai_phieu      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'loai_phieu_desc'         THEN p.loai_phieu      END DESC NULLS LAST,
    CASE WHEN p_sort = 'ngay_phieu_asc'          THEN p.ngay_phieu      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ngay_phieu_desc'         THEN p.ngay_phieu      END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_kho_xuat_asc'        THEN kx.ten_kho        END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_kho_xuat_desc'       THEN kx.ten_kho        END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_kho_nhap_asc'        THEN kn.ten_kho        END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_kho_nhap_desc'       THEN kn.ten_kho        END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_don_vi_cuu_tro_asc'  THEN dv.ten            END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_don_vi_cuu_tro_desc' THEN dv.ten            END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_dot_cuu_tro_asc'     THEN dt.ten            END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_dot_cuu_tro_desc'    THEN dt.ten            END DESC NULLS LAST,
    CASE WHEN p_sort = 'muc_dich_asc'            THEN p.muc_dich        END ASC  NULLS LAST,
    CASE WHEN p_sort = 'muc_dich_desc'           THEN p.muc_dich        END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_dong_asc'             THEN COALESCE(ct.so_dong, 0) END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_dong_desc'            THEN COALESCE(ct.so_dong, 0) END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_asc'  THEN nt.ho_va_ten      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_desc' THEN nt.ho_va_ten      END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_tao_asc'              THEN p.tg_tao          END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_tao_desc'             THEN p.tg_tao          END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_asc'         THEN p.tg_cap_nhat     END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_desc'        THEN p.tg_cap_nhat     END DESC NULLS LAST,
    p.ngay_phieu DESC NULLS LAST, p.so_phieu DESC NULLS LAST, p.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$function$;

GRANT EXECUTE ON FUNCTION public.get_kho_nhap_xuat_kho_page(
  text, integer, integer, text, boolean, bigint, text, bigint, bigint, bigint, jsonb
) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Gợi ý mục đích đã dùng theo loại phiếu — DISTINCT ở DB để egress nhỏ.
-- SECURITY INVOKER: chỉ thấy mục đích trên các phiếu người gọi đọc được.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_kho_nxk_muc_dich_goi_y(p_loai_phieu text)
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT DISTINCT btrim(p.muc_dich)
  FROM public.kho_nhap_xuat_kho p
  WHERE p.loai_phieu = p_loai_phieu
    AND p.muc_dich IS NOT NULL
    AND btrim(p.muc_dich) <> ''
  ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_kho_nxk_muc_dich_goi_y(text) TO authenticated;

NOTIFY pgrst, 'reload schema';
