-- Kết quả hỗ trợ của NHÀ TÀI TRỢ — cộng đủ nguồn, KHÔNG tính trùng.
--
-- Một đồng ủng hộ chỉ được đếm ở đúng MỘT chỗ:
--   • Tiếp nhận (tn_tiep_nhan)   — tiền + giấy tờ có giá (vào "tiền mặt"),
--                                   hiện vật khác không qua kho (vào "hiện vật").
--   • Nhập kho từ ngoài          — hàng qua kho (vào "hiện vật"). Phiếu có gắn vào
--                                   khoản tiếp nhận hay không đều chỉ cộng ở đây, vì
--                                   tn_tiep_nhan KHÔNG lưu lại giá trị phiếu.
--   • "Ủng hộ trực tiếp"         — khoản nhà tài trợ trao thẳng cho hộ, ghi ở
--                                   Chương trình hỗ trợ (vnn) và Nhà đại đoàn kết (nddk).
-- Khoản vnn/nddk nguồn Cấp tỉnh / Cấp xã / Trung ương là tiền MTTQ CHI RA (đã đếm ở
-- Tiếp nhận khi vào) ⇒ KHÔNG cộng cho nhà tài trợ nữa, dù có gắn nhà tài trợ.
--
-- Tất cả SECURITY DEFINER: kho và tiếp nhận có RLS theo xã, tính dưới quyền người
-- gọi sẽ ra số thiếu. Hàm chỉ trả TỔNG theo nhà tài trợ (danh mục toàn tỉnh).
--
-- get_ktnt_thanh_tich giữ nguyên chữ ký (get_ktnt_page gọi LATERAL theo tên cột).

BEGIN;

-- 1. Theo nhóm (màn Nhà tài trợ dùng) -------------------------------------------
-- nhom_key 'dot:<id>' dùng CHUNG cho phiếu kho và khoản tiếp nhận cùng chương trình
-- ⇒ hai nguồn gộp vào một dòng "Chương trình: …" ở màn chi tiết.
CREATE OR REPLACE FUNCTION public.get_kho_don_vi_cuu_tro_ung_ho_nhom(
  p_tu_ngay date DEFAULT NULL::date,
  p_den_ngay date DEFAULT NULL::date
) RETURNS TABLE(don_vi_id bigint, nguon text, nhom_key text, nhom_ten text, tien_mat numeric, hien_vat numeric, so_luot bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT p.don_vi_cuu_tro_id,
         'kho'::text,
         'dot:' || COALESCE(p.dot_cuu_tro_id::text, 'none'),
         max(d.ten),
         0::numeric,
         COALESCE(sum(ct.thanh_tien), 0),
         count(DISTINCT p.id)
  FROM public.kho_nhap_xuat_kho p
  JOIN public.kho_nhap_xuat_kho_ct ct ON ct.phieu_id = p.id
  LEFT JOIN public.kho_dot_cuu_tro d ON d.id = p.dot_cuu_tro_id
  WHERE p.loai_phieu = 'nhap_ngoai'
    AND p.don_vi_cuu_tro_id IS NOT NULL
    AND (p_tu_ngay  IS NULL OR p.ngay_phieu >= p_tu_ngay)
    AND (p_den_ngay IS NULL OR p.ngay_phieu <= p_den_ngay)
  GROUP BY p.don_vi_cuu_tro_id, p.dot_cuu_tro_id

  UNION ALL

  SELECT t.nha_tai_tro_id,
         'tiep_nhan'::text,
         'dot:' || t.chuong_trinh_id::text,
         max(d.ten),
         COALESCE(sum(t.so_tien + COALESCE(t.giay_to_co_gia_gia_tri, 0)), 0),
         COALESCE(sum(COALESCE(t.hien_vat_khac_gia_tri, 0)), 0),
         count(*)
  FROM public.tn_tiep_nhan t
  JOIN public.kho_dot_cuu_tro d ON d.id = t.chuong_trinh_id
  WHERE (p_tu_ngay  IS NULL OR t.ngay_tiep_nhan >= p_tu_ngay)
    AND (p_den_ngay IS NULL OR t.ngay_tiep_nhan <= p_den_ngay)
  GROUP BY t.nha_tai_tro_id, t.chuong_trinh_id

  UNION ALL

  SELECT v.don_vi_ho_tro_id,
         'chuong_trinh'::text,
         'nd:' || lower(regexp_replace(btrim(v.noi_dung_ho_tro), '\s+', ' ', 'g')),
         min(regexp_replace(btrim(v.noi_dung_ho_tro), '\s+', ' ', 'g')),
         COALESCE(sum(v.so_tien), 0),
         COALESCE(sum(v.tong_tien_quy_doi), 0),
         count(*)
  FROM public.vnn_chuong_trinh v
  WHERE v.don_vi_ho_tro_id IS NOT NULL
    AND v.nguon_ho_tro = 'Ủng hộ trực tiếp'
    AND (p_tu_ngay  IS NULL OR (v.tg_tao AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= p_tu_ngay)
    AND (p_den_ngay IS NULL OR (v.tg_tao AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <= p_den_ngay)
  GROUP BY v.don_vi_ho_tro_id, lower(regexp_replace(btrim(v.noi_dung_ho_tro), '\s+', ' ', 'g'))

  UNION ALL

  SELECT n.nha_tai_tro_id,
         'nddk'::text,
         'nd:' || lower(regexp_replace(btrim(n.noi_dung_ho_tro), '\s+', ' ', 'g')),
         min(regexp_replace(btrim(n.noi_dung_ho_tro), '\s+', ' ', 'g')),
         COALESCE(sum(n.so_tien), 0),
         0::numeric,
         count(*)
  FROM public.nddk_nha_dai_doan_ket n
  WHERE n.nha_tai_tro_id IS NOT NULL
    AND n.nguon_ho_tro = 'Ủng hộ trực tiếp'
    AND (p_tu_ngay  IS NULL OR (n.tg_tao AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= p_tu_ngay)
    AND (p_den_ngay IS NULL OR (n.tg_tao AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <= p_den_ngay)
  GROUP BY n.nha_tai_tro_id, lower(regexp_replace(btrim(n.noi_dung_ho_tro), '\s+', ' ', 'g'));
$$;

-- 2. Tổng theo nhà tài trợ — dựng lại từ hàm nhóm để không thể lệch nhau -------
CREATE OR REPLACE FUNCTION public.get_kho_don_vi_cuu_tro_ket_qua(p_don_vi_id bigint DEFAULT NULL::bigint)
RETURNS TABLE(don_vi_id bigint, ket_qua_ung_ho numeric)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT dv.id, COALESCE(sum(n.tien_mat + n.hien_vat), 0)
  FROM public.kho_don_vi_cuu_tro dv
  LEFT JOIN public.get_kho_don_vi_cuu_tro_ung_ho_nhom(NULL, NULL) n ON n.don_vi_id = dv.id
  WHERE p_don_vi_id IS NULL OR dv.id = p_don_vi_id
  GROUP BY dv.id;
$$;

CREATE OR REPLACE FUNCTION public.get_kho_don_vi_cuu_tro_ung_ho_theo_ky(
  p_tu_ngay date DEFAULT NULL::date,
  p_den_ngay date DEFAULT NULL::date
) RETURNS TABLE(don_vi_id bigint, tien_kho numeric, tien_chuong_trinh numeric, so_luot bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  -- tien_kho = hàng nhập kho; tien_chuong_trinh = mọi nguồn còn lại (tiếp nhận + trực tiếp).
  SELECT n.don_vi_id,
         COALESCE(sum(n.hien_vat) FILTER (WHERE n.nguon = 'kho'), 0),
         COALESCE(sum(n.tien_mat + n.hien_vat) FILTER (WHERE n.nguon <> 'kho'), 0),
         COALESCE(sum(n.so_luot), 0)::bigint
  FROM public.get_kho_don_vi_cuu_tro_ung_ho_nhom(p_tu_ngay, p_den_ngay) n
  GROUP BY n.don_vi_id;
$$;

-- 3. Thành tích khen thưởng nhà tài trợ (theo năm) --------------------------------
--   tien_mat         = Σ tiếp nhận (tiền + GTCG) + Σ vnn.so_tien + Σ nddk.so_tien (trực tiếp)
--   hien_vat_quy_doi = Σ tiếp nhận hiện vật khác + Σ vnn.tong_tien_quy_doi (trực tiếp)
--   gia_tri_nhap_kho = Σ phiếu nhập từ ngoài
--   so_khoan / so_nguoi chỉ đếm khoản trao THẲNG cho hộ (vnn + nddk trực tiếp).
CREATE OR REPLACE FUNCTION public.get_ktnt_thanh_tich(
  p_nha_tai_tro_id bigint,
  p_tu_nam integer DEFAULT NULL,
  p_den_nam integer DEFAULT NULL
) RETURNS TABLE (
  tien_mat numeric,
  hien_vat_quy_doi numeric,
  gia_tri_nhap_kho numeric,
  so_khoan_ho_tro bigint,
  so_nguoi_duoc_ho_tro bigint,
  so_phieu_nhap_kho bigint
)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  WITH truc_tiep AS (
    SELECT v.so_tien, v.tong_tien_quy_doi AS hien_vat,
           COALESCE('ho:' || v.ho_ngheo_id::text,
                    'ten:' || lower(regexp_replace(btrim(v.ho_ten_nguoi_nhan), '\s+', ' ', 'g'))
                      || '|' || COALESCE(v.xa_phuong_id::text, '')) AS nguoi
    FROM public.vnn_chuong_trinh v
    WHERE v.don_vi_ho_tro_id = p_nha_tai_tro_id
      AND v.nguon_ho_tro = 'Ủng hộ trực tiếp'
      AND (p_tu_nam  IS NULL OR v.nam >= p_tu_nam)
      AND (p_den_nam IS NULL OR v.nam <= p_den_nam)
    UNION ALL
    SELECT n.so_tien, NULL::numeric,
           COALESCE('ho:' || n.ho_ngheo_id::text,
                    'ten:' || lower(regexp_replace(btrim(n.ho_ten_chu_ho), '\s+', ' ', 'g'))
                      || '|' || COALESCE(n.xa_phuong_id::text, ''))
    FROM public.nddk_nha_dai_doan_ket n
    WHERE n.nha_tai_tro_id = p_nha_tai_tro_id
      AND n.nguon_ho_tro = 'Ủng hộ trực tiếp'
      AND (p_tu_nam  IS NULL OR n.nam >= p_tu_nam)
      AND (p_den_nam IS NULL OR n.nam <= p_den_nam)
  ),
  tt AS (
    SELECT COALESCE(sum(so_tien), 0)::numeric  AS tien,
           COALESCE(sum(hien_vat), 0)::numeric AS hien_vat,
           count(*)::bigint                    AS so_khoan,
           count(DISTINCT nguoi)::bigint       AS so_nguoi
    FROM truc_tiep
  ),
  tn AS (
    SELECT COALESCE(sum(t.so_tien + COALESCE(t.giay_to_co_gia_gia_tri, 0)), 0)::numeric AS tien,
           COALESCE(sum(COALESCE(t.hien_vat_khac_gia_tri, 0)), 0)::numeric           AS hien_vat
    FROM public.tn_tiep_nhan t
    WHERE t.nha_tai_tro_id = p_nha_tai_tro_id
      AND (p_tu_nam  IS NULL OR extract(year FROM t.ngay_tiep_nhan)::int >= p_tu_nam)
      AND (p_den_nam IS NULL OR extract(year FROM t.ngay_tiep_nhan)::int <= p_den_nam)
  ),
  kho AS (
    SELECT COALESCE(sum(ct.thanh_tien), 0)::numeric AS gia_tri,
           count(DISTINCT p.id)::bigint             AS so_phieu
    FROM public.kho_nhap_xuat_kho p
    JOIN public.kho_nhap_xuat_kho_ct ct ON ct.phieu_id = p.id
    WHERE p.loai_phieu = 'nhap_ngoai'
      AND p.don_vi_cuu_tro_id = p_nha_tai_tro_id
      AND (p_tu_nam  IS NULL OR extract(year FROM p.ngay_phieu)::int >= p_tu_nam)
      AND (p_den_nam IS NULL OR extract(year FROM p.ngay_phieu)::int <= p_den_nam)
  )
  SELECT tt.tien + tn.tien, tt.hien_vat + tn.hien_vat, kho.gia_tri,
         tt.so_khoan, tt.so_nguoi, kho.so_phieu
  FROM tt CROSS JOIN tn CROSS JOIN kho;
$$;

COMMIT;
