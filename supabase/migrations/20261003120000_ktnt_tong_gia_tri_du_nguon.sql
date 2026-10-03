-- Khen thưởng nhà tài trợ: "Tổng giá trị đóng góp" cộng ĐỦ các nguồn.
--
-- Trước đây get_ktnt_page chỉ cộng vnn_chuong_trinh.so_tien (tiền mặt) nên nhà
-- tài trợ chỉ ủng hộ hiện vật / hàng nhập kho hiện 0 đ, lệch hẳn với cột
-- "Kết quả ủng hộ" ở màn Đơn vị cứu trợ (get_kho_don_vi_cuu_tro_ung_ho_nhom).
-- Nay, trong kỳ nam_thanh_tich_tu..den (để trống = mọi năm):
--   tien_mat         = Σ vnn_chuong_trinh.so_tien            (năm theo v.nam)
--   hien_vat_quy_doi = Σ vnn_chuong_trinh.tong_tien_quy_doi  (năm theo v.nam)
--   gia_tri_nhap_kho = Σ kho_nhap_xuat_kho_ct.thanh_tien của phiếu nhap_ngoai
--                      từ nhà tài trợ                         (năm theo p.ngay_phieu)
--   tong_gia_tri     = 3 khoản trên + gia_tri_dong_gop_khac
-- Số người / số khoản vẫn chỉ đếm từ vnn_chuong_trinh (phiếu kho không có người nhận).
--
-- get_ktnt_thanh_tich là nơi DUY NHẤT viết điều kiện: bảng danh sách, màn chi
-- tiết và ô "Tự tính" ở form đều đọc qua nó nên không thể lệch nhau.

CREATE OR REPLACE FUNCTION public.get_ktnt_thanh_tich(
  p_nha_tai_tro_id bigint,
  p_tu_nam integer DEFAULT NULL,
  p_den_nam integer DEFAULT NULL
) RETURNS TABLE (
  tien_mat numeric,
  hien_vat_quy_doi numeric,
  gia_tri_nhap_kho numeric,
  so_khoan_ho_tro bigint,
  so_nguoi_duoc_ho_tro bigint,
  so_phieu_nhap_kho bigint
)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT
    vnn.tien_mat, vnn.hien_vat_quy_doi, kho.gia_tri_nhap_kho,
    vnn.so_khoan_ho_tro, vnn.so_nguoi_duoc_ho_tro, kho.so_phieu_nhap_kho
  FROM (
    SELECT
      COALESCE(sum(v.so_tien), 0)::numeric           AS tien_mat,
      COALESCE(sum(v.tong_tien_quy_doi), 0)::numeric AS hien_vat_quy_doi,
      count(*)::bigint                               AS so_khoan_ho_tro,
      count(DISTINCT COALESCE(
        'ho:' || v.ho_ngheo_id::text,
        'ten:' || lower(regexp_replace(btrim(v.ho_ten_nguoi_nhan), '\s+', ' ', 'g'))
          || '|' || COALESCE(v.xa_phuong_id::text, '')
      ))::bigint                                     AS so_nguoi_duoc_ho_tro
    FROM public.vnn_chuong_trinh v
    WHERE v.don_vi_ho_tro_id = p_nha_tai_tro_id
      AND (p_tu_nam  IS NULL OR v.nam >= p_tu_nam)
      AND (p_den_nam IS NULL OR v.nam <= p_den_nam)
  ) vnn
  CROSS JOIN (
    SELECT
      COALESCE(sum(ct.thanh_tien), 0)::numeric AS gia_tri_nhap_kho,
      count(DISTINCT p.id)::bigint             AS so_phieu_nhap_kho
    FROM public.kho_nhap_xuat_kho p
    JOIN public.kho_nhap_xuat_kho_ct ct ON ct.phieu_id = p.id
    WHERE p.loai_phieu = 'nhap_ngoai'
      AND p.don_vi_cuu_tro_id = p_nha_tai_tro_id
      AND (p_tu_nam  IS NULL OR extract(year FROM p.ngay_phieu)::int >= p_tu_nam)
      AND (p_den_nam IS NULL OR extract(year FROM p.ngay_phieu)::int <= p_den_nam)
  ) kho;
$$;

GRANT EXECUTE ON FUNCTION public.get_ktnt_thanh_tich(bigint, integer, integer) TO authenticated, service_role;

-- Đổi RETURNS TABLE ⇒ phải DROP rồi CREATE lại.
DROP FUNCTION IF EXISTS public.get_ktnt_page(text, integer, integer, text, boolean, bigint, integer[], text[], text[], bigint[], bigint[], text[], jsonb);

CREATE FUNCTION public.get_ktnt_page(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_sort text DEFAULT NULL::text, p_view_all boolean DEFAULT true, p_viewer_xa_phuong_id bigint DEFAULT NULL::bigint, p_nam integer[] DEFAULT NULL::integer[], p_cap_khen text[] DEFAULT NULL::text[], p_trang_thai text[] DEFAULT NULL::text[], p_xa_phuong_ids bigint[] DEFAULT NULL::bigint[], p_nha_tai_tro_ids bigint[] DEFAULT NULL::bigint[], p_loai_nha_tai_tro text[] DEFAULT NULL::text[], p_column_search jsonb DEFAULT NULL::jsonb) RETURNS TABLE(id bigint, noi_dung_khen text, ngay_khen date, so_quyet_dinh text, cap_khen text, don_vi_khen text, xa_phuong_id bigint, ten_xa_phuong text, nha_tai_tro_id bigint, ten_nha_tai_tro text, loai_nha_tai_tro text, nam_thanh_tich_tu integer, nam_thanh_tich_den integer, gia_tri_dong_gop_khac numeric, so_khoan_ho_tro bigint, so_nguoi_duoc_ho_tro bigint, tong_tien_ho_tro numeric, hien_vat_quy_doi numeric, gia_tri_nhap_kho numeric, so_phieu_nhap_kho bigint, tong_gia_tri numeric, trang_thai text, ngay_cap_nhat_trang_thai timestamp with time zone, nguoi_duyet_id bigint, ho_va_ten_nguoi_duyet text, tg_duyet timestamp with time zone, ghi_chu text, id_nguoi_tao bigint, ho_va_ten_nguoi_tao text, ten_tai_khoan_nguoi_tao text, tg_tao timestamp with time zone, tg_cap_nhat timestamp with time zone, total_count bigint)
    LANGUAGE sql STABLE
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
      tt.tien_mat AS tong_tien_ho_tro,
      tt.hien_vat_quy_doi,
      tt.gia_tri_nhap_kho,
      tt.so_phieu_nhap_kho,
      tt.tien_mat + tt.hien_vat_quy_doi + tt.gia_tri_nhap_kho
        + COALESCE(t.gia_tri_dong_gop_khac, 0) AS tong_gia_tri
    FROM public.ktnt_khen_thuong_nha_tai_tro t
    LEFT JOIN public.var_ssn_xa_phuong  xp ON xp.id = t.xa_phuong_id
    LEFT JOIN public.kho_don_vi_cuu_tro dv ON dv.id = t.nha_tai_tro_id
    LEFT JOIN public.var_nhan_vien      nd ON nd.id = t.nguoi_duyet_id
    LEFT JOIN public.var_nhan_vien      nt ON nt.id = t.id_nguoi_tao
    -- Thành tích: một nguồn sự thật với màn chi tiết / form (get_ktnt_thanh_tich).
    CROSS JOIN LATERAL public.get_ktnt_thanh_tich(
      t.nha_tai_tro_id, t.nam_thanh_tich_tu, t.nam_thanh_tich_den
    ) tt
  )
  SELECT
    s.id, s.noi_dung_khen, s.ngay_khen, s.so_quyet_dinh, s.cap_khen, s.don_vi_khen,
    s.xa_phuong_id, s.ten_xa_phuong, s.nha_tai_tro_id, s.ten_nha_tai_tro, s.loai_nha_tai_tro,
    s.nam_thanh_tich_tu, s.nam_thanh_tich_den, s.gia_tri_dong_gop_khac,
    s.so_khoan_ho_tro, s.so_nguoi_duoc_ho_tro, s.tong_tien_ho_tro,
    s.hien_vat_quy_doi, s.gia_tri_nhap_kho, s.so_phieu_nhap_kho, s.tong_gia_tri,
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
    CASE WHEN p_sort = 'hien_vat_quy_doi_asc' THEN s.hien_vat_quy_doi END ASC  NULLS LAST,
    CASE WHEN p_sort = 'hien_vat_quy_doi_desc' THEN s.hien_vat_quy_doi END DESC NULLS LAST,
    CASE WHEN p_sort = 'gia_tri_nhap_kho_asc' THEN s.gia_tri_nhap_kho END ASC  NULLS LAST,
    CASE WHEN p_sort = 'gia_tri_nhap_kho_desc' THEN s.gia_tri_nhap_kho END DESC NULLS LAST,
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

GRANT EXECUTE ON FUNCTION public.get_ktnt_page(text, integer, integer, text, boolean, bigint, integer[], text[], text[], bigint[], bigint[], text[], jsonb) TO authenticated, service_role;
