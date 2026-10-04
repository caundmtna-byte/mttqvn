-- Hiệu năng: tính phạm vi xem MỘT LẦN mỗi truy vấn, không phải mỗi dòng.
--
-- fn_kho_xem_tat_ca() / fn_don_vi_cua_toi() tra var_nhan_vien theo JWT mỗi lần gọi.
-- Gọi trực tiếp trong WHERE ⇒ chạy lại cho TỪNG dòng: tab "Thống kê nhận hỗ trợ"
-- (9.400+ hộ) mất ~22 giây và bị statement_timeout khi gọi bằng tài khoản thật (chạy
-- thử bằng postgres không lộ ra vì không có JWT nên hàm trả về ngay).
-- Bọc trong scalar subquery `(SELECT fn_...())` ⇒ Postgres tính một lần (InitPlan) —
-- đúng khuôn RLS của kho đang dùng.
--
-- fn_chuong_trinh_trong_pham_vi(id) nhận tham số theo dòng nên không hoist được ⇒
-- viết thẳng điều kiện vào policy / RPC rồi bỏ hàm. Bản sao client
-- (dot-cuu-tro/utils/pham-vi-chuong-trinh.ts) giữ nguyên luật.

BEGIN;

-- 1. Thống kê nhận hỗ trợ theo hộ ------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_hngh_nhan_ho_tro_nguon(
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

-- 2. Tiếp nhận: RLS viết thẳng điều kiện, phạm vi tính một lần ------------------------
DROP POLICY tn_tiep_nhan_xem ON public.tn_tiep_nhan;
DROP POLICY tn_tiep_nhan_them ON public.tn_tiep_nhan;
DROP POLICY tn_tiep_nhan_sua ON public.tn_tiep_nhan;
DROP POLICY tn_tiep_nhan_xoa ON public.tn_tiep_nhan;

-- "Chương trình trong phạm vi": quản trị/Tỉnh ⇒ mọi chương trình; cán bộ Xã phường ⇒
-- chương trình do xã mình chủ trì. kho_dot_cuu_tro đọc được với mọi authenticated.
CREATE POLICY tn_tiep_nhan_xem ON public.tn_tiep_nhan FOR SELECT TO authenticated
  USING (
    (SELECT public.fn_kho_xem_tat_ca())
    OR chuong_trinh_id IN (
      SELECT d.id FROM public.kho_dot_cuu_tro d
      WHERE d.don_vi_chu_tri_loai = 'xa_phuong' AND d.don_vi_chu_tri_id = (SELECT public.fn_don_vi_cua_toi())
    )
  );
CREATE POLICY tn_tiep_nhan_them ON public.tn_tiep_nhan FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.fn_co_quyen('tiep-nhan', 'them'))
    AND (
      (SELECT public.fn_kho_xem_tat_ca())
      OR chuong_trinh_id IN (
        SELECT d.id FROM public.kho_dot_cuu_tro d
        WHERE d.don_vi_chu_tri_loai = 'xa_phuong' AND d.don_vi_chu_tri_id = (SELECT public.fn_don_vi_cua_toi())
      )
    )
  );
CREATE POLICY tn_tiep_nhan_sua ON public.tn_tiep_nhan FOR UPDATE TO authenticated
  USING (
    (SELECT public.fn_co_quyen('tiep-nhan', 'sua'))
    AND (
      (SELECT public.fn_kho_xem_tat_ca())
      OR chuong_trinh_id IN (
        SELECT d.id FROM public.kho_dot_cuu_tro d
        WHERE d.don_vi_chu_tri_loai = 'xa_phuong' AND d.don_vi_chu_tri_id = (SELECT public.fn_don_vi_cua_toi())
      )
    )
  )
  WITH CHECK (
    (SELECT public.fn_co_quyen('tiep-nhan', 'sua'))
    AND (
      (SELECT public.fn_kho_xem_tat_ca())
      OR chuong_trinh_id IN (
        SELECT d.id FROM public.kho_dot_cuu_tro d
        WHERE d.don_vi_chu_tri_loai = 'xa_phuong' AND d.don_vi_chu_tri_id = (SELECT public.fn_don_vi_cua_toi())
      )
    )
  );
CREATE POLICY tn_tiep_nhan_xoa ON public.tn_tiep_nhan FOR DELETE TO authenticated
  USING (
    (SELECT public.fn_co_quyen('tiep-nhan', 'xoa'))
    AND (
      (SELECT public.fn_kho_xem_tat_ca())
      OR chuong_trinh_id IN (
        SELECT d.id FROM public.kho_dot_cuu_tro d
        WHERE d.don_vi_chu_tri_loai = 'xa_phuong' AND d.don_vi_chu_tri_id = (SELECT public.fn_don_vi_cua_toi())
      )
    )
  );

-- 3. RPC đọc Tiếp nhận: điều kiện phạm vi trên cột chương trình đã JOIN --------------
CREATE OR REPLACE FUNCTION public.get_tn_tiep_nhan_page(
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0,
  p_sort text DEFAULT NULL,
  p_nha_tai_tro_ids bigint[] DEFAULT NULL,
  p_chuong_trinh_ids bigint[] DEFAULT NULL,
  p_hinh_thuc text[] DEFAULT NULL,
  p_trang_thai text[] DEFAULT NULL,
  p_tu_ngay date DEFAULT NULL,
  p_den_ngay date DEFAULT NULL,
  p_id bigint DEFAULT NULL
) RETURNS TABLE (
  id bigint, so_phieu text, ngay_tiep_nhan date,
  nha_tai_tro_id bigint, ten_nha_tai_tro text, loai_nha_tai_tro text,
  chuong_trinh_id bigint, ten_chuong_trinh text,
  don_vi_chu_tri_loai text, don_vi_chu_tri_id bigint, ten_don_vi_tiep_nhan text,
  hinh_thuc text, so_tien numeric,
  giay_to_co_gia_gia_tri numeric, hien_vat_khac_gia_tri numeric,
  gia_tri_phieu_kho numeric, so_phieu_kho bigint, tong_gia_tri numeric,
  trang_thai text, ngay_cap_nhat_trang_thai timestamp with time zone, ghi_chu text,
  id_nguoi_tao bigint, ho_va_ten_nguoi_tao text, ten_tai_khoan_nguoi_tao text,
  id_nguoi_cap_nhat bigint, ho_va_ten_nguoi_cap_nhat text, ten_tai_khoan_nguoi_cap_nhat text,
  tg_tao timestamp with time zone, tg_cap_nhat timestamp with time zone,
  total_count bigint
)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  WITH kho AS (
    SELECT l.tiep_nhan_id, sum(ct.thanh_tien) AS gia_tri, count(DISTINCT l.phieu_id) AS so_phieu
    FROM public.tn_tiep_nhan_phieu_kho l
    JOIN public.kho_nhap_xuat_kho_ct ct ON ct.phieu_id = l.phieu_id
    GROUP BY l.tiep_nhan_id
  ),
  src AS (
    SELECT
      t.*,
      ntt.ten  AS ten_nha_tai_tro,
      ntt.loai AS loai_nha_tai_tro,
      d.ten    AS ten_chuong_trinh,
      d.don_vi_chu_tri_loai,
      d.don_vi_chu_tri_id,
      CASE WHEN d.don_vi_chu_tri_loai = 'xa_phuong' THEN xp.ten ELSE 'MTTQ tỉnh' END AS ten_don_vi_tiep_nhan,
      COALESCE(kho.gia_tri, 0)  AS gia_tri_phieu_kho,
      COALESCE(kho.so_phieu, 0) AS so_phieu_kho,
      t.so_tien + COALESCE(t.giay_to_co_gia_gia_tri, 0) + COALESCE(t.hien_vat_khac_gia_tri, 0)
        + COALESCE(kho.gia_tri, 0) AS tong_gia_tri,
      nt.ho_va_ten     AS ho_va_ten_nguoi_tao,
      nt.ten_tai_khoan AS ten_tai_khoan_nguoi_tao,
      nc.ho_va_ten     AS ho_va_ten_nguoi_cap_nhat,
      nc.ten_tai_khoan AS ten_tai_khoan_nguoi_cap_nhat
    FROM public.tn_tiep_nhan t
    JOIN public.kho_don_vi_cuu_tro ntt ON ntt.id = t.nha_tai_tro_id
    JOIN public.kho_dot_cuu_tro d      ON d.id = t.chuong_trinh_id
    LEFT JOIN public.var_ssn_xa_phuong xp ON xp.id = d.don_vi_chu_tri_id
    LEFT JOIN kho ON kho.tiep_nhan_id = t.id
    LEFT JOIN public.var_nhan_vien nt ON nt.id = t.id_nguoi_tao
    LEFT JOIN public.var_nhan_vien nc ON nc.id = t.id_nguoi_cap_nhat
    -- Cùng luật policy tn_tiep_nhan_xem (hàm định nghĩa nên phải lọc tường minh).
    WHERE (SELECT public.fn_kho_xem_tat_ca())
       OR (d.don_vi_chu_tri_loai = 'xa_phuong' AND d.don_vi_chu_tri_id = (SELECT public.fn_don_vi_cua_toi()))
  )
  SELECT
    s.id, s.so_phieu, s.ngay_tiep_nhan,
    s.nha_tai_tro_id, s.ten_nha_tai_tro, s.loai_nha_tai_tro,
    s.chuong_trinh_id, s.ten_chuong_trinh,
    s.don_vi_chu_tri_loai, s.don_vi_chu_tri_id, s.ten_don_vi_tiep_nhan,
    s.hinh_thuc, s.so_tien,
    s.giay_to_co_gia_gia_tri, s.hien_vat_khac_gia_tri,
    s.gia_tri_phieu_kho, s.so_phieu_kho, s.tong_gia_tri,
    s.trang_thai, s.ngay_cap_nhat_trang_thai, s.ghi_chu,
    s.id_nguoi_tao, s.ho_va_ten_nguoi_tao, s.ten_tai_khoan_nguoi_tao,
    s.id_nguoi_cap_nhat, s.ho_va_ten_nguoi_cap_nhat, s.ten_tai_khoan_nguoi_cap_nhat,
    s.tg_tao, s.tg_cap_nhat,
    COUNT(*) OVER () AS total_count
  FROM src s
  WHERE (p_id IS NULL OR s.id = p_id)
    AND (
      p_search IS NULL
      OR public.fn_chuan_hoa_tim_kiem(concat_ws(' ',
        s.so_phieu, s.ten_nha_tai_tro, s.ten_chuong_trinh, s.ten_don_vi_tiep_nhan,
        s.hinh_thuc, s.trang_thai, s.ghi_chu,
        s.tong_gia_tri::text, replace(to_char(round(s.tong_gia_tri), 'FM999,999,999,999,990'), ',', '.'),
        to_char(s.ngay_tiep_nhan, 'DD/MM/YYYY')
      )) LIKE public.fn_mau_tim_kiem(p_search)
    )
    AND (p_nha_tai_tro_ids  IS NULL OR cardinality(p_nha_tai_tro_ids)  = 0 OR s.nha_tai_tro_id  = ANY (p_nha_tai_tro_ids))
    AND (p_chuong_trinh_ids IS NULL OR cardinality(p_chuong_trinh_ids) = 0 OR s.chuong_trinh_id = ANY (p_chuong_trinh_ids))
    AND (p_hinh_thuc        IS NULL OR cardinality(p_hinh_thuc)        = 0 OR s.hinh_thuc       = ANY (p_hinh_thuc))
    AND (p_trang_thai       IS NULL OR cardinality(p_trang_thai)       = 0 OR s.trang_thai      = ANY (p_trang_thai))
    AND (p_tu_ngay  IS NULL OR s.ngay_tiep_nhan >= p_tu_ngay)
    AND (p_den_ngay IS NULL OR s.ngay_tiep_nhan <= p_den_ngay)
  ORDER BY
    CASE WHEN p_sort = 'so_phieu_asc'         THEN s.so_phieu         END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_phieu_desc'        THEN s.so_phieu         END DESC NULLS LAST,
    CASE WHEN p_sort = 'ngay_tiep_nhan_asc'   THEN s.ngay_tiep_nhan   END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ngay_tiep_nhan_desc'  THEN s.ngay_tiep_nhan   END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_nha_tai_tro_asc'  THEN s.ten_nha_tai_tro  END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_nha_tai_tro_desc' THEN s.ten_nha_tai_tro  END DESC NULLS LAST,
    CASE WHEN p_sort = 'ten_chuong_trinh_asc' THEN s.ten_chuong_trinh END ASC  NULLS LAST,
    CASE WHEN p_sort = 'ten_chuong_trinh_desc' THEN s.ten_chuong_trinh END DESC NULLS LAST,
    CASE WHEN p_sort = 'so_tien_asc'          THEN s.so_tien          END ASC  NULLS LAST,
    CASE WHEN p_sort = 'so_tien_desc'         THEN s.so_tien          END DESC NULLS LAST,
    CASE WHEN p_sort = 'tong_gia_tri_asc'     THEN s.tong_gia_tri     END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tong_gia_tri_desc'    THEN s.tong_gia_tri     END DESC NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_asc'       THEN s.trang_thai       END ASC  NULLS LAST,
    CASE WHEN p_sort = 'trang_thai_desc'      THEN s.trang_thai       END DESC NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_asc'      THEN s.tg_cap_nhat      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'tg_cap_nhat_desc'     THEN s.tg_cap_nhat      END DESC NULLS LAST,
    s.ngay_tiep_nhan DESC, s.id DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$;

-- 4. Phiếu nhập kho của nhà tài trợ: phạm vi kho tính một lần ----------------------
CREATE OR REPLACE FUNCTION public.get_tn_phieu_kho_cua_nha_tai_tro(p_nha_tai_tro_id bigint)
RETURNS TABLE (
  phieu_id bigint, so_phieu text, ngay_phieu date, ten_kho text,
  ten_chuong_trinh text, tong_tien numeric, so_dong bigint,
  tiep_nhan_id bigint, so_phieu_tiep_nhan text
)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  SELECT
    p.id, p.so_phieu, p.ngay_phieu, k.ten_kho, d.ten,
    COALESCE(sum(ct.thanh_tien), 0), count(ct.id),
    l.tiep_nhan_id, t.so_phieu
  FROM public.kho_nhap_xuat_kho p
  LEFT JOIN public.kho_danh_sach_kho k ON k.id = p.kho_nhap_id
  LEFT JOIN public.kho_dot_cuu_tro d ON d.id = p.dot_cuu_tro_id
  LEFT JOIN public.kho_nhap_xuat_kho_ct ct ON ct.phieu_id = p.id
  LEFT JOIN public.tn_tiep_nhan_phieu_kho l ON l.phieu_id = p.id
  LEFT JOIN public.tn_tiep_nhan t ON t.id = l.tiep_nhan_id
  WHERE p.loai_phieu = 'nhap_ngoai'
    AND p.don_vi_cuu_tro_id = p_nha_tai_tro_id
    AND ((SELECT public.fn_kho_xem_tat_ca()) OR p.kho_nhap_id = ANY ((SELECT public.fn_kho_cua_toi())::bigint[]))
  GROUP BY p.id, k.ten_kho, d.ten, l.tiep_nhan_id, t.so_phieu
  ORDER BY p.ngay_phieu DESC, p.id DESC;
$$;

-- 5. Hàm theo dòng không còn ai dùng.
DROP FUNCTION public.fn_chuong_trinh_trong_pham_vi(bigint);

COMMIT;
