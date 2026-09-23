-- ============================================================================
-- get_ktnt_page — phân trang phía máy chủ cho "Khen thưởng nhà tài trợ".
--
-- Khuôn `get_vnn_page`: COUNT(*) OVER (), p_sort whitelist bằng CASE, ORDER BY
-- kết thúc bằng khoá chính, trả luôn cột hiển thị đã JOIN.
--
-- Cột THÀNH TÍCH (`so_khoan_ho_tro`, `so_nguoi_duoc_ho_tro`, `tong_tien_ho_tro`)
-- tính tại chỗ từ `vnn_chuong_trinh` theo nhà tài trợ và kỳ thành tích — không
-- lưu ở bảng khen thưởng, nên luôn khớp với dữ liệu hỗ trợ đang có.
-- Một người = cùng hộ nghèo, hoặc (khi nhập tay) cùng họ tên + xã — khớp
-- `vnnNguoiNhanKey` ở client.
--
-- Phạm vi xem khớp `canViewKtntRow`: cấp Xã phường chỉ thấy quyết định có
-- `xa_phuong_id` trùng đơn vị mình.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_ktnt_page(
  text, integer, integer, text, boolean, bigint,
  integer[], text[], text[], bigint[], bigint[], text[], jsonb
);

CREATE FUNCTION public.get_ktnt_page(
  p_search              text      DEFAULT NULL,
  p_limit               integer   DEFAULT 100,
  p_offset              integer   DEFAULT 0,
  p_sort                text      DEFAULT NULL,
  p_view_all            boolean   DEFAULT true,
  p_viewer_xa_phuong_id bigint    DEFAULT NULL,
  p_nam                 integer[] DEFAULT NULL,
  p_cap_khen            text[]    DEFAULT NULL,
  p_trang_thai          text[]    DEFAULT NULL,
  p_xa_phuong_ids       bigint[]  DEFAULT NULL,
  p_nha_tai_tro_ids     bigint[]  DEFAULT NULL,
  p_loai_nha_tai_tro    text[]    DEFAULT NULL,
  p_column_search       jsonb     DEFAULT NULL
)
RETURNS TABLE (
  id                       bigint,
  noi_dung_khen            text,
  ngay_khen                date,
  so_quyet_dinh            text,
  cap_khen                 text,
  don_vi_khen              text,
  xa_phuong_id             bigint,
  ten_xa_phuong            text,
  nha_tai_tro_id           bigint,
  ten_nha_tai_tro          text,
  loai_nha_tai_tro         text,
  nam_thanh_tich_tu        integer,
  nam_thanh_tich_den       integer,
  gia_tri_dong_gop_khac    numeric,
  so_khoan_ho_tro          bigint,
  so_nguoi_duoc_ho_tro     bigint,
  tong_tien_ho_tro         numeric,
  tong_gia_tri             numeric,
  trang_thai               text,
  ngay_cap_nhat_trang_thai timestamptz,
  nguoi_duyet_id           bigint,
  ho_va_ten_nguoi_duyet    text,
  tg_duyet                 timestamptz,
  ghi_chu                  text,
  id_nguoi_tao             bigint,
  ho_va_ten_nguoi_tao      text,
  ten_tai_khoan_nguoi_tao  text,
  tg_tao                   timestamptz,
  tg_cap_nhat              timestamptz,
  total_count              bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH src AS (
    SELECT
      t.*,
      xp.ten           AS ten_xa_phuong,
      dv.ten           AS ten_nha_tai_tro,
      dv.loai          AS loai_nha_tai_tro,
      nd.ho_va_ten     AS ho_va_ten_nguoi_duyet,
      nt.ho_va_ten     AS ho_va_ten_nguoi_tao,
      nt.ten_tai_khoan AS ten_tai_khoan_nguoi_tao,
      COALESCE(NULLIF(btrim(nt.ho_va_ten), ''), NULLIF(btrim(nt.ten_tai_khoan), ''), '')
        AS nguoi_tao_display,
      tt.so_khoan_ho_tro,
      tt.so_nguoi_duoc_ho_tro,
      tt.tong_tien_ho_tro,
      tt.tong_tien_ho_tro + COALESCE(t.gia_tri_dong_gop_khac, 0) AS tong_gia_tri
    FROM public.ktnt_khen_thuong_nha_tai_tro t
    LEFT JOIN public.var_ssn_xa_phuong  xp ON xp.id = t.xa_phuong_id
    LEFT JOIN public.kho_don_vi_cuu_tro dv ON dv.id = t.nha_tai_tro_id
    LEFT JOIN public.var_nhan_vien      nd ON nd.id = t.nguoi_duyet_id
    LEFT JOIN public.var_nhan_vien      nt ON nt.id = t.id_nguoi_tao
    CROSS JOIN LATERAL (
      SELECT
        count(*)::bigint AS so_khoan_ho_tro,
        count(DISTINCT COALESCE(
          'ho:' || v.ho_ngheo_id::text,
          'ten:' || lower(regexp_replace(btrim(v.ho_ten_nguoi_nhan), '\s+', ' ', 'g'))
            || '|' || COALESCE(v.xa_phuong_id::text, '')
        ))::bigint AS so_nguoi_duoc_ho_tro,
        COALESCE(sum(v.so_tien), 0)::numeric AS tong_tien_ho_tro
      FROM public.vnn_chuong_trinh v
      WHERE v.don_vi_ho_tro_id = t.nha_tai_tro_id
        AND (t.nam_thanh_tich_tu  IS NULL OR v.nam >= t.nam_thanh_tich_tu)
        AND (t.nam_thanh_tich_den IS NULL OR v.nam <= t.nam_thanh_tich_den)
    ) tt
  )
  SELECT
    s.id, s.noi_dung_khen, s.ngay_khen, s.so_quyet_dinh, s.cap_khen, s.don_vi_khen,
    s.xa_phuong_id, s.ten_xa_phuong, s.nha_tai_tro_id, s.ten_nha_tai_tro, s.loai_nha_tai_tro,
    s.nam_thanh_tich_tu, s.nam_thanh_tich_den, s.gia_tri_dong_gop_khac,
    s.so_khoan_ho_tro, s.so_nguoi_duoc_ho_tro, s.tong_tien_ho_tro, s.tong_gia_tri,
    s.trang_thai, s.ngay_cap_nhat_trang_thai, s.nguoi_duyet_id, s.ho_va_ten_nguoi_duyet, s.tg_duyet,
    s.ghi_chu, s.id_nguoi_tao, s.ho_va_ten_nguoi_tao, s.ten_tai_khoan_nguoi_tao,
    s.tg_tao, s.tg_cap_nhat,
    COUNT(*) OVER () AS total_count
  FROM src s
  WHERE (
      p_search IS NULL
      OR s.noi_dung_khen   ILIKE '%' || p_search || '%'
      OR s.so_quyet_dinh   ILIKE '%' || p_search || '%'
      OR s.don_vi_khen     ILIKE '%' || p_search || '%'
      OR s.ten_nha_tai_tro ILIKE '%' || p_search || '%'
      OR s.ten_xa_phuong   ILIKE '%' || p_search || '%'
      OR s.ghi_chu         ILIKE '%' || p_search || '%'
    )
    -- KHÔNG nới lỏng khi thiếu đơn vị: cán bộ cấp Xã phường chưa gán đơn vị thấy RỖNG.
    AND (COALESCE(p_view_all, true) OR s.xa_phuong_id = p_viewer_xa_phuong_id)
    AND (p_nam              IS NULL OR cardinality(p_nam)              = 0 OR extract(year FROM s.ngay_khen)::int = ANY (p_nam))
    AND (p_cap_khen         IS NULL OR cardinality(p_cap_khen)         = 0 OR s.cap_khen         = ANY (p_cap_khen))
    AND (p_trang_thai       IS NULL OR cardinality(p_trang_thai)       = 0 OR s.trang_thai       = ANY (p_trang_thai))
    AND (p_xa_phuong_ids    IS NULL OR cardinality(p_xa_phuong_ids)    = 0 OR s.xa_phuong_id     = ANY (p_xa_phuong_ids))
    AND (p_nha_tai_tro_ids  IS NULL OR cardinality(p_nha_tai_tro_ids)  = 0 OR s.nha_tai_tro_id   = ANY (p_nha_tai_tro_ids))
    AND (p_loai_nha_tai_tro IS NULL OR cardinality(p_loai_nha_tai_tro) = 0 OR s.loai_nha_tai_tro = ANY (p_loai_nha_tai_tro))
    AND (nullif(btrim(coalesce(p_column_search->>'noi_dung_khen','')),'') IS NULL
         OR s.noi_dung_khen ILIKE '%'||btrim(p_column_search->>'noi_dung_khen')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'so_quyet_dinh','')),'') IS NULL
         OR s.so_quyet_dinh ILIKE '%'||btrim(p_column_search->>'so_quyet_dinh')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'cap_khen','')),'') IS NULL
         OR s.cap_khen ILIKE '%'||btrim(p_column_search->>'cap_khen')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'don_vi_khen','')),'') IS NULL
         OR s.don_vi_khen ILIKE '%'||btrim(p_column_search->>'don_vi_khen')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_xa_phuong','')),'') IS NULL
         OR s.ten_xa_phuong ILIKE '%'||btrim(p_column_search->>'ten_xa_phuong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_nha_tai_tro','')),'') IS NULL
         OR s.ten_nha_tai_tro ILIKE '%'||btrim(p_column_search->>'ten_nha_tai_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'loai_nha_tai_tro','')),'') IS NULL
         OR s.loai_nha_tai_tro ILIKE '%'||btrim(p_column_search->>'loai_nha_tai_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'trang_thai','')),'') IS NULL
         OR s.trang_thai ILIKE '%'||btrim(p_column_search->>'trang_thai')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ghi_chu','')),'') IS NULL
         OR s.ghi_chu ILIKE '%'||btrim(p_column_search->>'ghi_chu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ngay_khen','')),'') IS NULL
         OR to_char(s.ngay_khen, 'DD/MM/YYYY') ILIKE '%'||btrim(p_column_search->>'ngay_khen')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ngay_cap_nhat_trang_thai','')),'') IS NULL
         OR to_char(s.ngay_cap_nhat_trang_thai, 'DD/MM/YYYY') ILIKE '%'||btrim(p_column_search->>'ngay_cap_nhat_trang_thai')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tg_cap_nhat','')),'') IS NULL
         OR to_char(s.tg_cap_nhat, 'DD/MM/YYYY') ILIKE '%'||btrim(p_column_search->>'tg_cap_nhat')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tong_gia_tri','')),'') IS NULL
         OR s.tong_gia_tri::text ILIKE '%'||btrim(p_column_search->>'tong_gia_tri')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'so_nguoi_duoc_ho_tro','')),'') IS NULL
         OR s.so_nguoi_duoc_ho_tro::text ILIKE '%'||btrim(p_column_search->>'so_nguoi_duoc_ho_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ho_va_ten_nguoi_duyet','')),'') IS NULL
         OR s.ho_va_ten_nguoi_duyet ILIKE '%'||btrim(p_column_search->>'ho_va_ten_nguoi_duyet')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ho_va_ten_nguoi_tao','')),'') IS NULL
         OR s.nguoi_tao_display ILIKE '%'||btrim(p_column_search->>'ho_va_ten_nguoi_tao')||'%')
  ORDER BY
    CASE WHEN p_sort = 'ngay_khen_asc' THEN s.ngay_khen END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ngay_khen_desc' THEN s.ngay_khen END DESC NULLS LAST,
    CASE WHEN p_sort = 'noi_dung_khen_asc' THEN s.noi_dung_khen END ASC  NULLS LAST,
    CASE WHEN p_sort = 'noi_dung_khen_desc' THEN s.noi_dung_khen END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_quyet_dinh_asc' THEN s.so_quyet_dinh END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_quyet_dinh_desc' THEN s.so_quyet_dinh END DESC NULLS LAST,
    CASE WHEN p_sort = 'cap_khen_asc' THEN s.cap_khen END ASC  NULLS LAST,
    CASE WHEN p_sort = 'cap_khen_desc' THEN s.cap_khen END DESC NULLS LAST,
    CASE WHEN p_sort = 'don_vi_khen_asc' THEN s.don_vi_khen END ASC  NULLS LAST,
    CASE WHEN p_sort = 'don_vi_khen_desc' THEN s.don_vi_khen END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_xa_phuong_asc' THEN s.ten_xa_phuong END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_xa_phuong_desc' THEN s.ten_xa_phuong END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_nha_tai_tro_asc' THEN s.ten_nha_tai_tro END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_nha_tai_tro_desc' THEN s.ten_nha_tai_tro END DESC NULLS LAST,
    CASE WHEN p_sort = 'loai_nha_tai_tro_asc' THEN s.loai_nha_tai_tro END ASC  NULLS LAST,
    CASE WHEN p_sort = 'loai_nha_tai_tro_desc' THEN s.loai_nha_tai_tro END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_khoan_ho_tro_asc' THEN s.so_khoan_ho_tro END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_khoan_ho_tro_desc' THEN s.so_khoan_ho_tro END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_nguoi_duoc_ho_tro_asc' THEN s.so_nguoi_duoc_ho_tro END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_nguoi_duoc_ho_tro_desc' THEN s.so_nguoi_duoc_ho_tro END DESC NULLS LAST,
    CASE WHEN p_sort = 'tong_tien_ho_tro_asc' THEN s.tong_tien_ho_tro END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tong_tien_ho_tro_desc' THEN s.tong_tien_ho_tro END DESC NULLS LAST,
    CASE WHEN p_sort = 'tong_gia_tri_asc' THEN s.tong_gia_tri END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tong_gia_tri_desc' THEN s.tong_gia_tri END DESC NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_asc' THEN s.trang_thai END ASC  NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_desc' THEN s.trang_thai END DESC NULLS LAST,
    CASE WHEN p_sort = 'ngay_cap_nhat_trang_thai_asc' THEN s.ngay_cap_nhat_trang_thai END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ngay_cap_nhat_trang_thai_desc' THEN s.ngay_cap_nhat_trang_thai END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_duyet_asc' THEN s.ho_va_ten_nguoi_duyet END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_duyet_desc' THEN s.ho_va_ten_nguoi_duyet END DESC NULLS LAST,
    CASE WHEN p_sort = 'ghi_chu_asc' THEN s.ghi_chu END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ghi_chu_desc' THEN s.ghi_chu END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_asc' THEN s.nguoi_tao_display END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_desc' THEN s.nguoi_tao_display END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_asc' THEN s.tg_cap_nhat END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_desc' THEN s.tg_cap_nhat END DESC NULLS LAST,
    -- Mặc định: ngày khen mới nhất lên trước. BẮT BUỘC kết thúc bằng khoá chính.
    s.ngay_khen DESC, s.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$;

GRANT EXECUTE ON FUNCTION public.get_ktnt_page(
  text, integer, integer, text, boolean, bigint,
  integer[], text[], text[], bigint[], bigint[], text[], jsonb
) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
