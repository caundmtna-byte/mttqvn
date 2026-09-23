-- ============================================================================
-- RPC phân trang phía máy chủ cho Thông tin hộ nghèo.
--
-- Khuôn giống `get_nddk_page`. Bốn điều bắt buộc, đã trả giá một lần ở module
-- khác (xem CLAUDE.md mục "Khuôn mẫu RPC phân trang"):
--   1. COUNT(*) OVER () — thiếu thì UI hiện "Tổng: —", nút trang cuối chết và
--      hộp thoại Xuất ghi sai số dòng.
--   2. p_sort đi qua whitelist bằng CASE, KHÔNG nội suy chuỗi.
--   3. ORDER BY phải kết thúc bằng khoá chính, nếu không hai trang liền nhau
--      có thể trùng dòng hoặc bỏ sót dòng.
--   4. Trả luôn cột hiển thị đã LEFT JOIN (tên xã, tên dân tộc, người tạo) —
--      gọi RPC lấy id rồi SELECT lần hai là tốn gấp đôi request mỗi lần đổi trang.
--
-- SECURITY INVOKER để RLS của bảng vẫn áp cho người gọi.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_hngh_page(
  text, integer, integer, text, boolean, bigint,
  text[], text[], text[], bigint[], bigint[], jsonb
);

CREATE FUNCTION public.get_hngh_page(
  p_search              text    DEFAULT NULL,
  p_limit               integer DEFAULT 100,
  p_offset              integer DEFAULT 0,
  p_sort                text    DEFAULT NULL,
  p_view_all            boolean DEFAULT true,
  p_viewer_xa_phuong_id bigint  DEFAULT NULL,
  p_doi_tuong           text[]  DEFAULT NULL,
  p_ton_giao            text[]  DEFAULT NULL,
  p_trang_thai          text[]  DEFAULT NULL,
  p_dan_toc_ids         bigint[] DEFAULT NULL,
  p_xa_phuong_ids       bigint[] DEFAULT NULL,
  p_column_search       jsonb   DEFAULT NULL
)
RETURNS TABLE (
  id                        bigint,
  ho_ten_dai_dien           text,
  so_cccd                   text,
  xa_phuong_id              bigint,
  ten_xa_phuong             text,
  khoi_xom                  text,
  doi_tuong                 text,
  dien_thoai                text,
  dan_toc_id                bigint,
  ten_dan_toc               text,
  ton_giao                  text,
  so_tai_khoan              text,
  ngan_hang                 text,
  trang_thai                text,
  ngay_cap_nhat_trang_thai  timestamptz,
  ghi_chu                   text,
  id_nguoi_tao              bigint,
  ho_va_ten_nguoi_tao       text,
  ten_tai_khoan_nguoi_tao   text,
  tg_tao                    timestamptz,
  tg_cap_nhat               timestamptz,
  total_count               bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH src AS (
    SELECT
      t.*,
      xp.ten           AS ten_xa_phuong,
      dt.ten           AS ten_dan_toc,
      nt.ho_va_ten     AS ho_va_ten_nguoi_tao,
      nt.ten_tai_khoan AS ten_tai_khoan_nguoi_tao,
      COALESCE(NULLIF(btrim(nt.ho_va_ten), ''), NULLIF(btrim(nt.ten_tai_khoan), ''), '')
        AS nguoi_tao_display
    FROM public.hngh_thong_tin_ho_ngheo t
    LEFT JOIN public.var_ssn_xa_phuong xp ON xp.id = t.xa_phuong_id
    LEFT JOIN public.mttq_thiet_lap    dt ON dt.id = t.dan_toc_id
    LEFT JOIN public.var_nhan_vien     nt ON nt.id = t.id_nguoi_tao
  )
  SELECT
    s.id, s.ho_ten_dai_dien, s.so_cccd,
    s.xa_phuong_id, s.ten_xa_phuong, s.khoi_xom,
    s.doi_tuong, s.dien_thoai,
    s.dan_toc_id, s.ten_dan_toc, s.ton_giao,
    s.so_tai_khoan, s.ngan_hang,
    s.trang_thai, s.ngay_cap_nhat_trang_thai, s.ghi_chu,
    s.id_nguoi_tao, s.ho_va_ten_nguoi_tao, s.ten_tai_khoan_nguoi_tao,
    s.tg_tao, s.tg_cap_nhat,
    COUNT(*) OVER () AS total_count
  FROM src s
  WHERE (
      p_search IS NULL
      OR s.ho_ten_dai_dien ILIKE '%' || p_search || '%'
      OR s.so_cccd         ILIKE '%' || p_search || '%'
      OR s.ten_xa_phuong   ILIKE '%' || p_search || '%'
      OR s.khoi_xom        ILIKE '%' || p_search || '%'
      OR s.dien_thoai      ILIKE '%' || p_search || '%'
      OR s.ten_dan_toc     ILIKE '%' || p_search || '%'
      OR s.ghi_chu         ILIKE '%' || p_search || '%'
    )
    -- KHÔNG nới lỏng khi thiếu đơn vị: cán bộ cấp Xã phường chưa được gán đơn vị
    -- phải thấy RỖNG, đúng như canViewHnghRow ở client.
    AND (
      COALESCE(p_view_all, true)
      OR s.xa_phuong_id = p_viewer_xa_phuong_id
    )
    AND (p_doi_tuong     IS NULL OR cardinality(p_doi_tuong)     = 0 OR s.doi_tuong    = ANY (p_doi_tuong))
    AND (p_ton_giao      IS NULL OR cardinality(p_ton_giao)      = 0 OR s.ton_giao     = ANY (p_ton_giao))
    AND (p_trang_thai    IS NULL OR cardinality(p_trang_thai)    = 0 OR s.trang_thai   = ANY (p_trang_thai))
    AND (p_dan_toc_ids   IS NULL OR cardinality(p_dan_toc_ids)   = 0 OR s.dan_toc_id   = ANY (p_dan_toc_ids))
    AND (p_xa_phuong_ids IS NULL OR cardinality(p_xa_phuong_ids) = 0 OR s.xa_phuong_id = ANY (p_xa_phuong_ids))
    -- Tìm theo từng cột: so khớp trên ĐÚNG chuỗi hiển thị của cột đó.
    AND (nullif(btrim(coalesce(p_column_search->>'ho_ten_dai_dien','')),'') IS NULL
         OR s.ho_ten_dai_dien ILIKE '%'||btrim(p_column_search->>'ho_ten_dai_dien')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'so_cccd','')),'') IS NULL
         OR s.so_cccd ILIKE '%'||btrim(p_column_search->>'so_cccd')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_xa_phuong','')),'') IS NULL
         OR s.ten_xa_phuong ILIKE '%'||btrim(p_column_search->>'ten_xa_phuong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'khoi_xom','')),'') IS NULL
         OR s.khoi_xom ILIKE '%'||btrim(p_column_search->>'khoi_xom')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'doi_tuong','')),'') IS NULL
         OR s.doi_tuong ILIKE '%'||btrim(p_column_search->>'doi_tuong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'dien_thoai','')),'') IS NULL
         OR s.dien_thoai ILIKE '%'||btrim(p_column_search->>'dien_thoai')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_dan_toc','')),'') IS NULL
         OR s.ten_dan_toc ILIKE '%'||btrim(p_column_search->>'ten_dan_toc')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ton_giao','')),'') IS NULL
         OR s.ton_giao ILIKE '%'||btrim(p_column_search->>'ton_giao')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'so_tai_khoan','')),'') IS NULL
         OR s.so_tai_khoan ILIKE '%'||btrim(p_column_search->>'so_tai_khoan')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ngan_hang','')),'') IS NULL
         OR s.ngan_hang ILIKE '%'||btrim(p_column_search->>'ngan_hang')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'trang_thai','')),'') IS NULL
         OR s.trang_thai ILIKE '%'||btrim(p_column_search->>'trang_thai')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ghi_chu','')),'') IS NULL
         OR s.ghi_chu ILIKE '%'||btrim(p_column_search->>'ghi_chu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ho_va_ten_nguoi_tao','')),'') IS NULL
         OR s.nguoi_tao_display ILIKE '%'||btrim(p_column_search->>'ho_va_ten_nguoi_tao')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ngay_cap_nhat_trang_thai','')),'') IS NULL
         OR to_char(s.ngay_cap_nhat_trang_thai, 'DD/MM/YYYY')
            ILIKE '%'||btrim(p_column_search->>'ngay_cap_nhat_trang_thai')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tg_cap_nhat','')),'') IS NULL
         OR to_char(s.tg_cap_nhat, 'DD/MM/YYYY') ILIKE '%'||btrim(p_column_search->>'tg_cap_nhat')||'%')
  ORDER BY
    CASE WHEN p_sort = 'ho_ten_dai_dien_asc'  THEN lower(btrim(s.ho_ten_dai_dien)) END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_ten_dai_dien_desc' THEN lower(btrim(s.ho_ten_dai_dien)) END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_cccd_asc'          THEN s.so_cccd        END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_cccd_desc'         THEN s.so_cccd        END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_xa_phuong_asc'    THEN s.ten_xa_phuong  END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_xa_phuong_desc'   THEN s.ten_xa_phuong  END DESC NULLS LAST,
    CASE WHEN p_sort = 'khoi_xom_asc'         THEN s.khoi_xom       END ASC  NULLS LAST,
    CASE WHEN p_sort = 'khoi_xom_desc'        THEN s.khoi_xom       END DESC NULLS LAST,
    CASE WHEN p_sort = 'doi_tuong_asc'        THEN s.doi_tuong      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'doi_tuong_desc'       THEN s.doi_tuong      END DESC NULLS LAST,
    CASE WHEN p_sort = 'dien_thoai_asc'       THEN s.dien_thoai     END ASC  NULLS LAST,
    CASE WHEN p_sort = 'dien_thoai_desc'      THEN s.dien_thoai     END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_dan_toc_asc'      THEN s.ten_dan_toc    END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_dan_toc_desc'     THEN s.ten_dan_toc    END DESC NULLS LAST,
    CASE WHEN p_sort = 'ton_giao_asc'         THEN s.ton_giao       END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ton_giao_desc'        THEN s.ton_giao       END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_tai_khoan_asc'     THEN s.so_tai_khoan   END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_tai_khoan_desc'    THEN s.so_tai_khoan   END DESC NULLS LAST,
    CASE WHEN p_sort = 'ngan_hang_asc'        THEN s.ngan_hang      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ngan_hang_desc'       THEN s.ngan_hang      END DESC NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_asc'       THEN s.trang_thai     END ASC  NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_desc'      THEN s.trang_thai     END DESC NULLS LAST,
    CASE WHEN p_sort = 'ghi_chu_asc'          THEN s.ghi_chu        END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ghi_chu_desc'         THEN s.ghi_chu        END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_asc'  THEN s.nguoi_tao_display END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_desc' THEN s.nguoi_tao_display END DESC NULLS LAST,
    CASE WHEN p_sort = 'ngay_cap_nhat_trang_thai_asc'  THEN s.ngay_cap_nhat_trang_thai END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ngay_cap_nhat_trang_thai_desc' THEN s.ngay_cap_nhat_trang_thai END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_tao_asc'           THEN s.tg_tao         END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_tao_desc'          THEN s.tg_tao         END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_asc'      THEN s.tg_cap_nhat    END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_desc'     THEN s.tg_cap_nhat    END DESC NULLS LAST,
    s.tg_cap_nhat DESC NULLS LAST,
    s.id DESC
  LIMIT greatest(p_limit, 1) OFFSET greatest(p_offset, 0);
$$;

COMMENT ON FUNCTION public.get_hngh_page(
  text, integer, integer, text, boolean, bigint,
  text[], text[], text[], bigint[], bigint[], jsonb
) IS 'Một trang danh sách hộ nghèo kèm total_count và cột hiển thị đã join.';

GRANT EXECUTE ON FUNCTION public.get_hngh_page(
  text, integer, integer, text, boolean, bigint,
  text[], text[], text[], bigint[], bigint[], jsonb
) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
