-- Hiệu năng báo cáo: GỘP NHÓM Ở MÁY CHỦ thay vì kéo nguyên bảng về trình duyệt.
--
-- Trước đây BC thống kê bài viết và trang Nhuận bút tải TOÀN BỘ bai_viet_danh_sach
-- (12.199 dòng, 13 request tuần tự, ~9,7 MB JSON có embed) rồi cộng ở client; tab
-- Thống kê hộ nghèo cũng kéo đủ 9.477 hộ. Gộp theo đúng các chiều báo cáo cần thì
-- chỉ còn ~1.300 nhóm bài viết và ~100 nhóm hộ nghèo.
--
-- Trả MỘT giá trị jsonb để không vướng trần 1.000 dòng/response của PostgREST.
-- Phạm vi xem nhận từ client — đúng khuôn get_bai_viet_page / get_hngh_page hiện có
-- (hai bảng này đọc vẫn USING (true), chặn dòng đang nằm ở client).

BEGIN;

-- 1. Bài viết: nhóm theo kỳ × thể loại × nguồn × trang × người tạo ----------------
CREATE OR REPLACE FUNCTION public.get_bai_viet_thong_ke_nhom(
  p_truc_ngay text DEFAULT 'tg_tao',
  p_tu_ngay date DEFAULT NULL,
  p_den_ngay date DEFAULT NULL,
  p_bucket text DEFAULT 'month',
  p_scope text DEFAULT 'all',
  p_viewer_nhan_vien_id bigint DEFAULT NULL,
  p_viewer_don_vi_id bigint DEFAULT NULL
) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY INVOKER
    AS $$
  WITH src AS (
    SELECT
      b.id_the_loai, b.id_nguon_dang, b.id_trang_dang, b.id_nguoi_tao,
      nv.don_vi_id,
      COALESCE(b.don_gia, 0) AS don_gia,
      -- Thống kê lọc theo NGÀY TẠO (giờ VN), Nhuận bút lọc theo NGÀY ĐĂNG.
      CASE WHEN p_truc_ngay = 'ngay_dang' THEN b.ngay_dang
           ELSE (b.tg_tao AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
      END AS ngay
    FROM public.bai_viet_danh_sach b
    LEFT JOIN public.var_nhan_vien nv ON nv.id = b.id_nguoi_tao
    WHERE (
        p_scope = 'all'
        OR (p_scope = 'mine' AND p_viewer_nhan_vien_id IS NOT NULL AND b.id_nguoi_tao = p_viewer_nhan_vien_id)
        OR (p_scope = 'all_don_vi' AND p_viewer_don_vi_id IS NOT NULL AND nv.don_vi_id = p_viewer_don_vi_id)
      )
  ),
  loc AS (
    SELECT * FROM src
    WHERE (p_tu_ngay IS NULL OR ngay >= p_tu_ngay)
      AND (p_den_ngay IS NULL OR ngay <= p_den_ngay)
  ),
  nhom AS (
    SELECT
      CASE WHEN p_bucket = 'day' THEN to_char(ngay, 'YYYY-MM-DD') ELSE to_char(ngay, 'YYYY-MM') END AS k,
      id_the_loai, id_nguon_dang, id_trang_dang, id_nguoi_tao, don_vi_id,
      count(*) AS so_bai,
      sum(don_gia) AS so_tien
    FROM loc
    GROUP BY 1, 2, 3, 4, 5, 6
  )
  SELECT jsonb_build_object(
    -- Mảng vị trí [k, the_loai, nguon, trang, nguoi_tao, don_vi, so_bai, so_tien]:
    -- lặp tên khoá cho hàng nghìn nhóm sẽ gấp đôi dung lượng.
    'nhom', COALESCE((
      SELECT jsonb_agg(jsonb_build_array(
        k, id_the_loai, id_nguon_dang, id_trang_dang, id_nguoi_tao, don_vi_id, so_bai, so_tien))
      FROM nhom), '[]'::jsonb),
    'ngay_min', (SELECT min(ngay) FROM loc),
    'ngay_max', (SELECT max(ngay) FROM loc),
    'the_loai', COALESCE((
      SELECT jsonb_object_agg(tl.id::text, tl.ten_the_loai)
      FROM public.bai_viet_thiet_lap_the_loai tl
      WHERE tl.id IN (SELECT id_the_loai FROM nhom)), '{}'::jsonb),
    'khac', COALESCE((
      SELECT jsonb_object_agg(k.id::text, k.ten)
      FROM public.bai_viet_thiet_lap_khac k
      WHERE k.id IN (SELECT id_nguon_dang FROM nhom UNION SELECT id_trang_dang FROM nhom)), '{}'::jsonb),
    'nguoi_tao', COALESCE((
      SELECT jsonb_object_agg(nv.id::text, jsonb_build_array(nv.ho_va_ten, nv.ten_tai_khoan))
      FROM public.var_nhan_vien nv
      WHERE nv.id IN (SELECT id_nguoi_tao FROM nhom)), '{}'::jsonb)
  );
$$;

COMMENT ON FUNCTION public.get_bai_viet_thong_ke_nhom(text, date, date, text, text, bigint, bigint) IS
  'BC thống kê bài viết + Nhuận bút: số bài/tiền gộp theo kỳ × thể loại × nguồn × trang × người tạo (kèm đơn vị người tạo).';

GRANT ALL ON FUNCTION public.get_bai_viet_thong_ke_nhom(text, date, date, text, text, bigint, bigint) TO authenticated;
GRANT ALL ON FUNCTION public.get_bai_viet_thong_ke_nhom(text, date, date, text, text, bigint, bigint) TO service_role;

-- 2. get_bai_viet_page: thêm lọc khoảng ngày + đơn vị người tạo ------------------
-- Bảng tra cứu và file xuất của trang thống kê cần đúng bộ lọc của báo cáo.
-- Thêm tham số thì phải DROP rồi CREATE (CREATE OR REPLACE không đổi chữ ký;
-- để song song hai bản sẽ làm lời gọi bằng tham số đặt tên bị mơ hồ).
DROP FUNCTION public.get_bai_viet_page(text, integer, integer, text, bigint, bigint, bigint[], bigint[], bigint[], bigint[], text);

CREATE FUNCTION public.get_bai_viet_page(
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0,
  p_scope text DEFAULT 'all',
  p_viewer_nhan_vien_id bigint DEFAULT NULL,
  p_viewer_don_vi_id bigint DEFAULT NULL,
  p_the_loai_ids bigint[] DEFAULT NULL,
  p_nguon_dang_ids bigint[] DEFAULT NULL,
  p_trang_dang_ids bigint[] DEFAULT NULL,
  p_id_nguoi_tao bigint[] DEFAULT NULL,
  p_sort text DEFAULT NULL,
  p_truc_ngay text DEFAULT 'ngay_dang',
  p_tu_ngay date DEFAULT NULL,
  p_den_ngay date DEFAULT NULL,
  p_don_vi_ids bigint[] DEFAULT NULL,
  p_don_vi_include_null boolean DEFAULT false
) RETURNS TABLE(id bigint, ten_bai text, id_the_loai bigint, don_gia numeric, ngay_dang date, id_nguon_dang bigint, id_trang_dang bigint, link text, id_nguoi_tao bigint, tg_tao timestamp with time zone, tg_cap_nhat timestamp with time zone, ten_the_loai text, ten_nguon_dang text, ten_trang_dang text, ho_va_ten_nguoi_tao text, ten_tai_khoan_nguoi_tao text, id_phong_ban_nguoi_tao bigint, don_vi_id_nguoi_tao bigint, total_count bigint)
    LANGUAGE sql STABLE
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
    AND (
      (p_tu_ngay IS NULL AND p_den_ngay IS NULL)
      OR (
        CASE WHEN p_truc_ngay = 'tg_tao' THEN (b.tg_tao AT TIME ZONE 'Asia/Ho_Chi_Minh')::date ELSE b.ngay_dang END
          BETWEEN COALESCE(p_tu_ngay, '-infinity'::date) AND COALESCE(p_den_ngay, 'infinity'::date)
      )
    )
    AND (
      -- Không chọn đơn vị nào ⇒ không lọc. `p_don_vi_include_null` = nhóm "người tạo chưa gắn đơn vị".
      ((p_don_vi_ids IS NULL OR cardinality(p_don_vi_ids) = 0) AND NOT COALESCE(p_don_vi_include_null, false))
      OR nv.don_vi_id = ANY (p_don_vi_ids)
      OR (COALESCE(p_don_vi_include_null, false) AND nv.don_vi_id IS NULL)
    )
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

GRANT ALL ON FUNCTION public.get_bai_viet_page(text, integer, integer, text, bigint, bigint, bigint[], bigint[], bigint[], bigint[], text, text, date, date, bigint[], boolean) TO authenticated;
GRANT ALL ON FUNCTION public.get_bai_viet_page(text, integer, integer, text, bigint, bigint, bigint[], bigint[], bigint[], bigint[], text, text, date, date, bigint[], boolean) TO service_role;

-- 3. Hộ nghèo: nhóm theo xã × đối tượng × dân tộc × tôn giáo × trạng thái ---------
CREATE OR REPLACE FUNCTION public.get_hngh_thong_ke_nhom(
  p_view_all boolean DEFAULT true,
  p_viewer_xa_phuong_id bigint DEFAULT NULL
) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY INVOKER
    AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'xa_phuong_id', g.xa_phuong_id,
    'ten_xa_phuong', g.ten_xa_phuong,
    'doi_tuong', g.doi_tuong,
    'dan_toc_id', g.dan_toc_id,
    'ten_dan_toc', g.ten_dan_toc,
    'ton_giao', g.ton_giao,
    'trang_thai', g.trang_thai,
    'so_ho', g.so_ho
  )), '[]'::jsonb)
  FROM (
    SELECT t.xa_phuong_id, xp.ten AS ten_xa_phuong, t.doi_tuong,
           t.dan_toc_id, dt.ten AS ten_dan_toc, t.ton_giao, t.trang_thai,
           count(*) AS so_ho
    FROM public.hngh_thong_tin_ho_ngheo t
    LEFT JOIN public.var_ssn_xa_phuong xp ON xp.id = t.xa_phuong_id
    LEFT JOIN public.mttq_thiet_lap    dt ON dt.id = t.dan_toc_id
    WHERE COALESCE(p_view_all, true) OR t.xa_phuong_id = p_viewer_xa_phuong_id
    GROUP BY 1, 2, 3, 4, 5, 6, 7
  ) g;
$$;

COMMENT ON FUNCTION public.get_hngh_thong_ke_nhom(boolean, bigint) IS
  'Tab Thống kê hộ nghèo: số hộ gộp theo xã × đối tượng × dân tộc × tôn giáo × trạng thái.';

GRANT ALL ON FUNCTION public.get_hngh_thong_ke_nhom(boolean, bigint) TO authenticated;
GRANT ALL ON FUNCTION public.get_hngh_thong_ke_nhom(boolean, bigint) TO service_role;

COMMIT;
