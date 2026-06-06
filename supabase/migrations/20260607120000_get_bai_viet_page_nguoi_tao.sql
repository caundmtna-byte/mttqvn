-- Chip lọc Người tạo: p_id_nguoi_tao trên get_bai_viet_page + RPC options distinct.

DROP FUNCTION IF EXISTS public.get_bai_viet_page(text, integer, integer, text, bigint, bigint, bigint[], bigint[], bigint[]);

CREATE OR REPLACE FUNCTION public.get_bai_viet_page(
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0,
  p_scope text DEFAULT 'all',
  p_viewer_nhan_vien_id bigint DEFAULT NULL,
  p_viewer_don_vi_id bigint DEFAULT NULL,
  p_the_loai_ids bigint[] DEFAULT NULL,
  p_nguon_dang_ids bigint[] DEFAULT NULL,
  p_trang_dang_ids bigint[] DEFAULT NULL,
  p_id_nguoi_tao bigint[] DEFAULT NULL
)
RETURNS SETOF bai_viet_danh_sach
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT b.*
  FROM public.bai_viet_danh_sach b
  WHERE (p_search IS NULL OR b.ten_bai ILIKE '%' || p_search || '%'
         OR (b.link IS NOT NULL AND b.link ILIKE '%' || p_search || '%'))
    AND (
      p_scope = 'all'
      OR (p_scope = 'mine' AND p_viewer_nhan_vien_id IS NOT NULL AND b.id_nguoi_tao = p_viewer_nhan_vien_id)
      OR (p_scope = 'all_don_vi' AND p_viewer_don_vi_id IS NOT NULL AND EXISTS (
            SELECT 1
            FROM public.var_nhan_vien nv
            WHERE nv.id = b.id_nguoi_tao AND nv.don_vi_id = p_viewer_don_vi_id
          ))
    )
    AND (p_the_loai_ids IS NULL OR cardinality(p_the_loai_ids) = 0 OR b.id_the_loai = ANY (p_the_loai_ids))
    AND (p_nguon_dang_ids IS NULL OR cardinality(p_nguon_dang_ids) = 0 OR b.id_nguon_dang = ANY (p_nguon_dang_ids))
    AND (p_trang_dang_ids IS NULL OR cardinality(p_trang_dang_ids) = 0 OR b.id_trang_dang = ANY (p_trang_dang_ids))
    AND (p_id_nguoi_tao IS NULL OR cardinality(p_id_nguoi_tao) = 0 OR b.id_nguoi_tao = ANY (p_id_nguoi_tao))
  ORDER BY b.ngay_dang DESC NULLS LAST, b.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$;

COMMENT ON FUNCTION public.get_bai_viet_page(
  text, integer, integer, text, bigint, bigint, bigint[], bigint[], bigint[], bigint[]
) IS
  'Egress: pagination + search + scope (all/mine/all_don_vi) + thể loại + nguồn/trang đăng + người tạo.';

GRANT EXECUTE ON FUNCTION public.get_bai_viet_page(
  text, integer, integer, text, bigint, bigint, bigint[], bigint[], bigint[], bigint[]
) TO authenticated;

DROP FUNCTION IF EXISTS public.get_bai_viet_nguoi_tao_filter_options(text, bigint);

CREATE OR REPLACE FUNCTION public.get_bai_viet_nguoi_tao_filter_options(
  p_scope text DEFAULT 'all',
  p_viewer_don_vi_id bigint DEFAULT NULL
)
RETURNS TABLE(id bigint, label text, cnt bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    b.id_nguoi_tao AS id,
    MAX(COALESCE(NULLIF(trim(nv.ho_va_ten), ''), NULLIF(trim(nv.ten_tai_khoan), ''), b.id_nguoi_tao::text)) AS label,
    COUNT(*)::bigint AS cnt
  FROM public.bai_viet_danh_sach b
  JOIN public.var_nhan_vien nv ON nv.id = b.id_nguoi_tao
  WHERE (
      p_scope = 'all'
      OR (p_scope = 'all_don_vi' AND p_viewer_don_vi_id IS NOT NULL AND nv.don_vi_id = p_viewer_don_vi_id)
    )
  GROUP BY b.id_nguoi_tao
  ORDER BY label;
$$;

COMMENT ON FUNCTION public.get_bai_viet_nguoi_tao_filter_options(text, bigint) IS
  'Distinct người tạo bài viết (id, label, count) theo scope tab Tất cả.';

GRANT EXECUTE ON FUNCTION public.get_bai_viet_nguoi_tao_filter_options(text, bigint) TO authenticated;
