-- Thông tin đối tượng hỗ trợ: thêm cột "Tổ chức" — tổ chức phụ trách hộ.
-- Không chọn ⇒ 'Mặt trận' (DEFAULT, dòng cũ tự nhận giá trị này).
-- Bản sao client: features/nha-dai-doan-ket/thong-tin-ho-ngheo/core/constants.ts
-- (HNGH_TO_CHUC_VALUES) — sửa một bên phải sửa cả bên kia.
--
-- get_hngh_page đổi kiểu trả về ⇒ phải DROP rồi CREATE lại; thêm cột to_chuc,
-- bộ lọc p_to_chuc, tìm theo cột và sắp xếp to_chuc_asc/desc.

BEGIN;

ALTER TABLE public.hngh_thong_tin_ho_ngheo
  ADD COLUMN to_chuc text NOT NULL DEFAULT 'Mặt trận',
  ADD CONSTRAINT hngh_thong_tin_ho_ngheo_to_chuc_check
    CHECK (to_chuc = ANY (ARRAY['Mặt trận'::text, 'Phụ nữ'::text, 'Nông dân'::text, 'Công đoàn'::text, 'Đoàn'::text, 'CCB'::text]));

DROP FUNCTION public.get_hngh_page(text, integer, integer, text, boolean, bigint, text[], text[], text[], bigint[], bigint[], jsonb);

CREATE FUNCTION public.get_hngh_page(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_sort text DEFAULT NULL::text, p_view_all boolean DEFAULT true, p_viewer_xa_phuong_id bigint DEFAULT NULL::bigint, p_doi_tuong text[] DEFAULT NULL::text[], p_ton_giao text[] DEFAULT NULL::text[], p_trang_thai text[] DEFAULT NULL::text[], p_dan_toc_ids bigint[] DEFAULT NULL::bigint[], p_xa_phuong_ids bigint[] DEFAULT NULL::bigint[], p_column_search jsonb DEFAULT NULL::jsonb, p_to_chuc text[] DEFAULT NULL::text[]) RETURNS TABLE(id bigint, ho_ten_dai_dien text, so_cccd text, xa_phuong_id bigint, ten_xa_phuong text, khoi_xom text, doi_tuong text, dien_thoai text, dan_toc_id bigint, ten_dan_toc text, ton_giao text, to_chuc text, so_tai_khoan text, ngan_hang text, trang_thai text, ngay_cap_nhat_trang_thai timestamp with time zone, ghi_chu text, id_nguoi_tao bigint, ho_va_ten_nguoi_tao text, ten_tai_khoan_nguoi_tao text, tg_tao timestamp with time zone, tg_cap_nhat timestamp with time zone, id_nguoi_cap_nhat bigint, ho_va_ten_nguoi_cap_nhat text, ten_tai_khoan_nguoi_cap_nhat text, total_count bigint)
    LANGUAGE sql STABLE
    AS $$
  WITH src AS (
    SELECT
      t.*,
      xp.ten           AS ten_xa_phuong,
      dt.ten           AS ten_dan_toc,
      nt.ho_va_ten     AS ho_va_ten_nguoi_tao,
      nt.ten_tai_khoan AS ten_tai_khoan_nguoi_tao,
      nc.ho_va_ten     AS ho_va_ten_nguoi_cap_nhat,
      nc.ten_tai_khoan AS ten_tai_khoan_nguoi_cap_nhat,
      COALESCE(NULLIF(btrim(nt.ho_va_ten), ''), NULLIF(btrim(nt.ten_tai_khoan), ''), '')
        AS nguoi_tao_display
    FROM public.hngh_thong_tin_ho_ngheo t
    LEFT JOIN public.var_ssn_xa_phuong xp ON xp.id = t.xa_phuong_id
    LEFT JOIN public.mttq_thiet_lap    dt ON dt.id = t.dan_toc_id
    LEFT JOIN public.var_nhan_vien     nt ON nt.id = t.id_nguoi_tao
    LEFT JOIN public.var_nhan_vien      nc ON nc.id = t.id_nguoi_cap_nhat
  )
  SELECT
    s.id, s.ho_ten_dai_dien, s.so_cccd,
    s.xa_phuong_id, s.ten_xa_phuong, s.khoi_xom,
    s.doi_tuong, s.dien_thoai,
    s.dan_toc_id, s.ten_dan_toc, s.ton_giao, s.to_chuc,
    s.so_tai_khoan, s.ngan_hang,
    s.trang_thai, s.ngay_cap_nhat_trang_thai, s.ghi_chu,
    s.id_nguoi_tao, s.ho_va_ten_nguoi_tao, s.ten_tai_khoan_nguoi_tao,
    s.tg_tao, s.tg_cap_nhat,
    s.id_nguoi_cap_nhat, s.ho_va_ten_nguoi_cap_nhat, s.ten_tai_khoan_nguoi_cap_nhat,
    COUNT(*) OVER () AS total_count
  FROM src s
  WHERE (
      p_search IS NULL
      OR public.fn_chuan_hoa_tim_kiem(concat_ws(' ',
        s.ho_ten_dai_dien,
        s.so_cccd,
        s.ten_xa_phuong,
        s.khoi_xom,
        s.doi_tuong,
        s.dien_thoai,
        s.ten_dan_toc,
        s.ton_giao,
        s.to_chuc,
        s.so_tai_khoan,
        s.ngan_hang,
        s.trang_thai,
        to_char(s.ngay_cap_nhat_trang_thai AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI'),
        s.ghi_chu,
        s.nguoi_tao_display,
        to_char(s.tg_cap_nhat AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI')
      )) LIKE public.fn_mau_tim_kiem(p_search)
    )
    -- KHÔNG nới lỏng khi thiếu đơn vị: cán bộ cấp Xã phường chưa được gán đơn vị
    -- phải thấy RỖNG, đúng như canViewHnghRow ở client.
    AND (
      COALESCE(p_view_all, true)
      OR s.xa_phuong_id = p_viewer_xa_phuong_id
    )
    AND (p_doi_tuong     IS NULL OR cardinality(p_doi_tuong)     = 0 OR s.doi_tuong    = ANY (p_doi_tuong))
    AND (p_ton_giao      IS NULL OR cardinality(p_ton_giao)      = 0 OR s.ton_giao     = ANY (p_ton_giao))
    AND (p_to_chuc       IS NULL OR cardinality(p_to_chuc)       = 0 OR s.to_chuc      = ANY (p_to_chuc))
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
    AND (nullif(btrim(coalesce(p_column_search->>'to_chuc','')),'') IS NULL
         OR s.to_chuc ILIKE '%'||btrim(p_column_search->>'to_chuc')||'%')
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
    CASE WHEN p_sort = 'to_chuc_asc'          THEN s.to_chuc        END ASC  NULLS LAST,
    CASE WHEN p_sort = 'to_chuc_desc'         THEN s.to_chuc        END DESC NULLS LAST,
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


GRANT ALL ON FUNCTION public.get_hngh_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_xa_phuong_id bigint, p_doi_tuong text[], p_ton_giao text[], p_trang_thai text[], p_dan_toc_ids bigint[], p_xa_phuong_ids bigint[], p_column_search jsonb, p_to_chuc text[]) TO anon;
GRANT ALL ON FUNCTION public.get_hngh_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_xa_phuong_id bigint, p_doi_tuong text[], p_ton_giao text[], p_trang_thai text[], p_dan_toc_ids bigint[], p_xa_phuong_ids bigint[], p_column_search jsonb, p_to_chuc text[]) TO authenticated;
GRANT ALL ON FUNCTION public.get_hngh_page(p_search text, p_limit integer, p_offset integer, p_sort text, p_view_all boolean, p_viewer_xa_phuong_id bigint, p_doi_tuong text[], p_ton_giao text[], p_trang_thai text[], p_dan_toc_ids bigint[], p_xa_phuong_ids bigint[], p_column_search jsonb, p_to_chuc text[]) TO service_role;

COMMIT;
