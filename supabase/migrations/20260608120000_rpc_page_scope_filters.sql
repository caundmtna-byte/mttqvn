-- Mở rộng get_bai_viet_page / get_cong_viec_page: scope tab + bộ lọc server-side
-- (giữ chữ ký cũ bằng DEFAULT để PostgREST / client tương thích ngược).

DROP FUNCTION IF EXISTS public.get_bai_viet_page(text, integer, integer);
DROP FUNCTION IF EXISTS public.get_cong_viec_page(text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_bai_viet_page(
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0,
  p_scope text DEFAULT 'all',
  p_viewer_nhan_vien_id bigint DEFAULT NULL,
  p_viewer_phong_ban_id bigint DEFAULT NULL,
  p_the_loai_ids bigint[] DEFAULT NULL
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
      OR (p_scope = 'all_dept' AND p_viewer_phong_ban_id IS NOT NULL AND EXISTS (
            SELECT 1
            FROM public.var_nhan_vien nv
            WHERE nv.id = b.id_nguoi_tao AND nv.id_phong_ban = p_viewer_phong_ban_id
          ))
    )
    AND (p_the_loai_ids IS NULL OR cardinality(p_the_loai_ids) = 0 OR b.id_the_loai = ANY (p_the_loai_ids))
  ORDER BY b.ngay_dang DESC NULLS LAST, b.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$;

CREATE OR REPLACE FUNCTION public.get_cong_viec_page(
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0,
  p_list_scope text DEFAULT 'mine_do',
  p_viewer_nhan_vien_id bigint DEFAULT NULL,
  p_trang_thai text[] DEFAULT NULL,
  p_muc_do text[] DEFAULT NULL
)
RETURNS SETOF cong_viec_danh_sach
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT c.*
  FROM public.cong_viec_danh_sach c
  WHERE (p_search IS NULL OR c.ten_cong_viec ILIKE '%' || p_search || '%')
    AND (
      p_viewer_nhan_vien_id IS NULL
      OR (p_list_scope = 'mine_do' AND c.id_trach_nhiem = p_viewer_nhan_vien_id)
      OR (p_list_scope = 'mine_related' AND p_viewer_nhan_vien_id = ANY (c.ids_ho_tro))
      OR (p_list_scope = 'mine_assign' AND c.id_nguoi_tao = p_viewer_nhan_vien_id)
    )
    AND (p_trang_thai IS NULL OR cardinality(p_trang_thai) = 0 OR c.trang_thai = ANY (p_trang_thai))
    AND (p_muc_do IS NULL OR cardinality(p_muc_do) = 0 OR c.muc_do = ANY (p_muc_do))
  ORDER BY c.tg_cap_nhat DESC NULLS LAST, c.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$;

COMMENT ON FUNCTION public.get_bai_viet_page(text, integer, integer, text, bigint, bigint, bigint[]) IS
  'Egress P2.2+: pagination + search + scope (all/mine/all_dept) + thể loại server-side.';
COMMENT ON FUNCTION public.get_cong_viec_page(text, integer, integer, text, bigint, text[], text[]) IS
  'Egress P2.2+: pagination + search + tab (mine_do/related/assign) + trạng thái/mức độ server-side.';

GRANT EXECUTE ON FUNCTION public.get_bai_viet_page(
  text, integer, integer, text, bigint, bigint, bigint[]
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_cong_viec_page(
  text, integer, integer, text, bigint, text[], text[]
) TO authenticated;
