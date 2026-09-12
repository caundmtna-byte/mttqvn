-- ============================================================================
-- get_pbxh_thuc_hien_page — phân trang phía máy chủ cho module
-- "Thực hiện giám sát / phản biện xã hội".
--
-- Điểm khác so với các RPC phân trang trước: hai cột trên lưới là chuỗi HIỂN
-- THỊ được tính ra, không phải cột trong bảng —
--   · "Tiến độ thực hiện"  = "Còn N ngày" / "Hết hạn hôm nay" / "Quá hạn N ngày",
--                            rỗng thì rơi về mô tả thời gian;
--   · "Đơn vị thực hiện"   = tên xã/phường, để trống nghĩa là cấp tỉnh.
-- Người dùng sắp xếp và gõ tìm theo đúng chuỗi họ nhìn thấy, nên SQL phải dựng
-- lại y hệt chuỗi đó. Các mẫu câu tiếng Việt được TRUYỀN TỪ CLIENT qua
-- `p_labels` (nguồn duy nhất vẫn là `lib/text`), không chép cứng vào SQL.
--
-- Phạm vi xem theo `canViewPbxhThucHienRow`: cấp Xã phường chỉ thấy dòng có
-- `don_vi_thuc_hien_id` trùng đơn vị mình. (Vẫn là lớp chặn "vô tình nhìn
-- thấy" — RLS thật làm ở đợt sau.)
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_pbxh_thuc_hien_page(
  text, integer, integer, text, boolean, bigint, text[], text[], text[], bigint[], jsonb, jsonb
);

CREATE FUNCTION public.get_pbxh_thuc_hien_page(
  p_search             text     DEFAULT NULL,
  p_limit              integer  DEFAULT 100,
  p_offset             integer  DEFAULT 0,
  p_sort               text     DEFAULT NULL,
  p_view_all           boolean  DEFAULT true,
  p_viewer_don_vi_id   bigint   DEFAULT NULL,
  p_cap_thuc_hien      text[]   DEFAULT NULL,
  p_loai_hinh          text[]   DEFAULT NULL,
  p_tinh_trang         text[]   DEFAULT NULL,
  p_don_vi_chu_tri_ids bigint[] DEFAULT NULL,
  p_column_search      jsonb    DEFAULT NULL,
  -- Mẫu câu hiển thị lấy từ lib/text: don_vi_tinh, empty_cell,
  -- tien_do_con / tien_do_hom_nay / tien_do_qua_han (dùng {{count}}).
  p_labels             jsonb    DEFAULT NULL
)
RETURNS TABLE (
  id                     bigint,
  cap_thuc_hien          text,
  loai_hinh              text,
  noi_dung               text,
  doi_tuong_id           bigint,
  ten_doi_tuong          text,
  hinh_thuc_id           bigint,
  ten_hinh_thuc          text,
  ngay_bat_dau           date,
  ngay_ket_thuc          date,
  mo_ta_thoi_gian        text,
  tinh_trang             text,
  don_vi_chu_tri_id      bigint,
  ten_don_vi_chu_tri     text,
  phong_ban_tham_muu_id  bigint,
  ten_phong_ban          text,
  don_vi_thuc_hien_id    bigint,
  ten_don_vi_thuc_hien   text,
  ket_qua_kien_nghi      text,
  so_lan_hoan_thanh      integer,
  so_lan_khao_sat        integer,
  phan_tram_hoan_thanh   smallint,
  link_ket_qua           text,
  id_nguoi_tao           bigint,
  ho_va_ten_nguoi_tao    text,
  ten_tai_khoan_nguoi_tao text,
  tg_tao                 timestamptz,
  tg_cap_nhat            timestamptz,
  total_count            bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
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
      OR s.noi_dung             ILIKE '%' || p_search || '%'
      OR s.ten_doi_tuong        ILIKE '%' || p_search || '%'
      OR s.ten_hinh_thuc        ILIKE '%' || p_search || '%'
      OR s.ten_don_vi_chu_tri   ILIKE '%' || p_search || '%'
      OR s.ten_phong_ban        ILIKE '%' || p_search || '%'
      OR s.ten_don_vi_thuc_hien ILIKE '%' || p_search || '%'
      OR s.ket_qua_kien_nghi    ILIKE '%' || p_search || '%'
      OR s.mo_ta_thoi_gian      ILIKE '%' || p_search || '%'
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
$$;

GRANT EXECUTE ON FUNCTION public.get_pbxh_thuc_hien_page(
  text, integer, integer, text, boolean, bigint, text[], text[], text[], bigint[], jsonb, jsonb
) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
