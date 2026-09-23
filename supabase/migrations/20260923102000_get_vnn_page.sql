-- ============================================================================
-- get_vnn_page — phân trang phía máy chủ cho "Chương trình vì người nghèo".
--
-- Theo khuôn `get_nddk_page`: COUNT(*) OVER () cho tổng, p_sort whitelist bằng
-- CASE, ORDER BY kết thúc bằng khoá chính, trả luôn cột hiển thị đã LEFT JOIN
-- (tên xã, tên đơn vị hỗ trợ, tên người tạo) ⇒ một request mỗi lần đổi trang.
--
-- Phạm vi xem khớp `canViewVnnRow` ở client: cấp Xã phường chỉ thấy dòng có
-- `xa_phuong_id` trùng đơn vị mình.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_vnn_page(
  text, integer, integer, text, boolean, bigint,
  integer[], text[], text[], text[], text[], text[], text[], bigint[], jsonb
);

CREATE FUNCTION public.get_vnn_page(
  p_search              text      DEFAULT NULL,
  p_limit               integer   DEFAULT 100,
  p_offset              integer   DEFAULT 0,
  p_sort                text      DEFAULT NULL,
  p_view_all            boolean   DEFAULT true,
  p_viewer_xa_phuong_id bigint    DEFAULT NULL,
  p_nam                 integer[] DEFAULT NULL,
  p_linh_vuc            text[]    DEFAULT NULL,
  p_nguon               text[]    DEFAULT NULL,
  p_nguon_ho_tro        text[]    DEFAULT NULL,
  p_doi_tuong           text[]    DEFAULT NULL,
  p_hinh_thuc           text[]    DEFAULT NULL,
  p_trang_thai          text[]    DEFAULT NULL,
  p_xa_phuong_ids       bigint[]  DEFAULT NULL,
  p_column_search       jsonb     DEFAULT NULL
)
RETURNS TABLE (
  id                       bigint,
  noi_dung_ho_tro          text,
  nam                      integer,
  linh_vuc_ho_tro          text,
  nguon                    text,
  nguon_ho_tro             text,
  ho_ngheo_id              bigint,
  ho_ten_nguoi_nhan        text,
  xa_phuong_id             bigint,
  ten_xa_phuong            text,
  khoi_xom                 text,
  doi_tuong                text,
  hinh_thuc_ho_tro         text,
  so_tien                  numeric,
  trang_thai               text,
  ngay_cap_nhat_trang_thai timestamptz,
  don_vi_ho_tro_id         bigint,
  ten_don_vi_ho_tro        text,
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
      dv.ten           AS ten_don_vi_ho_tro,
      nt.ho_va_ten     AS ho_va_ten_nguoi_tao,
      nt.ten_tai_khoan AS ten_tai_khoan_nguoi_tao,
      COALESCE(NULLIF(btrim(nt.ho_va_ten), ''), NULLIF(btrim(nt.ten_tai_khoan), ''), '')
        AS nguoi_tao_display
    FROM public.vnn_chuong_trinh t
    LEFT JOIN public.var_ssn_xa_phuong  xp ON xp.id = t.xa_phuong_id
    LEFT JOIN public.kho_don_vi_cuu_tro dv ON dv.id = t.don_vi_ho_tro_id
    LEFT JOIN public.var_nhan_vien      nt ON nt.id = t.id_nguoi_tao
  )
  SELECT
    s.id, s.noi_dung_ho_tro, s.nam, s.linh_vuc_ho_tro, s.nguon, s.nguon_ho_tro,
    s.ho_ngheo_id, s.ho_ten_nguoi_nhan, s.xa_phuong_id, s.ten_xa_phuong, s.khoi_xom,
    s.doi_tuong, s.hinh_thuc_ho_tro, s.so_tien, s.trang_thai, s.ngay_cap_nhat_trang_thai,
    s.don_vi_ho_tro_id, s.ten_don_vi_ho_tro, s.ghi_chu,
    s.id_nguoi_tao, s.ho_va_ten_nguoi_tao, s.ten_tai_khoan_nguoi_tao,
    s.tg_tao, s.tg_cap_nhat,
    COUNT(*) OVER () AS total_count
  FROM src s
  WHERE (
      p_search IS NULL
      OR s.noi_dung_ho_tro   ILIKE '%' || p_search || '%'
      OR s.ho_ten_nguoi_nhan ILIKE '%' || p_search || '%'
      OR s.ten_xa_phuong     ILIKE '%' || p_search || '%'
      OR s.khoi_xom          ILIKE '%' || p_search || '%'
      OR s.ten_don_vi_ho_tro ILIKE '%' || p_search || '%'
      OR s.ghi_chu           ILIKE '%' || p_search || '%'
      OR s.nam::text         ILIKE '%' || p_search || '%'
    )
    -- KHÔNG nới lỏng khi thiếu đơn vị: cán bộ cấp Xã phường chưa được gán đơn vị
    -- phải thấy RỖNG, đúng như canViewVnnRow ở client.
    AND (
      COALESCE(p_view_all, true)
      OR s.xa_phuong_id = p_viewer_xa_phuong_id
    )
    AND (p_nam           IS NULL OR cardinality(p_nam)           = 0 OR s.nam              = ANY (p_nam))
    AND (p_linh_vuc      IS NULL OR cardinality(p_linh_vuc)      = 0 OR s.linh_vuc_ho_tro  = ANY (p_linh_vuc))
    AND (p_nguon         IS NULL OR cardinality(p_nguon)         = 0 OR s.nguon            = ANY (p_nguon))
    AND (p_nguon_ho_tro  IS NULL OR cardinality(p_nguon_ho_tro)  = 0 OR s.nguon_ho_tro     = ANY (p_nguon_ho_tro))
    AND (p_doi_tuong     IS NULL OR cardinality(p_doi_tuong)     = 0 OR s.doi_tuong        = ANY (p_doi_tuong))
    AND (p_hinh_thuc     IS NULL OR cardinality(p_hinh_thuc)     = 0 OR s.hinh_thuc_ho_tro = ANY (p_hinh_thuc))
    AND (p_trang_thai    IS NULL OR cardinality(p_trang_thai)    = 0 OR s.trang_thai       = ANY (p_trang_thai))
    AND (p_xa_phuong_ids IS NULL OR cardinality(p_xa_phuong_ids) = 0 OR s.xa_phuong_id     = ANY (p_xa_phuong_ids))
    -- Tìm theo từng cột: so khớp trên ĐÚNG chuỗi hiển thị của cột đó.
    AND (nullif(btrim(coalesce(p_column_search->>'nam','')),'') IS NULL
         OR s.nam::text ILIKE '%'||btrim(p_column_search->>'nam')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'noi_dung_ho_tro','')),'') IS NULL
         OR s.noi_dung_ho_tro ILIKE '%'||btrim(p_column_search->>'noi_dung_ho_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'linh_vuc_ho_tro','')),'') IS NULL
         OR s.linh_vuc_ho_tro ILIKE '%'||btrim(p_column_search->>'linh_vuc_ho_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'nguon','')),'') IS NULL
         OR s.nguon ILIKE '%'||btrim(p_column_search->>'nguon')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'nguon_ho_tro','')),'') IS NULL
         OR s.nguon_ho_tro ILIKE '%'||btrim(p_column_search->>'nguon_ho_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ho_ten_nguoi_nhan','')),'') IS NULL
         OR s.ho_ten_nguoi_nhan ILIKE '%'||btrim(p_column_search->>'ho_ten_nguoi_nhan')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_xa_phuong','')),'') IS NULL
         OR s.ten_xa_phuong ILIKE '%'||btrim(p_column_search->>'ten_xa_phuong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'khoi_xom','')),'') IS NULL
         OR s.khoi_xom ILIKE '%'||btrim(p_column_search->>'khoi_xom')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'doi_tuong','')),'') IS NULL
         OR s.doi_tuong ILIKE '%'||btrim(p_column_search->>'doi_tuong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'hinh_thuc_ho_tro','')),'') IS NULL
         OR s.hinh_thuc_ho_tro ILIKE '%'||btrim(p_column_search->>'hinh_thuc_ho_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'trang_thai','')),'') IS NULL
         OR s.trang_thai ILIKE '%'||btrim(p_column_search->>'trang_thai')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_don_vi_ho_tro','')),'') IS NULL
         OR s.ten_don_vi_ho_tro ILIKE '%'||btrim(p_column_search->>'ten_don_vi_ho_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ghi_chu','')),'') IS NULL
         OR s.ghi_chu ILIKE '%'||btrim(p_column_search->>'ghi_chu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'so_tien','')),'') IS NULL
         OR s.so_tien::text ILIKE '%'||btrim(p_column_search->>'so_tien')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ho_va_ten_nguoi_tao','')),'') IS NULL
         OR s.nguoi_tao_display ILIKE '%'||btrim(p_column_search->>'ho_va_ten_nguoi_tao')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ngay_cap_nhat_trang_thai','')),'') IS NULL
         OR to_char(s.ngay_cap_nhat_trang_thai, 'DD/MM/YYYY')
            ILIKE '%'||btrim(p_column_search->>'ngay_cap_nhat_trang_thai')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tg_cap_nhat','')),'') IS NULL
         OR to_char(s.tg_cap_nhat, 'DD/MM/YYYY') ILIKE '%'||btrim(p_column_search->>'tg_cap_nhat')||'%')
  ORDER BY
    CASE WHEN p_sort = 'nam_asc' THEN s.nam END ASC  NULLS LAST,
    CASE WHEN p_sort = 'nam_desc' THEN s.nam END DESC NULLS LAST,
    CASE WHEN p_sort = 'noi_dung_ho_tro_asc' THEN s.noi_dung_ho_tro END ASC  NULLS LAST,
    CASE WHEN p_sort = 'noi_dung_ho_tro_desc' THEN s.noi_dung_ho_tro END DESC NULLS LAST,
    CASE WHEN p_sort = 'linh_vuc_ho_tro_asc' THEN s.linh_vuc_ho_tro END ASC  NULLS LAST,
    CASE WHEN p_sort = 'linh_vuc_ho_tro_desc' THEN s.linh_vuc_ho_tro END DESC NULLS LAST,
    CASE WHEN p_sort = 'nguon_asc' THEN s.nguon END ASC  NULLS LAST,
    CASE WHEN p_sort = 'nguon_desc' THEN s.nguon END DESC NULLS LAST,
    CASE WHEN p_sort = 'nguon_ho_tro_asc' THEN s.nguon_ho_tro END ASC  NULLS LAST,
    CASE WHEN p_sort = 'nguon_ho_tro_desc' THEN s.nguon_ho_tro END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_ten_nguoi_nhan_asc' THEN s.ho_ten_nguoi_nhan END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_ten_nguoi_nhan_desc' THEN s.ho_ten_nguoi_nhan END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_xa_phuong_asc' THEN s.ten_xa_phuong END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_xa_phuong_desc' THEN s.ten_xa_phuong END DESC NULLS LAST,
    CASE WHEN p_sort = 'khoi_xom_asc' THEN s.khoi_xom END ASC  NULLS LAST,
    CASE WHEN p_sort = 'khoi_xom_desc' THEN s.khoi_xom END DESC NULLS LAST,
    CASE WHEN p_sort = 'doi_tuong_asc' THEN s.doi_tuong END ASC  NULLS LAST,
    CASE WHEN p_sort = 'doi_tuong_desc' THEN s.doi_tuong END DESC NULLS LAST,
    CASE WHEN p_sort = 'hinh_thuc_ho_tro_asc' THEN s.hinh_thuc_ho_tro END ASC  NULLS LAST,
    CASE WHEN p_sort = 'hinh_thuc_ho_tro_desc' THEN s.hinh_thuc_ho_tro END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_tien_asc' THEN s.so_tien END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_tien_desc' THEN s.so_tien END DESC NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_asc' THEN s.trang_thai END ASC  NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_desc' THEN s.trang_thai END DESC NULLS LAST,
    CASE WHEN p_sort = 'ngay_cap_nhat_trang_thai_asc' THEN s.ngay_cap_nhat_trang_thai END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ngay_cap_nhat_trang_thai_desc' THEN s.ngay_cap_nhat_trang_thai END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_don_vi_ho_tro_asc' THEN s.ten_don_vi_ho_tro END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_don_vi_ho_tro_desc' THEN s.ten_don_vi_ho_tro END DESC NULLS LAST,
    CASE WHEN p_sort = 'ghi_chu_asc' THEN s.ghi_chu END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ghi_chu_desc' THEN s.ghi_chu END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_asc' THEN s.nguoi_tao_display END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_desc' THEN s.nguoi_tao_display END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_asc' THEN s.tg_cap_nhat END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_desc' THEN s.tg_cap_nhat END DESC NULLS LAST,
    -- Mặc định: mới cập nhật lên trước. BẮT BUỘC kết thúc bằng khoá chính,
    -- nếu không hai trang liền nhau có thể trùng dòng hoặc bỏ sót dòng.
    s.tg_cap_nhat DESC NULLS LAST, s.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$;

GRANT EXECUTE ON FUNCTION public.get_vnn_page(
  text, integer, integer, text, boolean, bigint,
  integer[], text[], text[], text[], text[], text[], text[], bigint[], jsonb
) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
