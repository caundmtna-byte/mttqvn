-- Mở rộng get_cong_viec_page: lọc theo chương trình năm (server-side).

DROP FUNCTION IF EXISTS public.get_cong_viec_page(text, integer, integer, text, bigint, text[], text[]);

CREATE OR REPLACE FUNCTION public.get_cong_viec_page(
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0,
  p_list_scope text DEFAULT 'mine_do',
  p_viewer_nhan_vien_id bigint DEFAULT NULL,
  p_trang_thai text[] DEFAULT NULL,
  p_muc_do text[] DEFAULT NULL,
  p_id_chuong_trinh bigint[] DEFAULT NULL,
  p_chuong_trinh_include_null boolean DEFAULT false
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
  ORDER BY c.tg_cap_nhat DESC NULLS LAST, c.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$;

COMMENT ON FUNCTION public.get_cong_viec_page(
  text, integer, integer, text, bigint, text[], text[], bigint[], boolean
) IS
  'Egress P2.2+: pagination + search + tab + trạng thái/mức độ/chương trình server-side.';

GRANT EXECUTE ON FUNCTION public.get_cong_viec_page(
  text, integer, integer, text, bigint, text[], text[], bigint[], boolean
) TO authenticated;
