-- ============================================================================
-- get_bai_viet_page — chuẩn hoá theo khuôn mẫu cong_viec_bao_cao_lookup.
--
-- Ba lỗi thật đang có ở trang Danh sách bài viết (542 bài):
--   1. Bấm sắp xếp cột chỉ sắp 20 dòng của trang đang xem (sort ở client trên
--      dữ liệu đã phân trang), không phải toàn bộ danh sách.
--   2. RETURNS SETOF không mang được tổng số ⇒ UI hiện "Tổng: —", nút "trang
--      cuối" bị vô hiệu, và xuất Excel chỉ ra đúng 20 dòng.
--   3. Mỗi lần đổi trang tốn 2 request: RPC lấy id rồi SELECT lại để lấy tên
--      thể loại / nguồn đăng / trang đăng / người tạo.
--
-- Bản này trả thẳng các cột hiển thị + COUNT(*) OVER () AS total_count, và
-- nhận p_sort. Sắp xếp dùng whitelist bằng CASE nên không nội suy chuỗi —
-- không có nguy cơ SQL injection. Các bảng LEFT JOIN đều là danh mục nhỏ.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_bai_viet_page(
  text, integer, integer, text, bigint, bigint, bigint[], bigint[], bigint[], bigint[]
);
DROP FUNCTION IF EXISTS public.get_bai_viet_page(
  text, integer, integer, text, bigint, bigint, bigint[], bigint[], bigint[], bigint[], text
);

CREATE FUNCTION public.get_bai_viet_page(
  p_search              text     DEFAULT NULL,
  p_limit               integer  DEFAULT 100,
  p_offset              integer  DEFAULT 0,
  p_scope               text     DEFAULT 'all',
  p_viewer_nhan_vien_id bigint   DEFAULT NULL,
  p_viewer_don_vi_id    bigint   DEFAULT NULL,
  p_the_loai_ids        bigint[] DEFAULT NULL,
  p_nguon_dang_ids      bigint[] DEFAULT NULL,
  p_trang_dang_ids      bigint[] DEFAULT NULL,
  p_id_nguoi_tao        bigint[] DEFAULT NULL,
  -- Dạng '<cot>_asc' / '<cot>_desc'. Giá trị lạ ⇒ dùng thứ tự mặc định.
  p_sort                text     DEFAULT NULL
)
RETURNS TABLE (
  id                       bigint,
  ten_bai                  text,
  id_the_loai              bigint,
  don_gia                  numeric,
  ngay_dang                date,
  id_nguon_dang            bigint,
  id_trang_dang            bigint,
  link                     text,
  id_nguoi_tao             bigint,
  tg_tao                   timestamptz,
  tg_cap_nhat              timestamptz,
  ten_the_loai             text,
  ten_nguon_dang           text,
  ten_trang_dang           text,
  ho_va_ten_nguoi_tao      text,
  ten_tai_khoan_nguoi_tao  text,
  id_phong_ban_nguoi_tao   bigint,
  don_vi_id_nguoi_tao      bigint,
  total_count              bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
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
  WHERE (p_search IS NULL OR b.ten_bai ILIKE '%' || p_search || '%'
         OR (b.link IS NOT NULL AND b.link ILIKE '%' || p_search || '%'))
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
$$;

GRANT EXECUTE ON FUNCTION public.get_bai_viet_page(
  text, integer, integer, text, bigint, bigint, bigint[], bigint[], bigint[], bigint[], text
) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
