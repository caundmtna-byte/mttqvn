-- ============================================================================
-- get_cong_viec_page — cùng chuẩn với get_bai_viet_page (xem migration trước).
--
-- Sửa thêm một lệch thứ tự: RPC đang ORDER BY tg_cap_nhat DESC, còn màn hình
-- lại sắp lại theo thoi_han DESC ở client ⇒ các trang không liền mạch (một bản
-- ghi có thể xuất hiện ở hai trang, hoặc không xuất hiện ở trang nào). Thứ tự
-- mặc định của RPC nay khớp đúng thứ tự người dùng đang nhìn thấy:
-- thoi_han DESC NULLS LAST, ten_cong_viec ASC.
--
-- Cột 'tien_do' trên lưới là nhãn theo hạn ("Quá hạn N ngày", "Còn N ngày"),
-- không phải phần trăm — khoá sắp xếp tái hiện đúng deadlineProgressSortKey()
-- ở features/quan-ly-giao-viec/cong-viec/utils/deadline-progress.ts.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_cong_viec_page(
  text, integer, integer, text, bigint, text[], text[], bigint[], boolean
);
DROP FUNCTION IF EXISTS public.get_cong_viec_page(
  text, integer, integer, text, bigint, text[], text[], bigint[], boolean, text
);

CREATE FUNCTION public.get_cong_viec_page(
  p_search                     text     DEFAULT NULL,
  p_limit                      integer  DEFAULT 100,
  p_offset                     integer  DEFAULT 0,
  p_list_scope                 text     DEFAULT 'mine_do',
  p_viewer_nhan_vien_id        bigint   DEFAULT NULL,
  p_trang_thai                 text[]   DEFAULT NULL,
  p_muc_do                     text[]   DEFAULT NULL,
  p_id_chuong_trinh            bigint[] DEFAULT NULL,
  p_chuong_trinh_include_null  boolean  DEFAULT false,
  p_sort                       text     DEFAULT NULL
)
RETURNS TABLE (
  id                         bigint,
  muc_do                     text,
  ten_cong_viec              text,
  ghi_chu                    text,
  link_tai_lieu              text,
  thoi_han                   date,
  tien_do                    smallint,
  id_trach_nhiem             bigint,
  ids_ho_tro                 bigint[],
  trang_thai                 text,
  ket_qua                    text,
  link_kq                    text,
  ngay_hoan_thanh            date,
  id_nguoi_tao               bigint,
  tg_tao                     timestamptz,
  tg_cap_nhat                timestamptz,
  id_chuong_trinh            bigint,
  ho_va_ten_trach_nhiem      text,
  ten_tai_khoan_trach_nhiem  text,
  ho_va_ten_nguoi_tao        text,
  ten_tai_khoan_nguoi_tao    text,
  ten_chuong_trinh           text,
  ho_tro_display             text,
  total_count                bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.get_cong_viec_page(
  text, integer, integer, text, bigint, text[], text[], bigint[], boolean, text
) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
