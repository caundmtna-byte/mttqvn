-- Chương trình hỗ trợ: `so_tien` là GIÁ TRỊ của khoản — tiền mặt, hoặc hiện vật quy ra tiền.
-- Mọi hình thức đều BẮT BUỘC nhập (được nhập 0); hình thức có hiện vật chỉ thêm Số lượng.
-- Hai cột `tong_tien_quy_doi` / `tong_tien_ban_giao` không còn ô nhập; GIỮ cột và dữ liệu cũ.
--
-- Trước đây: Hiện vật ⇒ nhập tong_tien_quy_doi, so_tien để trống. 35 khoản nhập cùng một số vào
-- cả hai ô ⇒ ba hàm bên dưới cộng `so_tien + tong_tien_quy_doi` nên bị CỘNG ĐÔI.
--
--   1. 294 khoản Hiện vật còn so_tien trống ⇒ chép tong_tien_quy_doi sang.
--   2. Bỏ CHECK vnn_so_tien_theo_hinh_thuc_chk, thay bằng so_tien NOT NULL.
--   3. Ba hàm tách tiền mặt / hiện vật theo HÌNH THỨC thay vì theo cột:
--        tiền mặt = so_tien của khoản "Tiền mặt";
--        hiện vật = so_tien của khoản "Hiện vật" / "Hiện vật và Tiền" (không tách được phần tiền).
--
-- Bản sao ở client: features/nha-dai-doan-ket/vi-nguoi-ngheo/core/luat-so-tien.ts.

BEGIN;

UPDATE public.vnn_chuong_trinh
SET so_tien = tong_tien_quy_doi
WHERE so_tien IS NULL AND tong_tien_quy_doi IS NOT NULL;

ALTER TABLE public.vnn_chuong_trinh DROP CONSTRAINT vnn_so_tien_theo_hinh_thuc_chk;
ALTER TABLE public.vnn_chuong_trinh ALTER COLUMN so_tien SET NOT NULL;

CREATE OR REPLACE FUNCTION public.fn_hngh_nhan_ho_tro_nguon(p_search text, p_nam integer[], p_xa_phuong_ids bigint[], p_doi_tuong text[], p_ho_ngheo_id bigint) RETURNS TABLE(id bigint, ho_ten_dai_dien text, so_cccd text, xa_phuong_id bigint, ten_xa_phuong text, khoi_xom text, doi_tuong text, vnn_tien numeric, vnn_hien_vat numeric, vnn_so_khoan bigint, nddk_tien numeric, nddk_so_can bigint, kho_gia_tri numeric, kho_so_phieu bigint, tong_gia_tri numeric)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  WITH vnn AS (
    SELECT v.ho_ngheo_id,
           COALESCE(sum(v.so_tien) FILTER (WHERE v.hinh_thuc_ho_tro =  'Tiền mặt'), 0) AS tien,
           COALESCE(sum(v.so_tien) FILTER (WHERE v.hinh_thuc_ho_tro <> 'Tiền mặt'), 0) AS hien_vat,
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
  WHERE ((SELECT public.fn_kho_xem_tat_ca()) OR h.xa_phuong_id = (SELECT public.fn_don_vi_cua_toi()))
    AND (p_ho_ngheo_id IS NULL OR h.id = p_ho_ngheo_id)
    AND (p_xa_phuong_ids IS NULL OR cardinality(p_xa_phuong_ids) = 0 OR h.xa_phuong_id = ANY (p_xa_phuong_ids))
    AND (p_doi_tuong     IS NULL OR cardinality(p_doi_tuong)     = 0 OR h.doi_tuong    = ANY (p_doi_tuong))
    AND (
      p_search IS NULL
      OR public.fn_chuan_hoa_tim_kiem(concat_ws(' ', h.ho_ten_dai_dien, h.so_cccd, xp.ten, h.khoi_xom))
         LIKE public.fn_mau_tim_kiem(p_search)
    );
$$;


CREATE OR REPLACE FUNCTION public.get_kho_don_vi_cuu_tro_ung_ho_nhom(p_tu_ngay date DEFAULT NULL::date, p_den_ngay date DEFAULT NULL::date) RETURNS TABLE(don_vi_id bigint, nguon text, nhom_key text, nhom_ten text, tien_mat numeric, hien_vat numeric, so_luot bigint)
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
         COALESCE(sum(v.so_tien) FILTER (WHERE v.hinh_thuc_ho_tro =  'Tiền mặt'), 0),
         COALESCE(sum(v.so_tien) FILTER (WHERE v.hinh_thuc_ho_tro <> 'Tiền mặt'), 0),
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


CREATE OR REPLACE FUNCTION public.get_ktnt_thanh_tich(p_nha_tai_tro_id bigint, p_tu_nam integer DEFAULT NULL::integer, p_den_nam integer DEFAULT NULL::integer) RETURNS TABLE(tien_mat numeric, hien_vat_quy_doi numeric, gia_tri_nhap_kho numeric, so_khoan_ho_tro bigint, so_nguoi_duoc_ho_tro bigint, so_phieu_nhap_kho bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  WITH truc_tiep AS (
    SELECT CASE WHEN v.hinh_thuc_ho_tro =  'Tiền mặt' THEN v.so_tien END AS so_tien,
           CASE WHEN v.hinh_thuc_ho_tro <> 'Tiền mặt' THEN v.so_tien END AS hien_vat,
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
