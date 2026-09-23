-- =============================================================================
-- Ô tìm kiếm tổng (toolbar) trên các trang phân trang server: tìm được trên
-- MỌI cột hiển thị + cột liên kết, không phân biệt dấu, theo dạng hiển thị.
--
-- Trước đây mỗi RPC chỉ ILIKE vài cột (get_cong_viec_page chỉ ten_cong_viec),
-- phân biệt dấu ("nguyen" không ra "Nguyễn"), ngày so dạng ISO, tiền so số thô,
-- và ký tự % / _ người dùng gõ bị hiểu là wildcard.
--
-- Mỗi hàm dưới đây là bản live (pg_get_functiondef) — chỉ thay khối p_search,
-- giữ nguyên chữ ký, cột trả về, phạm vi xem, bộ lọc, sắp xếp.
-- Client khớp tương ứng: lib/searchUtils.ts (bỏ dấu + DD/MM/YYYY + 1.000.000).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

/** Chuẩn hoá để so khớp: bỏ dấu tiếng Việt (kể cả đ/Đ) + thường hoá. */
CREATE OR REPLACE FUNCTION public.fn_chuan_hoa_tim_kiem(p_text text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT lower(extensions.unaccent('extensions.unaccent'::regdictionary,
                                   translate(coalesce(p_text, ''), 'đĐ', 'dD')));
$$;

/**
 * Mẫu LIKE '%…%' từ chuỗi người dùng gõ: trim, chuẩn hoá như trên, escape \ % _
 * (ký tự thoát mặc định của LIKE là '\').
 */
CREATE OR REPLACE FUNCTION public.fn_mau_tim_kiem(p_search text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT '%' || replace(replace(replace(
           public.fn_chuan_hoa_tim_kiem(btrim(p_search)),
           '\', '\\'), '%', '\%'), '_', '\_') || '%';
$$;

-- ---------------------------------------------------------------------------
-- get_cong_viec_page
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cong_viec_page(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_list_scope text DEFAULT 'mine_do'::text, p_viewer_nhan_vien_id bigint DEFAULT NULL::bigint, p_trang_thai text[] DEFAULT NULL::text[], p_muc_do text[] DEFAULT NULL::text[], p_id_chuong_trinh bigint[] DEFAULT NULL::bigint[], p_chuong_trinh_include_null boolean DEFAULT false, p_sort text DEFAULT NULL::text)
 RETURNS TABLE(id bigint, muc_do text, ten_cong_viec text, ghi_chu text, link_tai_lieu text, thoi_han date, tien_do smallint, id_trach_nhiem bigint, ids_ho_tro bigint[], trang_thai text, ket_qua text, link_kq text, ngay_hoan_thanh date, id_nguoi_tao bigint, tg_tao timestamp with time zone, tg_cap_nhat timestamp with time zone, id_chuong_trinh bigint, ho_va_ten_trach_nhiem text, ten_tai_khoan_trach_nhiem text, ho_va_ten_nguoi_tao text, ten_tai_khoan_nguoi_tao text, ten_chuong_trinh text, ho_tro_display text, total_count bigint)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT
    c.id, c.muc_do, c.ten_cong_viec, c.ghi_chu, c.link_tai_lieu, c.thoi_han,
    c.tien_do, c.id_trach_nhiem, c.ids_ho_tro, c.trang_thai, c.ket_qua,
    c.link_kq, c.ngay_hoan_thanh, c.id_nguoi_tao, c.tg_tao, c.tg_cap_nhat,
    c.id_chuong_trinh,
    tn.ho_va_ten     AS ho_va_ten_trach_nhiem,
    tn.ten_tai_khoan AS ten_tai_khoan_trach_nhiem,
    nt.ho_va_ten     AS ho_va_ten_nguoi_tao,
    nt.ten_tai_khoan AS ten_tai_khoan_nguoi_tao,
    ct.ten_chuong_trinh,
    COALESCE(ht.display, '') AS ho_tro_display,
    COUNT(*) OVER () AS total_count
  FROM public.cong_viec_danh_sach c
  LEFT JOIN public.var_nhan_vien   tn ON tn.id = c.id_trach_nhiem
  LEFT JOIN public.var_nhan_vien   nt ON nt.id = c.id_nguoi_tao
  LEFT JOIN public.chuong_trinh_nam ct ON ct.id = c.id_chuong_trinh
  LEFT JOIN LATERAL (
    SELECT string_agg(COALESCE(nv2.ho_va_ten, u.nv_id::text), ', ' ORDER BY u.ord) AS display
    FROM unnest(c.ids_ho_tro) WITH ORDINALITY AS u(nv_id, ord)
    LEFT JOIN public.var_nhan_vien nv2 ON nv2.id = u.nv_id
  ) ht ON true
  WHERE (
      p_search IS NULL
      OR public.fn_chuan_hoa_tim_kiem(concat_ws(' ',
        c.ten_cong_viec,
        ct.ten_chuong_trinh,
        c.muc_do,
        c.thoi_han::text,
        to_char(c.thoi_han, 'DD/MM/YYYY'),
        CASE
          WHEN c.trang_thai = 'Hủy'        THEN 'Đã hủy'
          WHEN c.trang_thai = 'Hoàn thành' THEN 'Đã hoàn thành'
          WHEN c.thoi_han IS NULL          THEN 'Chưa có thời hạn'
          WHEN c.thoi_han < (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date THEN 'Quá hạn ' || ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - c.thoi_han) || ' ngày'
          WHEN c.thoi_han = (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date THEN 'Hết hạn hôm nay'
          ELSE 'Còn ' || (c.thoi_han - (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) || ' ngày'
        END,
        c.trang_thai,
        tn.ho_va_ten,
        tn.ten_tai_khoan,
        ht.display,
        nt.ho_va_ten,
        nt.ten_tai_khoan,
        c.ket_qua,
        to_char(c.tg_cap_nhat AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI')
      )) LIKE public.fn_mau_tim_kiem(p_search)
    )
    AND (
      p_viewer_nhan_vien_id IS NULL
      OR (p_list_scope = 'mine_do' AND c.id_trach_nhiem = p_viewer_nhan_vien_id)
      OR (p_list_scope = 'mine_related' AND p_viewer_nhan_vien_id = ANY (c.ids_ho_tro))
      OR (p_list_scope = 'mine_assign' AND c.id_nguoi_tao = p_viewer_nhan_vien_id)
    )
    AND (p_trang_thai IS NULL OR cardinality(p_trang_thai) = 0 OR c.trang_thai = ANY (p_trang_thai))
    AND (p_muc_do IS NULL OR cardinality(p_muc_do) = 0 OR c.muc_do = ANY (p_muc_do))
    AND (
      (
        (p_id_chuong_trinh IS NULL OR cardinality(p_id_chuong_trinh) = 0)
        AND NOT COALESCE(p_chuong_trinh_include_null, false)
      )
      OR (
        (
          p_id_chuong_trinh IS NOT NULL
          AND cardinality(p_id_chuong_trinh) > 0
          AND c.id_chuong_trinh = ANY (p_id_chuong_trinh)
        )
        OR (COALESCE(p_chuong_trinh_include_null, false) AND c.id_chuong_trinh IS NULL)
      )
    )
  ORDER BY
    CASE WHEN p_sort = 'ten_cong_viec_asc'             THEN c.ten_cong_viec      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_cong_viec_desc'            THEN c.ten_cong_viec      END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_chuong_trinh_asc'          THEN ct.ten_chuong_trinh  END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_chuong_trinh_desc'         THEN ct.ten_chuong_trinh  END DESC NULLS LAST,
    CASE WHEN p_sort = 'muc_do_asc'                    THEN c.muc_do             END ASC  NULLS LAST,
    CASE WHEN p_sort = 'muc_do_desc'                   THEN c.muc_do             END DESC NULLS LAST,
    CASE WHEN p_sort = 'thoi_han_asc'                  THEN c.thoi_han           END ASC  NULLS LAST,
    CASE WHEN p_sort = 'thoi_han_desc'                 THEN c.thoi_han           END DESC NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_asc'                THEN c.trang_thai         END ASC  NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_desc'               THEN c.trang_thai         END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_trach_nhiem_asc'     THEN tn.ho_va_ten         END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_trach_nhiem_desc'    THEN tn.ho_va_ten         END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_tro_display_asc'            THEN ht.display           END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_tro_display_desc'           THEN ht.display           END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_asc'       THEN nt.ho_va_ten         END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_desc'      THEN nt.ho_va_ten         END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_asc'               THEN c.tg_cap_nhat        END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_desc'              THEN c.tg_cap_nhat        END DESC NULLS LAST,
    -- Cột "tiến độ": nhỏ hơn = gấp hơn. Khớp deadlineProgressSortKey().
    CASE WHEN p_sort = 'tien_do_asc' THEN
      CASE c.trang_thai
        WHEN 'Hủy'        THEN 400000
        WHEN 'Hoàn thành' THEN 300000
        ELSE COALESCE((c.thoi_han - CURRENT_DATE), 200000)
      END
    END ASC NULLS LAST,
    CASE WHEN p_sort = 'tien_do_desc' THEN
      CASE c.trang_thai
        WHEN 'Hủy'        THEN 400000
        WHEN 'Hoàn thành' THEN 300000
        ELSE COALESCE((c.thoi_han - CURRENT_DATE), 200000)
      END
    END DESC NULLS LAST,
    c.thoi_han DESC NULLS LAST, c.ten_cong_viec ASC, c.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$function$;

-- ---------------------------------------------------------------------------
-- get_bai_viet_page
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_bai_viet_page(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_scope text DEFAULT 'all'::text, p_viewer_nhan_vien_id bigint DEFAULT NULL::bigint, p_viewer_don_vi_id bigint DEFAULT NULL::bigint, p_the_loai_ids bigint[] DEFAULT NULL::bigint[], p_nguon_dang_ids bigint[] DEFAULT NULL::bigint[], p_trang_dang_ids bigint[] DEFAULT NULL::bigint[], p_id_nguoi_tao bigint[] DEFAULT NULL::bigint[], p_sort text DEFAULT NULL::text)
 RETURNS TABLE(id bigint, ten_bai text, id_the_loai bigint, don_gia numeric, ngay_dang date, id_nguon_dang bigint, id_trang_dang bigint, link text, id_nguoi_tao bigint, tg_tao timestamp with time zone, tg_cap_nhat timestamp with time zone, ten_the_loai text, ten_nguon_dang text, ten_trang_dang text, ho_va_ten_nguoi_tao text, ten_tai_khoan_nguoi_tao text, id_phong_ban_nguoi_tao bigint, don_vi_id_nguoi_tao bigint, total_count bigint)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT
    b.id, b.ten_bai, b.id_the_loai, b.don_gia, b.ngay_dang,
    b.id_nguon_dang, b.id_trang_dang, b.link, b.id_nguoi_tao,
    b.tg_tao, b.tg_cap_nhat,
    tl.ten_the_loai,
    nd.ten AS ten_nguon_dang,
    td.ten AS ten_trang_dang,
    nv.ho_va_ten     AS ho_va_ten_nguoi_tao,
    nv.ten_tai_khoan AS ten_tai_khoan_nguoi_tao,
    nv.id_phong_ban  AS id_phong_ban_nguoi_tao,
    nv.don_vi_id     AS don_vi_id_nguoi_tao,
    COUNT(*) OVER () AS total_count
  FROM public.bai_viet_danh_sach b
  LEFT JOIN public.bai_viet_thiet_lap_the_loai tl ON tl.id = b.id_the_loai
  LEFT JOIN public.bai_viet_thiet_lap_khac     nd ON nd.id = b.id_nguon_dang
  LEFT JOIN public.bai_viet_thiet_lap_khac     td ON td.id = b.id_trang_dang
  LEFT JOIN public.var_nhan_vien               nv ON nv.id = b.id_nguoi_tao
  WHERE (
      p_search IS NULL
      OR public.fn_chuan_hoa_tim_kiem(concat_ws(' ',
        b.ten_bai,
        tl.ten_the_loai,
        b.don_gia::text, replace(to_char(round(b.don_gia), 'FM999,999,999,999,990'), ',', '.'),
        b.ngay_dang::text,
        to_char(b.ngay_dang, 'DD/MM/YYYY'),
        nd.ten,
        td.ten,
        b.link,
        nv.ho_va_ten,
        nv.ten_tai_khoan,
        to_char(b.tg_cap_nhat AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI')
      )) LIKE public.fn_mau_tim_kiem(p_search)
    )
    AND (
      p_scope = 'all'
      OR (p_scope = 'mine' AND p_viewer_nhan_vien_id IS NOT NULL AND b.id_nguoi_tao = p_viewer_nhan_vien_id)
      OR (p_scope = 'all_don_vi' AND p_viewer_don_vi_id IS NOT NULL AND nv.don_vi_id = p_viewer_don_vi_id)
    )
    AND (p_the_loai_ids   IS NULL OR cardinality(p_the_loai_ids)   = 0 OR b.id_the_loai   = ANY (p_the_loai_ids))
    AND (p_nguon_dang_ids IS NULL OR cardinality(p_nguon_dang_ids) = 0 OR b.id_nguon_dang = ANY (p_nguon_dang_ids))
    AND (p_trang_dang_ids IS NULL OR cardinality(p_trang_dang_ids) = 0 OR b.id_trang_dang = ANY (p_trang_dang_ids))
    AND (p_id_nguoi_tao   IS NULL OR cardinality(p_id_nguoi_tao)   = 0 OR b.id_nguoi_tao  = ANY (p_id_nguoi_tao))
  ORDER BY
    CASE WHEN p_sort = 'ten_bai_asc'              THEN b.ten_bai       END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_bai_desc'             THEN b.ten_bai       END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_the_loai_asc'         THEN tl.ten_the_loai END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_the_loai_desc'        THEN tl.ten_the_loai END DESC NULLS LAST,
    CASE WHEN p_sort = 'don_gia_asc'              THEN b.don_gia       END ASC  NULLS LAST,
    CASE WHEN p_sort = 'don_gia_desc'             THEN b.don_gia       END DESC NULLS LAST,
    CASE WHEN p_sort = 'ngay_dang_asc'            THEN b.ngay_dang     END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ngay_dang_desc'           THEN b.ngay_dang     END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_nguon_dang_asc'       THEN nd.ten          END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_nguon_dang_desc'      THEN nd.ten          END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_trang_dang_asc'       THEN td.ten          END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_trang_dang_desc'      THEN td.ten          END DESC NULLS LAST,
    CASE WHEN p_sort = 'link_asc'                 THEN b.link          END ASC  NULLS LAST,
    CASE WHEN p_sort = 'link_desc'                THEN b.link          END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_asc'  THEN nv.ho_va_ten    END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_desc' THEN nv.ho_va_ten    END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_asc'          THEN b.tg_cap_nhat   END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_desc'         THEN b.tg_cap_nhat   END DESC NULLS LAST,
    b.ngay_dang DESC NULLS LAST, b.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$function$;

-- ---------------------------------------------------------------------------
-- get_kho_nhap_xuat_kho_page
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_kho_nhap_xuat_kho_page(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_sort text DEFAULT NULL::text, p_view_all boolean DEFAULT true, p_viewer_don_vi_id bigint DEFAULT NULL::bigint, p_loai_phieu text DEFAULT NULL::text, p_kho_id bigint DEFAULT NULL::bigint, p_don_vi_cuu_tro_id bigint DEFAULT NULL::bigint, p_dot_cuu_tro_id bigint DEFAULT NULL::bigint, p_column_search jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(id bigint, tt integer, so_phieu text, loai_phieu text, ngay_phieu date, kho_xuat_id bigint, ten_kho_xuat text, kho_xuat_don_vi_id bigint, kho_nhap_id bigint, ten_kho_nhap text, kho_nhap_don_vi_id bigint, don_vi_cuu_tro_id bigint, ten_don_vi_cuu_tro text, dot_cuu_tro_id bigint, ten_dot_cuu_tro text, so_dong bigint, id_nguoi_tao bigint, ho_va_ten_nguoi_tao text, tg_tao timestamp with time zone, tg_cap_nhat timestamp with time zone, total_count bigint)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT
    p.id, p.tt, p.so_phieu, p.loai_phieu, p.ngay_phieu,
    p.kho_xuat_id, kx.ten_kho AS ten_kho_xuat, kx.don_vi_id AS kho_xuat_don_vi_id,
    p.kho_nhap_id, kn.ten_kho AS ten_kho_nhap, kn.don_vi_id AS kho_nhap_don_vi_id,
    p.don_vi_cuu_tro_id, dv.ten AS ten_don_vi_cuu_tro,
    p.dot_cuu_tro_id,    dt.ten AS ten_dot_cuu_tro,
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

-- ---------------------------------------------------------------------------
-- get_kho_nhap_xuat_kho_ct_page
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_kho_nhap_xuat_kho_ct_page(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_sort text DEFAULT NULL::text, p_view_all boolean DEFAULT true, p_viewer_don_vi_id bigint DEFAULT NULL::bigint, p_loai_phieu text DEFAULT NULL::text, p_kho_id bigint DEFAULT NULL::bigint, p_hang_hoa_id bigint DEFAULT NULL::bigint, p_column_search jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(id bigint, phieu_id bigint, so_phieu text, loai_phieu text, ngay_phieu date, kho_xuat_id bigint, ten_kho_xuat text, kho_xuat_don_vi_id bigint, kho_nhap_id bigint, ten_kho_nhap text, kho_nhap_don_vi_id bigint, don_vi_cuu_tro_id bigint, ten_don_vi_cuu_tro text, dot_cuu_tro_id bigint, ten_dot_cuu_tro text, hang_hoa_id bigint, ten_hang_hoa text, don_vi_tinh text, so_luong numeric, don_gia numeric, thanh_tien numeric, ghi_chu text, total_count bigint)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT
    c.id, c.phieu_id, p.so_phieu, p.loai_phieu, p.ngay_phieu,
    p.kho_xuat_id, kx.ten_kho AS ten_kho_xuat, kx.don_vi_id AS kho_xuat_don_vi_id,
    p.kho_nhap_id, kn.ten_kho AS ten_kho_nhap, kn.don_vi_id AS kho_nhap_don_vi_id,
    p.don_vi_cuu_tro_id, dv.ten AS ten_don_vi_cuu_tro,
    p.dot_cuu_tro_id,    dt.ten AS ten_dot_cuu_tro,
    c.hang_hoa_id, hh.ten_hang_hoa,
    c.don_vi_tinh, c.so_luong, c.don_gia, c.thanh_tien, c.ghi_chu,
    COUNT(*) OVER () AS total_count
  FROM public.kho_nhap_xuat_kho_ct c
  JOIN      public.kho_nhap_xuat_kho      p  ON p.id  = c.phieu_id
  LEFT JOIN public.kho_danh_sach_kho      kx ON kx.id = p.kho_xuat_id
  LEFT JOIN public.kho_danh_sach_kho      kn ON kn.id = p.kho_nhap_id
  LEFT JOIN public.kho_don_vi_cuu_tro     dv ON dv.id = p.don_vi_cuu_tro_id
  LEFT JOIN public.kho_dot_cuu_tro        dt ON dt.id = p.dot_cuu_tro_id
  LEFT JOIN public.kho_danh_sach_hang_hoa hh ON hh.id = c.hang_hoa_id
  WHERE (
      p_search IS NULL
      OR public.fn_chuan_hoa_tim_kiem(concat_ws(' ',
        p.so_phieu,
        CASE p.loai_phieu WHEN 'nhap_ngoai' THEN 'Nhập từ ngoài' WHEN 'xuat_ngoai' THEN 'Xuất ra ngoài' WHEN 'chuyen_kho' THEN 'Chuyển kho' END,
        p.ngay_phieu::text,
        to_char(p.ngay_phieu, 'DD/MM/YYYY'),
        hh.ten_hang_hoa,
        c.don_vi_tinh,
        trim_scale(c.so_luong)::text, replace(trim_scale(c.so_luong)::text, '.', ','),
        c.don_gia::text, replace(to_char(round(c.don_gia), 'FM999,999,999,999,990'), ',', '.'),
        c.thanh_tien::text, replace(to_char(round(c.thanh_tien), 'FM999,999,999,999,990'), ',', '.'),
        kx.ten_kho,
        kn.ten_kho,
        dv.ten,
        dt.ten,
        c.ghi_chu
      )) LIKE public.fn_mau_tim_kiem(p_search)
    )
    AND (
      -- KHÔNG nới lỏng khi thiếu đơn vị: cán bộ cấp Xã phường chưa được gán
      -- đơn vị phải thấy RỖNG, đúng như canViewNhapXuatKhoRow ở client.
      COALESCE(p_view_all, true)
      OR kx.don_vi_id = p_viewer_don_vi_id
      OR kn.don_vi_id = p_viewer_don_vi_id
    )
    AND (p_loai_phieu  IS NULL OR p.loai_phieu = p_loai_phieu)
    AND (p_kho_id      IS NULL OR p.kho_xuat_id = p_kho_id OR p.kho_nhap_id = p_kho_id)
    AND (p_hang_hoa_id IS NULL OR c.hang_hoa_id = p_hang_hoa_id)
    AND (nullif(btrim(coalesce(p_column_search->>'so_phieu','')),'') IS NULL
         OR p.so_phieu ILIKE '%'||btrim(p_column_search->>'so_phieu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'loai_phieu','')),'') IS NULL
         OR p.loai_phieu ILIKE '%'||btrim(p_column_search->>'loai_phieu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ngay_phieu','')),'') IS NULL
         OR p.ngay_phieu::text ILIKE '%'||btrim(p_column_search->>'ngay_phieu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_hang_hoa','')),'') IS NULL
         OR hh.ten_hang_hoa ILIKE '%'||btrim(p_column_search->>'ten_hang_hoa')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'don_vi_tinh','')),'') IS NULL
         OR c.don_vi_tinh ILIKE '%'||btrim(p_column_search->>'don_vi_tinh')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'so_luong','')),'') IS NULL
         OR c.so_luong::text ILIKE '%'||btrim(p_column_search->>'so_luong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'don_gia','')),'') IS NULL
         OR c.don_gia::text ILIKE '%'||btrim(p_column_search->>'don_gia')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'thanh_tien','')),'') IS NULL
         OR c.thanh_tien::text ILIKE '%'||btrim(p_column_search->>'thanh_tien')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_kho_xuat','')),'') IS NULL
         OR kx.ten_kho ILIKE '%'||btrim(p_column_search->>'ten_kho_xuat')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_kho_nhap','')),'') IS NULL
         OR kn.ten_kho ILIKE '%'||btrim(p_column_search->>'ten_kho_nhap')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_don_vi_cuu_tro','')),'') IS NULL
         OR dv.ten ILIKE '%'||btrim(p_column_search->>'ten_don_vi_cuu_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_dot_cuu_tro','')),'') IS NULL
         OR dt.ten ILIKE '%'||btrim(p_column_search->>'ten_dot_cuu_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ghi_chu','')),'') IS NULL
         OR c.ghi_chu ILIKE '%'||btrim(p_column_search->>'ghi_chu')||'%')
  ORDER BY
    CASE WHEN p_sort = 'so_phieu_asc'      THEN p.so_phieu      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_phieu_desc'     THEN p.so_phieu      END DESC NULLS LAST,
    CASE WHEN p_sort = 'loai_phieu_asc'    THEN p.loai_phieu    END ASC  NULLS LAST,
    CASE WHEN p_sort = 'loai_phieu_desc'   THEN p.loai_phieu    END DESC NULLS LAST,
    CASE WHEN p_sort = 'ngay_phieu_asc'    THEN p.ngay_phieu    END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ngay_phieu_desc'   THEN p.ngay_phieu    END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_hang_hoa_asc'  THEN hh.ten_hang_hoa END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_hang_hoa_desc' THEN hh.ten_hang_hoa END DESC NULLS LAST,
    CASE WHEN p_sort = 'don_vi_tinh_asc'   THEN c.don_vi_tinh   END ASC  NULLS LAST,
    CASE WHEN p_sort = 'don_vi_tinh_desc'  THEN c.don_vi_tinh   END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_luong_asc'      THEN c.so_luong      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_luong_desc'     THEN c.so_luong      END DESC NULLS LAST,
    CASE WHEN p_sort = 'don_gia_asc'       THEN c.don_gia       END ASC  NULLS LAST,
    CASE WHEN p_sort = 'don_gia_desc'      THEN c.don_gia       END DESC NULLS LAST,
    CASE WHEN p_sort = 'thanh_tien_asc'    THEN c.thanh_tien    END ASC  NULLS LAST,
    CASE WHEN p_sort = 'thanh_tien_desc'   THEN c.thanh_tien    END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_kho_xuat_asc'  THEN kx.ten_kho      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_kho_xuat_desc' THEN kx.ten_kho      END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_kho_nhap_asc'  THEN kn.ten_kho      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_kho_nhap_desc' THEN kn.ten_kho      END DESC NULLS LAST,
    p.ngay_phieu DESC NULLS LAST, p.so_phieu DESC NULLS LAST, c.thu_tu ASC NULLS LAST, c.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$function$;

-- ---------------------------------------------------------------------------
-- get_dttg_tham_hoi_ca_nhan_page
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dttg_tham_hoi_ca_nhan_page(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_sort text DEFAULT NULL::text, p_view_all boolean DEFAULT true, p_viewer_don_vi_id bigint DEFAULT NULL::bigint, p_trang_thai text[] DEFAULT NULL::text[], p_ca_nhan_ids bigint[] DEFAULT NULL::bigint[], p_phong_ban_ids bigint[] DEFAULT NULL::bigint[], p_xa_phuong_ids bigint[] DEFAULT NULL::bigint[], p_dip_ids bigint[] DEFAULT NULL::bigint[], p_don_vi_ids bigint[] DEFAULT NULL::bigint[], p_don_vi_include_null boolean DEFAULT false, p_column_search jsonb DEFAULT NULL::jsonb, p_labels jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(id bigint, ca_nhan_id bigint, ho_va_ten text, doi_tuong text, chuc_vu_vi_tri text, phong_ban_tham_muu_id bigint, ten_phong_ban text, dip_tham_hoi_id bigint, dip_tham_hoi text, ten_dip_tham_hoi text, thoi_gian_du_kien date, thoi_gian_thuc_te date, don_vi_tham_hoi_id bigint, ten_don_vi_tham_hoi text, qua_tang text, xa_phuong_id bigint, ten_xa_phuong text, trang_thai text, ket_qua_ghi_chu text, link_ket_qua text, id_nguoi_tao bigint, ho_va_ten_nguoi_tao text, ten_tai_khoan_nguoi_tao text, tg_tao timestamp with time zone, tg_cap_nhat timestamp with time zone, total_count bigint)
 LANGUAGE sql
 STABLE
AS $function$
  WITH src AS (
    SELECT
      t.*,
      cn.ho_va_ten,
      COALESCE(NULLIF(btrim(t.doi_tuong), ''), cn.doi_tuong)           AS doi_tuong_display,
      COALESCE(NULLIF(btrim(t.chuc_vu_vi_tri), ''), cn.chuc_vu_vi_tri) AS chuc_vu_display,
      pb.ten_phong_ban,
      dp.ten_dip        AS ten_dip_tham_hoi,
      dvt.ten           AS ten_don_vi_tham_hoi,
      xp.ten            AS ten_xa_phuong,
      nt.ho_va_ten      AS ho_va_ten_nguoi_tao,
      nt.ten_tai_khoan  AS ten_tai_khoan_nguoi_tao,
      -- Cột "Đơn vị thăm hỏi": trống ⇒ cơ quan MTTQ tỉnh (formatDonViThamHoiDisplay).
      CASE
        WHEN t.don_vi_tham_hoi_id IS NULL THEN COALESCE(p_labels->>'don_vi_cqmttq', '')
        ELSE COALESCE(NULLIF(btrim(dvt.ten), ''), t.don_vi_tham_hoi_id::text)
      END AS don_vi_tham_hoi_display,
      -- Cột "Thời gian dự kiến": hiển thị MM/YYYY (formatMonthYear).
      COALESCE(to_char(t.thoi_gian_du_kien, 'MM/YYYY'), '') AS thoi_gian_du_kien_display
    FROM public.dttg_tham_hoi_ca_nhan t
    LEFT JOIN public.dttg_thong_tin_ca_nhan_tieu_bieu cn  ON cn.id  = t.ca_nhan_id
    LEFT JOIN public.var_phong_ban                    pb  ON pb.id  = t.phong_ban_tham_muu_id
    LEFT JOIN public.dttg_dip_tham_hoi                dp  ON dp.id  = t.dip_tham_hoi_id
    LEFT JOIN public.var_ssn_xa_phuong                dvt ON dvt.id = t.don_vi_tham_hoi_id
    LEFT JOIN public.var_ssn_xa_phuong                xp  ON xp.id  = t.xa_phuong_id
    LEFT JOIN public.var_nhan_vien                    nt  ON nt.id  = t.id_nguoi_tao
  )
  SELECT
    s.id, s.ca_nhan_id, s.ho_va_ten, s.doi_tuong_display, s.chuc_vu_display,
    s.phong_ban_tham_muu_id, s.ten_phong_ban,
    s.dip_tham_hoi_id, s.dip_tham_hoi, s.ten_dip_tham_hoi,
    s.thoi_gian_du_kien, s.thoi_gian_thuc_te,
    s.don_vi_tham_hoi_id, s.ten_don_vi_tham_hoi,
    s.qua_tang, s.xa_phuong_id, s.ten_xa_phuong,
    s.trang_thai, s.ket_qua_ghi_chu, s.link_ket_qua,
    s.id_nguoi_tao, s.ho_va_ten_nguoi_tao, s.ten_tai_khoan_nguoi_tao,
    s.tg_tao, s.tg_cap_nhat,
    COUNT(*) OVER () AS total_count
  FROM src s
  WHERE (
      p_search IS NULL
      OR public.fn_chuan_hoa_tim_kiem(concat_ws(' ',
        s.ho_va_ten,
        s.doi_tuong_display,
        s.chuc_vu_display,
        s.dip_tham_hoi,
        s.ten_dip_tham_hoi,
        s.thoi_gian_du_kien_display,
        s.don_vi_tham_hoi_display,
        s.ten_phong_ban,
        s.qua_tang,
        s.ten_xa_phuong,
        s.trang_thai,
        s.ket_qua_ghi_chu,
        s.link_ket_qua,
        to_char(s.tg_cap_nhat AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI')
      )) LIKE public.fn_mau_tim_kiem(p_search)
    )
    -- KHÔNG có nhánh "p_viewer_don_vi_id IS NULL thì cho xem hết": cán bộ cấp Xã
    -- phường chưa được gán đơn vị phải thấy RỖNG, đúng như hàm gate ở client.
    -- Cấp khác (không bị giới hạn theo đơn vị) thì client gửi p_view_all = true.
    AND (
      COALESCE(p_view_all, true)
      OR s.don_vi_tham_hoi_id = p_viewer_don_vi_id
      OR s.xa_phuong_id       = p_viewer_don_vi_id
    )
    AND (p_trang_thai    IS NULL OR cardinality(p_trang_thai)    = 0 OR s.trang_thai            = ANY (p_trang_thai))
    AND (p_ca_nhan_ids   IS NULL OR cardinality(p_ca_nhan_ids)   = 0 OR s.ca_nhan_id            = ANY (p_ca_nhan_ids))
    AND (p_phong_ban_ids IS NULL OR cardinality(p_phong_ban_ids) = 0 OR s.phong_ban_tham_muu_id = ANY (p_phong_ban_ids))
    AND (p_xa_phuong_ids IS NULL OR cardinality(p_xa_phuong_ids) = 0 OR s.xa_phuong_id          = ANY (p_xa_phuong_ids))
    AND (p_dip_ids       IS NULL OR cardinality(p_dip_ids)       = 0 OR s.dip_tham_hoi_id       = ANY (p_dip_ids))
    AND (
      ((p_don_vi_ids IS NULL OR cardinality(p_don_vi_ids) = 0) AND NOT COALESCE(p_don_vi_include_null, false))
      OR (p_don_vi_ids IS NOT NULL AND cardinality(p_don_vi_ids) > 0 AND s.don_vi_tham_hoi_id = ANY (p_don_vi_ids))
      OR (COALESCE(p_don_vi_include_null, false) AND s.don_vi_tham_hoi_id IS NULL)
    )
    AND (nullif(btrim(coalesce(p_column_search->>'ho_va_ten','')),'') IS NULL
         OR s.ho_va_ten ILIKE '%'||btrim(p_column_search->>'ho_va_ten')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'doi_tuong','')),'') IS NULL
         OR s.doi_tuong_display ILIKE '%'||btrim(p_column_search->>'doi_tuong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'chuc_vu_vi_tri','')),'') IS NULL
         OR s.chuc_vu_display ILIKE '%'||btrim(p_column_search->>'chuc_vu_vi_tri')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'dip_tham_hoi','')),'') IS NULL
         OR s.dip_tham_hoi ILIKE '%'||btrim(p_column_search->>'dip_tham_hoi')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'thoi_gian_du_kien','')),'') IS NULL
         OR s.thoi_gian_du_kien_display ILIKE '%'||btrim(p_column_search->>'thoi_gian_du_kien')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'don_vi_tham_hoi','')),'') IS NULL
         OR s.don_vi_tham_hoi_display ILIKE '%'||btrim(p_column_search->>'don_vi_tham_hoi')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_phong_ban','')),'') IS NULL
         OR s.ten_phong_ban ILIKE '%'||btrim(p_column_search->>'ten_phong_ban')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'qua_tang','')),'') IS NULL
         OR s.qua_tang ILIKE '%'||btrim(p_column_search->>'qua_tang')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_xa_phuong','')),'') IS NULL
         OR s.ten_xa_phuong ILIKE '%'||btrim(p_column_search->>'ten_xa_phuong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'trang_thai','')),'') IS NULL
         OR s.trang_thai ILIKE '%'||btrim(p_column_search->>'trang_thai')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ket_qua_ghi_chu','')),'') IS NULL
         OR s.ket_qua_ghi_chu ILIKE '%'||btrim(p_column_search->>'ket_qua_ghi_chu')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'link_ket_qua','')),'') IS NULL
         OR s.link_ket_qua ILIKE '%'||btrim(p_column_search->>'link_ket_qua')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tg_cap_nhat','')),'') IS NULL
         OR to_char(s.tg_cap_nhat, 'DD/MM/YYYY') ILIKE '%'||btrim(p_column_search->>'tg_cap_nhat')||'%')
  ORDER BY
    CASE WHEN p_sort = 'ho_va_ten_asc'          THEN s.ho_va_ten                 END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_desc'         THEN s.ho_va_ten                 END DESC NULLS LAST,
    CASE WHEN p_sort = 'dip_tham_hoi_asc'       THEN s.dip_tham_hoi              END ASC  NULLS LAST,
    CASE WHEN p_sort = 'dip_tham_hoi_desc'      THEN s.dip_tham_hoi              END DESC NULLS LAST,
    CASE WHEN p_sort = 'thoi_gian_du_kien_asc'  THEN s.thoi_gian_du_kien         END ASC  NULLS LAST,
    CASE WHEN p_sort = 'thoi_gian_du_kien_desc' THEN s.thoi_gian_du_kien         END DESC NULLS LAST,
    CASE WHEN p_sort = 'don_vi_tham_hoi_asc'    THEN s.don_vi_tham_hoi_display   END ASC  NULLS LAST,
    CASE WHEN p_sort = 'don_vi_tham_hoi_desc'   THEN s.don_vi_tham_hoi_display   END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_phong_ban_asc'      THEN s.ten_phong_ban             END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_phong_ban_desc'     THEN s.ten_phong_ban             END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_xa_phuong_asc'      THEN s.ten_xa_phuong             END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_xa_phuong_desc'     THEN s.ten_xa_phuong             END DESC NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_asc'         THEN s.trang_thai                END ASC  NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_desc'        THEN s.trang_thai                END DESC NULLS LAST,
    CASE WHEN p_sort = 'ket_qua_ghi_chu_asc'    THEN s.ket_qua_ghi_chu           END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ket_qua_ghi_chu_desc'   THEN s.ket_qua_ghi_chu           END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_asc'        THEN s.tg_cap_nhat               END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_desc'       THEN s.tg_cap_nhat               END DESC NULLS LAST,
    s.tg_cap_nhat DESC NULLS LAST, s.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$function$;

-- ---------------------------------------------------------------------------
-- get_dttg_tham_hoi_to_chuc_page
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dttg_tham_hoi_to_chuc_page(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_sort text DEFAULT NULL::text, p_view_all boolean DEFAULT true, p_viewer_don_vi_id bigint DEFAULT NULL::bigint, p_tien_do text[] DEFAULT NULL::text[], p_to_chuc_ids bigint[] DEFAULT NULL::bigint[], p_dip_ids bigint[] DEFAULT NULL::bigint[], p_don_vi_ids bigint[] DEFAULT NULL::bigint[], p_don_vi_include_null boolean DEFAULT false, p_phong_ban_ids bigint[] DEFAULT NULL::bigint[], p_column_search jsonb DEFAULT NULL::jsonb, p_labels jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(id bigint, to_chuc_id bigint, ten_co_so text, loai_hinh text, dip_tham_hoi_id bigint, dip_tham_hoi text, ten_dip_tham_hoi text, thoi_gian_du_kien text, thoi_gian_thuc_te date, don_vi_tham_hoi_id bigint, ten_don_vi_tham_hoi text, phong_ban_tham_muu_id bigint, ten_phong_ban text, noi_dung_tham_hoi text, thanh_phan_doan text, qua_tang text, tien_do text, ket_qua_thuc_hien text, link_ket_qua text, id_nguoi_tao bigint, ho_va_ten_nguoi_tao text, ten_tai_khoan_nguoi_tao text, tg_tao timestamp with time zone, tg_cap_nhat timestamp with time zone, total_count bigint)
 LANGUAGE sql
 STABLE
AS $function$
  WITH src AS (
    SELECT
      t.*,
      tc.ten_co_so,
      tc.loai_hinh,
      dp.ten_dip       AS ten_dip_tham_hoi,
      dvt.ten          AS ten_don_vi_tham_hoi,
      pb.ten_phong_ban,
      nt.ho_va_ten     AS ho_va_ten_nguoi_tao,
      nt.ten_tai_khoan AS ten_tai_khoan_nguoi_tao,
      CASE
        WHEN t.don_vi_tham_hoi_id IS NULL THEN COALESCE(p_labels->>'don_vi_cqmttq', '')
        ELSE COALESCE(NULLIF(btrim(dvt.ten), ''), t.don_vi_tham_hoi_id::text)
      END AS don_vi_tham_hoi_display
    FROM public.dttg_tham_hoi_to_chuc t
    LEFT JOIN public.dttg_thong_tin_to_chuc_quan_trong tc  ON tc.id  = t.to_chuc_id
    LEFT JOIN public.dttg_dip_tham_hoi                 dp  ON dp.id  = t.dip_tham_hoi_id
    LEFT JOIN public.var_ssn_xa_phuong                 dvt ON dvt.id = t.don_vi_tham_hoi_id
    LEFT JOIN public.var_phong_ban                     pb  ON pb.id  = t.phong_ban_tham_muu_id
    LEFT JOIN public.var_nhan_vien                     nt  ON nt.id  = t.id_nguoi_tao
  )
  SELECT
    s.id, s.to_chuc_id, s.ten_co_so, s.loai_hinh,
    s.dip_tham_hoi_id, s.dip_tham_hoi, s.ten_dip_tham_hoi,
    s.thoi_gian_du_kien, s.thoi_gian_thuc_te,
    s.don_vi_tham_hoi_id, s.ten_don_vi_tham_hoi,
    s.phong_ban_tham_muu_id, s.ten_phong_ban,
    s.noi_dung_tham_hoi, s.thanh_phan_doan, s.qua_tang, s.tien_do,
    s.ket_qua_thuc_hien, s.link_ket_qua,
    s.id_nguoi_tao, s.ho_va_ten_nguoi_tao, s.ten_tai_khoan_nguoi_tao,
    s.tg_tao, s.tg_cap_nhat,
    COUNT(*) OVER () AS total_count
  FROM src s
  WHERE (
      p_search IS NULL
      OR public.fn_chuan_hoa_tim_kiem(concat_ws(' ',
        s.ten_co_so,
        s.loai_hinh,
        s.dip_tham_hoi,
        s.ten_dip_tham_hoi,
        s.thoi_gian_du_kien,
        s.don_vi_tham_hoi_display,
        s.ten_phong_ban,
        s.noi_dung_tham_hoi,
        s.thanh_phan_doan,
        s.qua_tang,
        s.tien_do,
        s.ket_qua_thuc_hien,
        s.link_ket_qua,
        to_char(s.tg_cap_nhat AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI')
      )) LIKE public.fn_mau_tim_kiem(p_search)
    )
    -- Xem ghi chú ở RPC cá nhân: không nới lỏng khi thiếu đơn vị.
    AND (
      COALESCE(p_view_all, true)
      OR s.don_vi_tham_hoi_id = p_viewer_don_vi_id
    )
    AND (p_tien_do       IS NULL OR cardinality(p_tien_do)       = 0 OR s.tien_do               = ANY (p_tien_do))
    AND (p_to_chuc_ids   IS NULL OR cardinality(p_to_chuc_ids)   = 0 OR s.to_chuc_id            = ANY (p_to_chuc_ids))
    AND (p_dip_ids       IS NULL OR cardinality(p_dip_ids)       = 0 OR s.dip_tham_hoi_id       = ANY (p_dip_ids))
    AND (
      ((p_don_vi_ids IS NULL OR cardinality(p_don_vi_ids) = 0) AND NOT COALESCE(p_don_vi_include_null, false))
      OR (p_don_vi_ids IS NOT NULL AND cardinality(p_don_vi_ids) > 0 AND s.don_vi_tham_hoi_id = ANY (p_don_vi_ids))
      OR (COALESCE(p_don_vi_include_null, false) AND s.don_vi_tham_hoi_id IS NULL)
    )
    AND (p_phong_ban_ids IS NULL OR cardinality(p_phong_ban_ids) = 0 OR s.phong_ban_tham_muu_id = ANY (p_phong_ban_ids))
    AND (nullif(btrim(coalesce(p_column_search->>'ten_co_so','')),'') IS NULL
         OR s.ten_co_so ILIKE '%'||btrim(p_column_search->>'ten_co_so')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'dip_tham_hoi','')),'') IS NULL
         OR s.dip_tham_hoi ILIKE '%'||btrim(p_column_search->>'dip_tham_hoi')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'thoi_gian_du_kien','')),'') IS NULL
         OR s.thoi_gian_du_kien ILIKE '%'||btrim(p_column_search->>'thoi_gian_du_kien')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'don_vi_tham_hoi','')),'') IS NULL
         OR s.don_vi_tham_hoi_display ILIKE '%'||btrim(p_column_search->>'don_vi_tham_hoi')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'noi_dung_tham_hoi','')),'') IS NULL
         OR s.noi_dung_tham_hoi ILIKE '%'||btrim(p_column_search->>'noi_dung_tham_hoi')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'thanh_phan_doan','')),'') IS NULL
         OR s.thanh_phan_doan ILIKE '%'||btrim(p_column_search->>'thanh_phan_doan')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'qua_tang','')),'') IS NULL
         OR s.qua_tang ILIKE '%'||btrim(p_column_search->>'qua_tang')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tien_do','')),'') IS NULL
         OR s.tien_do ILIKE '%'||btrim(p_column_search->>'tien_do')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ket_qua_thuc_hien','')),'') IS NULL
         OR s.ket_qua_thuc_hien ILIKE '%'||btrim(p_column_search->>'ket_qua_thuc_hien')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'link_ket_qua','')),'') IS NULL
         OR s.link_ket_qua ILIKE '%'||btrim(p_column_search->>'link_ket_qua')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tg_cap_nhat','')),'') IS NULL
         OR to_char(s.tg_cap_nhat, 'DD/MM/YYYY') ILIKE '%'||btrim(p_column_search->>'tg_cap_nhat')||'%')
  ORDER BY
    CASE WHEN p_sort = 'ten_co_so_asc'          THEN s.ten_co_so               END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_co_so_desc'         THEN s.ten_co_so               END DESC NULLS LAST,
    CASE WHEN p_sort = 'dip_tham_hoi_asc'       THEN s.dip_tham_hoi            END ASC  NULLS LAST,
    CASE WHEN p_sort = 'dip_tham_hoi_desc'      THEN s.dip_tham_hoi            END DESC NULLS LAST,
    CASE WHEN p_sort = 'thoi_gian_du_kien_asc'  THEN s.thoi_gian_du_kien       END ASC  NULLS LAST,
    CASE WHEN p_sort = 'thoi_gian_du_kien_desc' THEN s.thoi_gian_du_kien       END DESC NULLS LAST,
    CASE WHEN p_sort = 'don_vi_tham_hoi_asc'    THEN s.don_vi_tham_hoi_display END ASC  NULLS LAST,
    CASE WHEN p_sort = 'don_vi_tham_hoi_desc'   THEN s.don_vi_tham_hoi_display END DESC NULLS LAST,
    CASE WHEN p_sort = 'tien_do_asc'            THEN s.tien_do                 END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tien_do_desc'           THEN s.tien_do                 END DESC NULLS LAST,
    CASE WHEN p_sort = 'ket_qua_thuc_hien_asc'  THEN s.ket_qua_thuc_hien       END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ket_qua_thuc_hien_desc' THEN s.ket_qua_thuc_hien       END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_asc'        THEN s.tg_cap_nhat             END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_desc'       THEN s.tg_cap_nhat             END DESC NULLS LAST,
    s.tg_cap_nhat DESC NULLS LAST, s.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$function$;

-- ---------------------------------------------------------------------------
-- get_nddk_page
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_nddk_page(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_sort text DEFAULT NULL::text, p_view_all boolean DEFAULT true, p_viewer_xa_phuong_id bigint DEFAULT NULL::bigint, p_nam integer[] DEFAULT NULL::integer[], p_nguon text[] DEFAULT NULL::text[], p_nguon_ho_tro text[] DEFAULT NULL::text[], p_doi_tuong text[] DEFAULT NULL::text[], p_loai_hinh text[] DEFAULT NULL::text[], p_trang_thai text[] DEFAULT NULL::text[], p_xa_phuong_ids bigint[] DEFAULT NULL::bigint[], p_column_search jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(id bigint, noi_dung_ho_tro text, nam integer, nguon text, nguon_ho_tro text, ho_ten_chu_ho text, xa_phuong_id bigint, ten_xa_phuong text, khoi_xom text, doi_tuong text, loai_hinh_ho_tro text, so_tien numeric, trang_thai text, ngay_cap_nhat_trang_thai timestamp with time zone, ghi_chu text, id_nguoi_tao bigint, ho_va_ten_nguoi_tao text, ten_tai_khoan_nguoi_tao text, tg_tao timestamp with time zone, tg_cap_nhat timestamp with time zone, total_count bigint)
 LANGUAGE sql
 STABLE
AS $function$
  WITH src AS (
    SELECT
      t.*,
      xp.ten           AS ten_xa_phuong,
      nt.ho_va_ten     AS ho_va_ten_nguoi_tao,
      nt.ten_tai_khoan AS ten_tai_khoan_nguoi_tao,
      COALESCE(NULLIF(btrim(nt.ho_va_ten), ''), NULLIF(btrim(nt.ten_tai_khoan), ''), '')
        AS nguoi_tao_display
    FROM public.nddk_nha_dai_doan_ket t
    LEFT JOIN public.var_ssn_xa_phuong xp ON xp.id = t.xa_phuong_id
    LEFT JOIN public.var_nhan_vien     nt ON nt.id = t.id_nguoi_tao
  )
  SELECT
    s.id, s.noi_dung_ho_tro, s.nam, s.nguon, s.nguon_ho_tro,
    s.ho_ten_chu_ho, s.xa_phuong_id, s.ten_xa_phuong, s.khoi_xom,
    s.doi_tuong, s.loai_hinh_ho_tro, s.so_tien,
    s.trang_thai, s.ngay_cap_nhat_trang_thai, s.ghi_chu,
    s.id_nguoi_tao, s.ho_va_ten_nguoi_tao, s.ten_tai_khoan_nguoi_tao,
    s.tg_tao, s.tg_cap_nhat,
    COUNT(*) OVER () AS total_count
  FROM src s
  WHERE (
      p_search IS NULL
      OR public.fn_chuan_hoa_tim_kiem(concat_ws(' ',
        s.nam::text,
        s.ho_ten_chu_ho,
        s.ten_xa_phuong,
        s.khoi_xom,
        s.loai_hinh_ho_tro,
        s.so_tien::text, replace(to_char(round(s.so_tien), 'FM999,999,999,999,990'), ',', '.'),
        s.trang_thai,
        to_char(s.ngay_cap_nhat_trang_thai AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI'),
        s.noi_dung_ho_tro,
        s.nguon,
        s.nguon_ho_tro,
        s.doi_tuong,
        s.ghi_chu,
        s.nguoi_tao_display,
        to_char(s.tg_cap_nhat AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI')
      )) LIKE public.fn_mau_tim_kiem(p_search)
    )
    -- KHÔNG nới lỏng khi thiếu đơn vị: cán bộ cấp Xã phường chưa được gán đơn vị
    -- phải thấy RỖNG, đúng như canViewNddkRow ở client.
    AND (
      COALESCE(p_view_all, true)
      OR s.xa_phuong_id = p_viewer_xa_phuong_id
    )
    AND (p_nam           IS NULL OR cardinality(p_nam)           = 0 OR s.nam              = ANY (p_nam))
    AND (p_nguon         IS NULL OR cardinality(p_nguon)         = 0 OR s.nguon            = ANY (p_nguon))
    AND (p_nguon_ho_tro  IS NULL OR cardinality(p_nguon_ho_tro)  = 0 OR s.nguon_ho_tro     = ANY (p_nguon_ho_tro))
    AND (p_doi_tuong     IS NULL OR cardinality(p_doi_tuong)     = 0 OR s.doi_tuong        = ANY (p_doi_tuong))
    AND (p_loai_hinh     IS NULL OR cardinality(p_loai_hinh)     = 0 OR s.loai_hinh_ho_tro = ANY (p_loai_hinh))
    AND (p_trang_thai    IS NULL OR cardinality(p_trang_thai)    = 0 OR s.trang_thai       = ANY (p_trang_thai))
    AND (p_xa_phuong_ids IS NULL OR cardinality(p_xa_phuong_ids) = 0 OR s.xa_phuong_id     = ANY (p_xa_phuong_ids))
    -- Tìm theo từng cột: so khớp trên ĐÚNG chuỗi hiển thị của cột đó.
    AND (nullif(btrim(coalesce(p_column_search->>'nam','')),'') IS NULL
         OR s.nam::text ILIKE '%'||btrim(p_column_search->>'nam')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'noi_dung_ho_tro','')),'') IS NULL
         OR s.noi_dung_ho_tro ILIKE '%'||btrim(p_column_search->>'noi_dung_ho_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'nguon','')),'') IS NULL
         OR s.nguon ILIKE '%'||btrim(p_column_search->>'nguon')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'nguon_ho_tro','')),'') IS NULL
         OR s.nguon_ho_tro ILIKE '%'||btrim(p_column_search->>'nguon_ho_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ho_ten_chu_ho','')),'') IS NULL
         OR s.ho_ten_chu_ho ILIKE '%'||btrim(p_column_search->>'ho_ten_chu_ho')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_xa_phuong','')),'') IS NULL
         OR s.ten_xa_phuong ILIKE '%'||btrim(p_column_search->>'ten_xa_phuong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'khoi_xom','')),'') IS NULL
         OR s.khoi_xom ILIKE '%'||btrim(p_column_search->>'khoi_xom')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'doi_tuong','')),'') IS NULL
         OR s.doi_tuong ILIKE '%'||btrim(p_column_search->>'doi_tuong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'loai_hinh_ho_tro','')),'') IS NULL
         OR s.loai_hinh_ho_tro ILIKE '%'||btrim(p_column_search->>'loai_hinh_ho_tro')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'so_tien','')),'') IS NULL
         OR s.so_tien::text ILIKE '%'||btrim(p_column_search->>'so_tien')||'%')
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
    CASE WHEN p_sort = 'nam_asc'                      THEN s.nam                      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'nam_desc'                     THEN s.nam                      END DESC NULLS LAST,
    CASE WHEN p_sort = 'noi_dung_ho_tro_asc'          THEN s.noi_dung_ho_tro          END ASC  NULLS LAST,
    CASE WHEN p_sort = 'noi_dung_ho_tro_desc'         THEN s.noi_dung_ho_tro          END DESC NULLS LAST,
    CASE WHEN p_sort = 'nguon_asc'                    THEN s.nguon                    END ASC  NULLS LAST,
    CASE WHEN p_sort = 'nguon_desc'                   THEN s.nguon                    END DESC NULLS LAST,
    CASE WHEN p_sort = 'nguon_ho_tro_asc'             THEN s.nguon_ho_tro             END ASC  NULLS LAST,
    CASE WHEN p_sort = 'nguon_ho_tro_desc'            THEN s.nguon_ho_tro             END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_ten_chu_ho_asc'            THEN s.ho_ten_chu_ho            END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_ten_chu_ho_desc'           THEN s.ho_ten_chu_ho            END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_xa_phuong_asc'            THEN s.ten_xa_phuong            END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_xa_phuong_desc'           THEN s.ten_xa_phuong            END DESC NULLS LAST,
    CASE WHEN p_sort = 'khoi_xom_asc'                 THEN s.khoi_xom                 END ASC  NULLS LAST,
    CASE WHEN p_sort = 'khoi_xom_desc'                THEN s.khoi_xom                 END DESC NULLS LAST,
    CASE WHEN p_sort = 'doi_tuong_asc'                THEN s.doi_tuong                END ASC  NULLS LAST,
    CASE WHEN p_sort = 'doi_tuong_desc'               THEN s.doi_tuong                END DESC NULLS LAST,
    CASE WHEN p_sort = 'loai_hinh_ho_tro_asc'         THEN s.loai_hinh_ho_tro         END ASC  NULLS LAST,
    CASE WHEN p_sort = 'loai_hinh_ho_tro_desc'        THEN s.loai_hinh_ho_tro         END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_tien_asc'                  THEN s.so_tien                  END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_tien_desc'                 THEN s.so_tien                  END DESC NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_asc'               THEN s.trang_thai               END ASC  NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_desc'              THEN s.trang_thai               END DESC NULLS LAST,
    CASE WHEN p_sort = 'ngay_cap_nhat_trang_thai_asc'  THEN s.ngay_cap_nhat_trang_thai END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ngay_cap_nhat_trang_thai_desc' THEN s.ngay_cap_nhat_trang_thai END DESC NULLS LAST,
    CASE WHEN p_sort = 'ghi_chu_asc'                  THEN s.ghi_chu                  END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ghi_chu_desc'                 THEN s.ghi_chu                  END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_asc'      THEN s.nguoi_tao_display        END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_desc'     THEN s.nguoi_tao_display        END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_asc'              THEN s.tg_cap_nhat              END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_desc'             THEN s.tg_cap_nhat              END DESC NULLS LAST,
    -- Mặc định: mới cập nhật lên trước. BẮT BUỘC kết thúc bằng khoá chính,
    -- nếu không hai trang liền nhau có thể trùng dòng hoặc bỏ sót dòng.
    s.tg_cap_nhat DESC NULLS LAST, s.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$function$;

-- ---------------------------------------------------------------------------
-- get_hngh_page
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_hngh_page(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_sort text DEFAULT NULL::text, p_view_all boolean DEFAULT true, p_viewer_xa_phuong_id bigint DEFAULT NULL::bigint, p_doi_tuong text[] DEFAULT NULL::text[], p_ton_giao text[] DEFAULT NULL::text[], p_trang_thai text[] DEFAULT NULL::text[], p_dan_toc_ids bigint[] DEFAULT NULL::bigint[], p_xa_phuong_ids bigint[] DEFAULT NULL::bigint[], p_column_search jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(id bigint, ho_ten_dai_dien text, so_cccd text, xa_phuong_id bigint, ten_xa_phuong text, khoi_xom text, doi_tuong text, dien_thoai text, dan_toc_id bigint, ten_dan_toc text, ton_giao text, so_tai_khoan text, ngan_hang text, trang_thai text, ngay_cap_nhat_trang_thai timestamp with time zone, ghi_chu text, id_nguoi_tao bigint, ho_va_ten_nguoi_tao text, ten_tai_khoan_nguoi_tao text, tg_tao timestamp with time zone, tg_cap_nhat timestamp with time zone, total_count bigint)
 LANGUAGE sql
 STABLE
AS $function$
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
      OR public.fn_chuan_hoa_tim_kiem(concat_ws(' ',
        s.ho_ten_dai_dien,
        s.so_cccd,
        s.ten_xa_phuong,
        s.khoi_xom,
        s.doi_tuong,
        s.dien_thoai,
        s.ten_dan_toc,
        s.ton_giao,
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
$function$;

-- ---------------------------------------------------------------------------
-- get_vnn_page
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_vnn_page(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_sort text DEFAULT NULL::text, p_view_all boolean DEFAULT true, p_viewer_xa_phuong_id bigint DEFAULT NULL::bigint, p_nam integer[] DEFAULT NULL::integer[], p_linh_vuc text[] DEFAULT NULL::text[], p_nguon text[] DEFAULT NULL::text[], p_nguon_ho_tro text[] DEFAULT NULL::text[], p_doi_tuong text[] DEFAULT NULL::text[], p_hinh_thuc text[] DEFAULT NULL::text[], p_trang_thai text[] DEFAULT NULL::text[], p_xa_phuong_ids bigint[] DEFAULT NULL::bigint[], p_column_search jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(id bigint, noi_dung_ho_tro text, nam integer, linh_vuc_ho_tro text, nguon text, nguon_ho_tro text, ho_ngheo_id bigint, ho_ten_nguoi_nhan text, xa_phuong_id bigint, ten_xa_phuong text, khoi_xom text, doi_tuong text, hinh_thuc_ho_tro text, so_tien numeric, trang_thai text, ngay_cap_nhat_trang_thai timestamp with time zone, don_vi_ho_tro_id bigint, ten_don_vi_ho_tro text, ghi_chu text, id_nguoi_tao bigint, ho_va_ten_nguoi_tao text, ten_tai_khoan_nguoi_tao text, tg_tao timestamp with time zone, tg_cap_nhat timestamp with time zone, total_count bigint)
 LANGUAGE sql
 STABLE
AS $function$
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
      OR public.fn_chuan_hoa_tim_kiem(concat_ws(' ',
        s.nam::text,
        s.ho_ten_nguoi_nhan,
        s.ten_xa_phuong,
        s.linh_vuc_ho_tro,
        s.hinh_thuc_ho_tro,
        s.so_tien::text, replace(to_char(round(s.so_tien), 'FM999,999,999,999,990'), ',', '.'),
        s.trang_thai,
        s.ten_don_vi_ho_tro,
        s.noi_dung_ho_tro,
        s.khoi_xom,
        s.doi_tuong,
        s.nguon,
        s.nguon_ho_tro,
        to_char(s.ngay_cap_nhat_trang_thai AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI'),
        s.ghi_chu,
        s.nguoi_tao_display,
        to_char(s.tg_cap_nhat AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI')
      )) LIKE public.fn_mau_tim_kiem(p_search)
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
$function$;

-- ---------------------------------------------------------------------------
-- get_pbxh_thuc_hien_page
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_pbxh_thuc_hien_page(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_sort text DEFAULT NULL::text, p_view_all boolean DEFAULT true, p_viewer_don_vi_id bigint DEFAULT NULL::bigint, p_cap_thuc_hien text[] DEFAULT NULL::text[], p_loai_hinh text[] DEFAULT NULL::text[], p_tinh_trang text[] DEFAULT NULL::text[], p_don_vi_chu_tri_ids bigint[] DEFAULT NULL::bigint[], p_column_search jsonb DEFAULT NULL::jsonb, p_labels jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(id bigint, cap_thuc_hien text, loai_hinh text, noi_dung text, doi_tuong_id bigint, ten_doi_tuong text, hinh_thuc_id bigint, ten_hinh_thuc text, ngay_bat_dau date, ngay_ket_thuc date, mo_ta_thoi_gian text, tinh_trang text, don_vi_chu_tri_id bigint, ten_don_vi_chu_tri text, phong_ban_tham_muu_id bigint, ten_phong_ban text, don_vi_thuc_hien_id bigint, ten_don_vi_thuc_hien text, ket_qua_kien_nghi text, so_lan_hoan_thanh integer, so_lan_khao_sat integer, phan_tram_hoan_thanh smallint, link_ket_qua text, id_nguoi_tao bigint, ho_va_ten_nguoi_tao text, ten_tai_khoan_nguoi_tao text, tg_tao timestamp with time zone, tg_cap_nhat timestamp with time zone, total_count bigint)
 LANGUAGE sql
 STABLE
AS $function$
  WITH src AS (
    SELECT
      t.*,
      dt.ten  AS ten_doi_tuong,
      hf.ten  AS ten_hinh_thuc,
      ct.ten  AS ten_don_vi_chu_tri,
      pb.ten_phong_ban,
      xp.ten  AS ten_don_vi_thuc_hien,
      nt.ho_va_ten     AS ho_va_ten_nguoi_tao,
      nt.ten_tai_khoan AS ten_tai_khoan_nguoi_tao,
      -- Chuỗi hiển thị cột "Đơn vị thực hiện" (khớp formatTenDonViThucHien).
      CASE
        WHEN t.don_vi_thuc_hien_id IS NULL THEN COALESCE(p_labels->>'don_vi_tinh', '')
        ELSE COALESCE(NULLIF(btrim(xp.ten), ''), COALESCE(p_labels->>'empty_cell', ''))
      END AS don_vi_thuc_hien_display,
      -- Chuỗi hiển thị cột "Tiến độ thực hiện" (khớp tinhTienDo + fallback).
      CASE
        WHEN t.ngay_ket_thuc IS NULL THEN COALESCE(NULLIF(btrim(t.mo_ta_thoi_gian), ''), '')
        WHEN t.ngay_ket_thuc > CURRENT_DATE THEN
          replace(COALESCE(p_labels->>'tien_do_con', ''), '{{count}}', (t.ngay_ket_thuc - CURRENT_DATE)::text)
        WHEN t.ngay_ket_thuc = CURRENT_DATE THEN COALESCE(p_labels->>'tien_do_hom_nay', '')
        ELSE
          replace(COALESCE(p_labels->>'tien_do_qua_han', ''), '{{count}}', (CURRENT_DATE - t.ngay_ket_thuc)::text)
      END AS tien_do_display,
      -- Khoá sắp xếp cột tiến độ: nhỏ hơn = gấp hơn; không có hạn xếp cuối.
      COALESCE(t.ngay_ket_thuc - CURRENT_DATE, 2147483647) AS tien_do_sort,
      COALESCE(NULLIF(btrim(nt.ho_va_ten), ''), NULLIF(btrim(nt.ten_tai_khoan), ''), '') AS nguoi_tao_display
    FROM public.pbxh_thuc_hien_phan_bien_xa_hoi t
    LEFT JOIN public.pbxh_thiet_lap     dt ON dt.id = t.doi_tuong_id
    LEFT JOIN public.pbxh_thiet_lap     hf ON hf.id = t.hinh_thuc_id
    LEFT JOIN public.pbxh_thiet_lap     ct ON ct.id = t.don_vi_chu_tri_id
    LEFT JOIN public.var_phong_ban      pb ON pb.id = t.phong_ban_tham_muu_id
    LEFT JOIN public.var_ssn_xa_phuong  xp ON xp.id = t.don_vi_thuc_hien_id
    LEFT JOIN public.var_nhan_vien      nt ON nt.id = t.id_nguoi_tao
  )
  SELECT
    s.id, s.cap_thuc_hien, s.loai_hinh, s.noi_dung,
    s.doi_tuong_id, s.ten_doi_tuong,
    s.hinh_thuc_id, s.ten_hinh_thuc,
    s.ngay_bat_dau, s.ngay_ket_thuc, s.mo_ta_thoi_gian, s.tinh_trang,
    s.don_vi_chu_tri_id, s.ten_don_vi_chu_tri,
    s.phong_ban_tham_muu_id, s.ten_phong_ban,
    s.don_vi_thuc_hien_id, s.ten_don_vi_thuc_hien,
    s.ket_qua_kien_nghi, s.so_lan_hoan_thanh, s.so_lan_khao_sat,
    s.phan_tram_hoan_thanh, s.link_ket_qua,
    s.id_nguoi_tao, s.ho_va_ten_nguoi_tao, s.ten_tai_khoan_nguoi_tao,
    s.tg_tao, s.tg_cap_nhat,
    COUNT(*) OVER () AS total_count
  FROM src s
  WHERE (
      p_search IS NULL
      OR public.fn_chuan_hoa_tim_kiem(concat_ws(' ',
        s.loai_hinh,
        s.don_vi_thuc_hien_display,
        s.ten_don_vi_thuc_hien,
        s.noi_dung,
        s.tien_do_display,
        s.tinh_trang,
        s.ten_don_vi_chu_tri,
        s.so_lan_hoan_thanh::text,
        s.so_lan_khao_sat::text,
        s.phan_tram_hoan_thanh::text,
        s.cap_thuc_hien,
        s.ten_doi_tuong,
        s.ten_hinh_thuc,
        to_char(s.ngay_bat_dau, 'DD/MM/YYYY'),
        to_char(s.ngay_ket_thuc, 'DD/MM/YYYY'),
        s.mo_ta_thoi_gian,
        s.ten_phong_ban,
        s.ket_qua_kien_nghi,
        s.link_ket_qua,
        s.nguoi_tao_display,
        to_char(s.tg_cap_nhat AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI')
      )) LIKE public.fn_mau_tim_kiem(p_search)
    )
    -- KHÔNG nới lỏng khi thiếu đơn vị: cán bộ cấp Xã phường chưa được gán đơn vị
    -- phải thấy RỖNG, đúng như canViewPbxhThucHienRow ở client.
    AND (
      COALESCE(p_view_all, true)
      OR s.don_vi_thuc_hien_id = p_viewer_don_vi_id
    )
    AND (p_cap_thuc_hien      IS NULL OR cardinality(p_cap_thuc_hien)      = 0 OR s.cap_thuc_hien = ANY (p_cap_thuc_hien))
    AND (p_loai_hinh          IS NULL OR cardinality(p_loai_hinh)          = 0 OR s.loai_hinh     = ANY (p_loai_hinh))
    AND (p_tinh_trang         IS NULL OR cardinality(p_tinh_trang)         = 0 OR s.tinh_trang    = ANY (p_tinh_trang))
    AND (p_don_vi_chu_tri_ids IS NULL OR cardinality(p_don_vi_chu_tri_ids) = 0 OR s.don_vi_chu_tri_id = ANY (p_don_vi_chu_tri_ids))
    -- Tìm theo từng cột: so khớp trên ĐÚNG chuỗi hiển thị của cột đó.
    AND (nullif(btrim(coalesce(p_column_search->>'loai_hinh','')),'') IS NULL
         OR s.loai_hinh ILIKE '%'||btrim(p_column_search->>'loai_hinh')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'cap_thuc_hien','')),'') IS NULL
         OR s.cap_thuc_hien ILIKE '%'||btrim(p_column_search->>'cap_thuc_hien')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'noi_dung','')),'') IS NULL
         OR s.noi_dung ILIKE '%'||btrim(p_column_search->>'noi_dung')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tinh_trang','')),'') IS NULL
         OR s.tinh_trang ILIKE '%'||btrim(p_column_search->>'tinh_trang')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'don_vi_thuc_hien','')),'') IS NULL
         OR s.don_vi_thuc_hien_display ILIKE '%'||btrim(p_column_search->>'don_vi_thuc_hien')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tien_do','')),'') IS NULL
         OR s.tien_do_display ILIKE '%'||btrim(p_column_search->>'tien_do')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_don_vi_chu_tri','')),'') IS NULL
         OR s.ten_don_vi_chu_tri ILIKE '%'||btrim(p_column_search->>'ten_don_vi_chu_tri')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_doi_tuong','')),'') IS NULL
         OR s.ten_doi_tuong ILIKE '%'||btrim(p_column_search->>'ten_doi_tuong')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_hinh_thuc','')),'') IS NULL
         OR s.ten_hinh_thuc ILIKE '%'||btrim(p_column_search->>'ten_hinh_thuc')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ten_phong_ban','')),'') IS NULL
         OR s.ten_phong_ban ILIKE '%'||btrim(p_column_search->>'ten_phong_ban')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ket_qua_kien_nghi','')),'') IS NULL
         OR s.ket_qua_kien_nghi ILIKE '%'||btrim(p_column_search->>'ket_qua_kien_nghi')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'link_ket_qua','')),'') IS NULL
         OR s.link_ket_qua ILIKE '%'||btrim(p_column_search->>'link_ket_qua')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'mo_ta_thoi_gian','')),'') IS NULL
         OR s.mo_ta_thoi_gian ILIKE '%'||btrim(p_column_search->>'mo_ta_thoi_gian')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'so_lan_hoan_thanh','')),'') IS NULL
         OR s.so_lan_hoan_thanh::text ILIKE '%'||btrim(p_column_search->>'so_lan_hoan_thanh')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'so_lan_khao_sat','')),'') IS NULL
         OR s.so_lan_khao_sat::text ILIKE '%'||btrim(p_column_search->>'so_lan_khao_sat')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'phan_tram_hoan_thanh','')),'') IS NULL
         OR (s.phan_tram_hoan_thanh::text || '%') ILIKE '%'||btrim(p_column_search->>'phan_tram_hoan_thanh')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ho_va_ten_nguoi_tao','')),'') IS NULL
         OR s.nguoi_tao_display ILIKE '%'||btrim(p_column_search->>'ho_va_ten_nguoi_tao')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ngay_bat_dau','')),'') IS NULL
         OR to_char(s.ngay_bat_dau, 'DD/MM/YYYY') ILIKE '%'||btrim(p_column_search->>'ngay_bat_dau')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'ngay_ket_thuc','')),'') IS NULL
         OR to_char(s.ngay_ket_thuc, 'DD/MM/YYYY') ILIKE '%'||btrim(p_column_search->>'ngay_ket_thuc')||'%')
    AND (nullif(btrim(coalesce(p_column_search->>'tg_cap_nhat','')),'') IS NULL
         OR to_char(s.tg_cap_nhat, 'DD/MM/YYYY') ILIKE '%'||btrim(p_column_search->>'tg_cap_nhat')||'%')
  ORDER BY
    CASE WHEN p_sort = 'loai_hinh_asc'             THEN s.loai_hinh                END ASC  NULLS LAST,
    CASE WHEN p_sort = 'loai_hinh_desc'            THEN s.loai_hinh                END DESC NULLS LAST,
    CASE WHEN p_sort = 'cap_thuc_hien_asc'         THEN s.cap_thuc_hien            END ASC  NULLS LAST,
    CASE WHEN p_sort = 'cap_thuc_hien_desc'        THEN s.cap_thuc_hien            END DESC NULLS LAST,
    CASE WHEN p_sort = 'noi_dung_asc'              THEN s.noi_dung                 END ASC  NULLS LAST,
    CASE WHEN p_sort = 'noi_dung_desc'             THEN s.noi_dung                 END DESC NULLS LAST,
    CASE WHEN p_sort = 'tinh_trang_asc'            THEN s.tinh_trang               END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tinh_trang_desc'           THEN s.tinh_trang               END DESC NULLS LAST,
    CASE WHEN p_sort = 'don_vi_thuc_hien_asc'      THEN s.don_vi_thuc_hien_display END ASC  NULLS LAST,
    CASE WHEN p_sort = 'don_vi_thuc_hien_desc'     THEN s.don_vi_thuc_hien_display END DESC NULLS LAST,
    CASE WHEN p_sort = 'tien_do_asc'               THEN s.tien_do_sort             END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tien_do_desc'              THEN s.tien_do_sort             END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_don_vi_chu_tri_asc'    THEN s.ten_don_vi_chu_tri       END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_don_vi_chu_tri_desc'   THEN s.ten_don_vi_chu_tri       END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_doi_tuong_asc'         THEN s.ten_doi_tuong            END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_doi_tuong_desc'        THEN s.ten_doi_tuong            END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_hinh_thuc_asc'         THEN s.ten_hinh_thuc            END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_hinh_thuc_desc'        THEN s.ten_hinh_thuc            END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_phong_ban_asc'         THEN s.ten_phong_ban            END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_phong_ban_desc'        THEN s.ten_phong_ban            END DESC NULLS LAST,
    CASE WHEN p_sort = 'ket_qua_kien_nghi_asc'     THEN s.ket_qua_kien_nghi        END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ket_qua_kien_nghi_desc'    THEN s.ket_qua_kien_nghi        END DESC NULLS LAST,
    CASE WHEN p_sort = 'link_ket_qua_asc'          THEN s.link_ket_qua             END ASC  NULLS LAST,
    CASE WHEN p_sort = 'link_ket_qua_desc'         THEN s.link_ket_qua             END DESC NULLS LAST,
    CASE WHEN p_sort = 'mo_ta_thoi_gian_asc'       THEN s.mo_ta_thoi_gian          END ASC  NULLS LAST,
    CASE WHEN p_sort = 'mo_ta_thoi_gian_desc'      THEN s.mo_ta_thoi_gian          END DESC NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_asc'   THEN s.nguoi_tao_display        END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_va_ten_nguoi_tao_desc'  THEN s.nguoi_tao_display        END DESC NULLS LAST,
    CASE WHEN p_sort = 'ngay_bat_dau_asc'          THEN s.ngay_bat_dau             END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ngay_bat_dau_desc'         THEN s.ngay_bat_dau             END DESC NULLS LAST,
    CASE WHEN p_sort = 'ngay_ket_thuc_asc'         THEN s.ngay_ket_thuc            END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ngay_ket_thuc_desc'        THEN s.ngay_ket_thuc            END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_lan_hoan_thanh_asc'     THEN s.so_lan_hoan_thanh        END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_lan_hoan_thanh_desc'    THEN s.so_lan_hoan_thanh        END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_lan_khao_sat_asc'       THEN s.so_lan_khao_sat          END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_lan_khao_sat_desc'      THEN s.so_lan_khao_sat          END DESC NULLS LAST,
    CASE WHEN p_sort = 'phan_tram_hoan_thanh_asc'  THEN s.phan_tram_hoan_thanh     END ASC  NULLS LAST,
    CASE WHEN p_sort = 'phan_tram_hoan_thanh_desc' THEN s.phan_tram_hoan_thanh     END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_asc'           THEN s.tg_cap_nhat              END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_desc'          THEN s.tg_cap_nhat              END DESC NULLS LAST,
    s.tg_cap_nhat DESC NULLS LAST, s.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$function$;
