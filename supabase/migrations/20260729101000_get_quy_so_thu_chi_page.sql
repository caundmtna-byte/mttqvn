-- ============================================================================
-- get_quy_so_thu_chi_page — phân trang phía máy chủ cho Sổ thu chi của quỹ
--
-- `quy_so_thu_chi` là **bảng giao dịch**: mỗi phiếu thu/chi một dòng, tăng liên
-- tục và không có trần tự nhiên. Theo lằn ranh đã chốt trong CLAUDE.md
-- ("Chọn kiểu phân trang"), bảng loại này phải phân trang phía máy chủ ngay từ
-- đầu — làm sau, khi sổ đã có vài vạn dòng, vừa đắt vừa rủi ro.
--
-- Khuôn mẫu giống hệt `get_kho_nhap_xuat_kho_page`: COUNT(*) OVER () để biết
-- tổng thật, `p_sort` whitelist bằng CASE (không nội suy chuỗi), cột hiển thị
-- đã LEFT JOIN sẵn để không tốn request thứ hai, và `p_column_search jsonb`
-- cho ô tìm theo từng cột.
--
-- Trả kèm `tong_thu` / `tong_chi` của TOÀN BỘ tập đã lọc (không phải của trang
-- đang xem) — sổ quỹ mà cộng theo trang thì con số vô nghĩa.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_quy_so_thu_chi_page(
  text, text, integer, integer, text, text, bigint[], bigint[], date, date, jsonb
);

CREATE FUNCTION public.get_quy_so_thu_chi_page(
  -- 'vi_nguoi_ngheo' | 'cuu_tro' — bắt buộc, hai quỹ dùng chung bảng.
  p_quy            text,
  p_search         text     DEFAULT NULL,
  p_limit          integer  DEFAULT 100,
  p_offset         integer  DEFAULT 0,
  p_sort           text     DEFAULT NULL,
  -- 'thu' | 'chi' | NULL (cả hai)
  p_loai           text     DEFAULT NULL,
  p_khoan_ids      bigint[] DEFAULT NULL,
  p_tai_khoan_ids  bigint[] DEFAULT NULL,
  p_tu_ngay        date     DEFAULT NULL,
  p_den_ngay       date     DEFAULT NULL,
  p_column_search  jsonb    DEFAULT NULL
)
RETURNS TABLE (
  id                  bigint,
  quy                 text,
  loai                text,
  so_chung_tu         text,
  ngay_chung_tu       date,
  khoan_id            bigint,
  ten_khoan           text,
  tai_khoan_id        bigint,
  ten_tai_khoan       text,
  so_tien             numeric,
  noi_dung            text,
  nguoi_nop_nhan      text,
  don_vi_id           bigint,
  ten_don_vi          text,
  chung_tu_goc        text,
  ghi_chu             text,
  id_nguoi_tao        bigint,
  ho_va_ten_nguoi_tao text,
  tg_tao              timestamptz,
  tg_cap_nhat         timestamptz,
  -- Tổng của TOÀN BỘ tập đã lọc, lặp lại trên mỗi dòng (cửa sổ không phân vùng).
  tong_thu            numeric,
  tong_chi            numeric,
  total_count         bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH src AS (
    SELECT
      s.*,
      k.ten  AS ten_khoan,
      tk.ten AS ten_tai_khoan,
      xp.ten AS ten_don_vi,
      COALESCE(NULLIF(btrim(nv.ho_va_ten), ''), NULLIF(btrim(nv.ten_tai_khoan), '')) AS ho_va_ten_nguoi_tao
    FROM public.quy_so_thu_chi s
    LEFT JOIN public.quy_danh_muc_khoan      k  ON k.id  = s.khoan_id
    LEFT JOIN public.quy_danh_muc_tai_khoan  tk ON tk.id = s.tai_khoan_id
    LEFT JOIN public.var_ssn_xa_phuong       xp ON xp.id = s.don_vi_id
    LEFT JOIN public.var_nhan_vien           nv ON nv.id = s.id_nguoi_tao
    WHERE s.quy = p_quy
  )
  SELECT
    s.id, s.quy, s.loai, s.so_chung_tu, s.ngay_chung_tu,
    s.khoan_id, s.ten_khoan,
    s.tai_khoan_id, s.ten_tai_khoan,
    s.so_tien, s.noi_dung, s.nguoi_nop_nhan,
    s.don_vi_id, s.ten_don_vi,
    s.chung_tu_goc, s.ghi_chu,
    s.id_nguoi_tao, s.ho_va_ten_nguoi_tao,
    s.tg_tao, s.tg_cap_nhat,
    COALESCE(SUM(s.so_tien) FILTER (WHERE s.loai = 'thu') OVER (), 0) AS tong_thu,
    COALESCE(SUM(s.so_tien) FILTER (WHERE s.loai = 'chi') OVER (), 0) AS tong_chi,
    COUNT(*) OVER () AS total_count
  FROM src s
  WHERE (
      p_search IS NULL
      OR s.so_chung_tu    ILIKE '%' || p_search || '%'
      OR s.noi_dung       ILIKE '%' || p_search || '%'
      OR s.nguoi_nop_nhan ILIKE '%' || p_search || '%'
      OR s.ten_khoan      ILIKE '%' || p_search || '%'
      OR s.ten_tai_khoan  ILIKE '%' || p_search || '%'
      OR s.ten_don_vi     ILIKE '%' || p_search || '%'
    )
    AND (p_loai IS NULL OR s.loai = p_loai)
    AND (p_khoan_ids     IS NULL OR cardinality(p_khoan_ids)     = 0 OR s.khoan_id     = ANY (p_khoan_ids))
    AND (p_tai_khoan_ids IS NULL OR cardinality(p_tai_khoan_ids) = 0 OR s.tai_khoan_id = ANY (p_tai_khoan_ids))
    AND (p_tu_ngay  IS NULL OR s.ngay_chung_tu >= p_tu_ngay)
    AND (p_den_ngay IS NULL OR s.ngay_chung_tu <= p_den_ngay)
    AND (nullif(btrim(coalesce(p_column_search->>'so_chung_tu','')),'') IS NULL
         OR s.so_chung_tu ILIKE '%'||btrim(p_column_search->>'so_chung_tu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ngay_chung_tu','')),'') IS NULL
         OR to_char(s.ngay_chung_tu, 'DD/MM/YYYY') ILIKE '%'||btrim(p_column_search->>'ngay_chung_tu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_khoan','')),'') IS NULL
         OR s.ten_khoan ILIKE '%'||btrim(p_column_search->>'ten_khoan')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_tai_khoan','')),'') IS NULL
         OR s.ten_tai_khoan ILIKE '%'||btrim(p_column_search->>'ten_tai_khoan')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'so_tien','')),'') IS NULL
         OR s.so_tien::text ILIKE '%'||btrim(p_column_search->>'so_tien')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'noi_dung','')),'') IS NULL
         OR s.noi_dung ILIKE '%'||btrim(p_column_search->>'noi_dung')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'nguoi_nop_nhan','')),'') IS NULL
         OR s.nguoi_nop_nhan ILIKE '%'||btrim(p_column_search->>'nguoi_nop_nhan')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_don_vi','')),'') IS NULL
         OR s.ten_don_vi ILIKE '%'||btrim(p_column_search->>'ten_don_vi')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ho_va_ten_nguoi_tao','')),'') IS NULL
         OR s.ho_va_ten_nguoi_tao ILIKE '%'||btrim(p_column_search->>'ho_va_ten_nguoi_tao')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ghi_chu','')),'') IS NULL
         OR s.ghi_chu ILIKE '%'||btrim(p_column_search->>'ghi_chu')||'%')
  ORDER BY
    CASE WHEN p_sort = 'so_chung_tu_asc'          THEN s.so_chung_tu         END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_chung_tu_desc'         THEN s.so_chung_tu         END DESC NULLS LAST,
    CASE WHEN p_sort = 'ngay_chung_tu_asc'        THEN s.ngay_chung_tu       END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ngay_chung_tu_desc'       THEN s.ngay_chung_tu       END DESC NULLS LAST,
    CASE WHEN p_sort = 'loai_asc'                 THEN s.loai                END ASC  NULLS LAST,
    CASE WHEN p_sort = 'loai_desc'                THEN s.loai                END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_khoan_asc'            THEN s.ten_khoan           END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_khoan_desc'           THEN s.ten_khoan           END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_tai_khoan_asc'        THEN s.ten_tai_khoan       END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_tai_khoan_desc'       THEN s.ten_tai_khoan       END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_tien_asc'              THEN s.so_tien             END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_tien_desc'             THEN s.so_tien             END DESC NULLS LAST,
    CASE WHEN p_sort = 'noi_dung_asc'             THEN s.noi_dung            END ASC  NULLS LAST,
    CASE WHEN p_sort = 'noi_dung_desc'            THEN s.noi_dung            END DESC NULLS LAST,
    CASE WHEN p_sort = 'nguoi_nop_nhan_asc'       THEN s.nguoi_nop_nhan      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'nguoi_nop_nhan_desc'      THEN s.nguoi_nop_nhan      END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_don_vi_asc'           THEN s.ten_don_vi          END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_don_vi_desc'          THEN s.ten_don_vi          END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_asc'  THEN s.ho_va_ten_nguoi_tao END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_desc' THEN s.ho_va_ten_nguoi_tao END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_asc'          THEN s.tg_cap_nhat         END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_desc'         THEN s.tg_cap_nhat         END DESC NULLS LAST,
    s.ngay_chung_tu DESC NULLS LAST, s.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$;

COMMENT ON FUNCTION public.get_quy_so_thu_chi_page(
  text, text, integer, integer, text, text, bigint[], bigint[], date, date, jsonb
) IS 'Một trang sổ thu chi của quỹ, kèm tổng số dòng và tổng thu/chi của toàn bộ tập đã lọc.';

GRANT EXECUTE ON FUNCTION public.get_quy_so_thu_chi_page(
  text, text, integer, integer, text, text, bigint[], bigint[], date, date, jsonb
) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
