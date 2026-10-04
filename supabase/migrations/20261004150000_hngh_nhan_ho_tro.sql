-- Thông tin đối tượng hỗ trợ — tab "Thống kê nhận hỗ trợ": mỗi hộ đã NHẬN được bao
-- nhiêu, tách theo nguồn:
--   • Chương trình hỗ trợ (vnn_chuong_trinh, trạng thái 'Đã nhận'):
--       tiền mặt (so_tien) + hiện vật quy đổi (tong_tien_quy_doi)
--   • Nhà đại đoàn kết (nddk_nha_dai_doan_ket, trạng thái 'Đã bàn giao'): so_tien
--   • Hàng kho (phiếu 'xuat_ngoai' gắn ho_ngheo_id): Σ thành tiền
-- Khoản chưa trao (đang khảo sát / đang làm) KHÔNG tính — đây là số đã nhận.
--
-- 7.840+ hộ ⇒ phân trang ở máy chủ. SECURITY DEFINER để cộng đủ phiếu kho (RLS kho
-- theo xã); phạm vi xem tính TẠI MÁY CHỦ, không nhận tham số từ client:
-- quản trị / Tỉnh ⇒ mọi hộ; cán bộ Xã phường ⇒ hộ của xã mình (fn_don_vi_cua_toi).

BEGIN;

CREATE FUNCTION public.fn_hngh_nhan_ho_tro_nguon(
  p_search text,
  p_nam integer[],
  p_xa_phuong_ids bigint[],
  p_doi_tuong text[],
  p_ho_ngheo_id bigint
) RETURNS TABLE (
  id bigint, ho_ten_dai_dien text, so_cccd text, xa_phuong_id bigint, ten_xa_phuong text,
  khoi_xom text, doi_tuong text,
  vnn_tien numeric, vnn_hien_vat numeric, vnn_so_khoan bigint,
  nddk_tien numeric, nddk_so_can bigint,
  kho_gia_tri numeric, kho_so_phieu bigint,
  tong_gia_tri numeric
)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  WITH vnn AS (
    SELECT v.ho_ngheo_id,
           sum(COALESCE(v.so_tien, 0))           AS tien,
           sum(COALESCE(v.tong_tien_quy_doi, 0)) AS hien_vat,
           count(*)                              AS so_khoan
    FROM public.vnn_chuong_trinh v
    WHERE v.ho_ngheo_id IS NOT NULL
      AND v.trang_thai = 'Đã nhận'
      AND (p_nam IS NULL OR cardinality(p_nam) = 0 OR v.nam = ANY (p_nam))
    GROUP BY v.ho_ngheo_id
  ),
  nddk AS (
    SELECT n.ho_ngheo_id, sum(COALESCE(n.so_tien, 0)) AS tien, count(*) AS so_can
    FROM public.nddk_nha_dai_doan_ket n
    WHERE n.ho_ngheo_id IS NOT NULL
      AND n.trang_thai = 'Đã bàn giao'
      AND (p_nam IS NULL OR cardinality(p_nam) = 0 OR n.nam = ANY (p_nam))
    GROUP BY n.ho_ngheo_id
  ),
  kho AS (
    SELECT p.ho_ngheo_id, sum(ct.thanh_tien) AS gia_tri, count(DISTINCT p.id) AS so_phieu
    FROM public.kho_nhap_xuat_kho p
    JOIN public.kho_nhap_xuat_kho_ct ct ON ct.phieu_id = p.id
    WHERE p.loai_phieu = 'xuat_ngoai'
      AND p.ho_ngheo_id IS NOT NULL
      AND (p_nam IS NULL OR cardinality(p_nam) = 0
           OR extract(year FROM p.ngay_phieu)::int = ANY (p_nam))
    GROUP BY p.ho_ngheo_id
  )
  SELECT
    h.id, h.ho_ten_dai_dien, h.so_cccd, h.xa_phuong_id, xp.ten, h.khoi_xom, h.doi_tuong,
    COALESCE(vnn.tien, 0), COALESCE(vnn.hien_vat, 0), COALESCE(vnn.so_khoan, 0),
    COALESCE(nddk.tien, 0), COALESCE(nddk.so_can, 0),
    COALESCE(kho.gia_tri, 0), COALESCE(kho.so_phieu, 0),
    COALESCE(vnn.tien, 0) + COALESCE(vnn.hien_vat, 0) + COALESCE(nddk.tien, 0) + COALESCE(kho.gia_tri, 0)
  FROM public.hngh_thong_tin_ho_ngheo h
  LEFT JOIN public.var_ssn_xa_phuong xp ON xp.id = h.xa_phuong_id
  LEFT JOIN vnn  ON vnn.ho_ngheo_id  = h.id
  LEFT JOIN nddk ON nddk.ho_ngheo_id = h.id
  LEFT JOIN kho  ON kho.ho_ngheo_id  = h.id
  WHERE (public.fn_kho_xem_tat_ca() OR h.xa_phuong_id = public.fn_don_vi_cua_toi())
    AND (p_ho_ngheo_id IS NULL OR h.id = p_ho_ngheo_id)
    AND (p_xa_phuong_ids IS NULL OR cardinality(p_xa_phuong_ids) = 0 OR h.xa_phuong_id = ANY (p_xa_phuong_ids))
    AND (p_doi_tuong     IS NULL OR cardinality(p_doi_tuong)     = 0 OR h.doi_tuong    = ANY (p_doi_tuong))
    AND (
      p_search IS NULL
      OR public.fn_chuan_hoa_tim_kiem(concat_ws(' ', h.ho_ten_dai_dien, h.so_cccd, xp.ten, h.khoi_xom))
         LIKE public.fn_mau_tim_kiem(p_search)
    );
$$;

-- Hàm nội bộ: chỉ hai RPC dưới gọi (chạy bằng quyền chủ sở hữu).
REVOKE ALL ON FUNCTION public.fn_hngh_nhan_ho_tro_nguon(text, integer[], bigint[], text[], bigint)
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.get_hngh_nhan_ho_tro_page(
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0,
  p_sort text DEFAULT NULL,
  p_nam integer[] DEFAULT NULL,
  p_xa_phuong_ids bigint[] DEFAULT NULL,
  p_doi_tuong text[] DEFAULT NULL,
  p_chi_ho_da_nhan boolean DEFAULT true,
  p_ho_ngheo_id bigint DEFAULT NULL
) RETURNS TABLE (
  id bigint, ho_ten_dai_dien text, so_cccd text, xa_phuong_id bigint, ten_xa_phuong text,
  khoi_xom text, doi_tuong text,
  vnn_tien numeric, vnn_hien_vat numeric, vnn_so_khoan bigint,
  nddk_tien numeric, nddk_so_can bigint,
  kho_gia_tri numeric, kho_so_phieu bigint,
  tong_gia_tri numeric,
  total_count bigint
)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  SELECT s.*, COUNT(*) OVER () AS total_count
  FROM public.fn_hngh_nhan_ho_tro_nguon(p_search, p_nam, p_xa_phuong_ids, p_doi_tuong, p_ho_ngheo_id) s
  WHERE NOT COALESCE(p_chi_ho_da_nhan, true) OR s.tong_gia_tri > 0
  ORDER BY
    CASE WHEN p_sort = 'ho_ten_dai_dien_asc'  THEN s.ho_ten_dai_dien END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ho_ten_dai_dien_desc' THEN s.ho_ten_dai_dien END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_xa_phuong_asc'    THEN s.ten_xa_phuong   END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_xa_phuong_desc'   THEN s.ten_xa_phuong   END DESC NULLS LAST,
    CASE WHEN p_sort = 'vnn_tong_asc'  THEN s.vnn_tien + s.vnn_hien_vat END ASC  NULLS LAST,
    CASE WHEN p_sort = 'vnn_tong_desc' THEN s.vnn_tien + s.vnn_hien_vat END DESC NULLS LAST,
    CASE WHEN p_sort = 'nddk_tien_asc'        THEN s.nddk_tien       END ASC  NULLS LAST,
    CASE WHEN p_sort = 'nddk_tien_desc'       THEN s.nddk_tien       END DESC NULLS LAST,
    CASE WHEN p_sort = 'kho_gia_tri_asc'      THEN s.kho_gia_tri     END ASC  NULLS LAST,
    CASE WHEN p_sort = 'kho_gia_tri_desc'     THEN s.kho_gia_tri     END DESC NULLS LAST,
    CASE WHEN p_sort = 'tong_gia_tri_asc'     THEN s.tong_gia_tri    END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tong_gia_tri_desc'    THEN s.tong_gia_tri    END DESC NULLS LAST,
    -- Mặc định: hộ nhận nhiều nhất lên trước. Kết thúc bằng khoá chính.
    s.tong_gia_tri DESC, s.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$;

CREATE FUNCTION public.get_hngh_nhan_ho_tro_tong(
  p_search text DEFAULT NULL,
  p_nam integer[] DEFAULT NULL,
  p_xa_phuong_ids bigint[] DEFAULT NULL,
  p_doi_tuong text[] DEFAULT NULL
) RETURNS TABLE (
  so_ho bigint, so_ho_da_nhan bigint,
  vnn_tien numeric, vnn_hien_vat numeric, nddk_tien numeric, kho_gia_tri numeric,
  tong_gia_tri numeric
)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  SELECT count(*)::bigint,
         count(*) FILTER (WHERE s.tong_gia_tri > 0)::bigint,
         COALESCE(sum(s.vnn_tien), 0), COALESCE(sum(s.vnn_hien_vat), 0),
         COALESCE(sum(s.nddk_tien), 0), COALESCE(sum(s.kho_gia_tri), 0),
         COALESCE(sum(s.tong_gia_tri), 0)
  FROM public.fn_hngh_nhan_ho_tro_nguon(p_search, p_nam, p_xa_phuong_ids, p_doi_tuong, NULL) s;
$$;

GRANT ALL ON FUNCTION public.get_hngh_nhan_ho_tro_page(text, integer, integer, text, integer[], bigint[], text[], boolean, bigint)
  TO authenticated, service_role;
GRANT ALL ON FUNCTION public.get_hngh_nhan_ho_tro_tong(text, integer[], bigint[], text[])
  TO authenticated, service_role;

COMMIT;
