-- Đơn vị hỗ trợ (kho_don_vi_cuu_tro):
--   1. "Đơn vị giới thiệu" bắt buộc — không chọn xã/phường thì là MTTQ tỉnh.
--   2. RPC tổng "Kết quả ủng hộ (đồng)" theo từng đơn vị — tự tính, không nhập tay.

-- ---------------------------------------------------------------------------
-- 1. Đơn vị giới thiệu: bỏ trạng thái (NULL, NULL) "chưa nhập"
-- ---------------------------------------------------------------------------
UPDATE public.kho_don_vi_cuu_tro
   SET don_vi_gioi_thieu_loai = 'tinh', don_vi_gioi_thieu_id = NULL
 WHERE don_vi_gioi_thieu_loai IS NULL;

ALTER TABLE public.kho_don_vi_cuu_tro
  ALTER COLUMN don_vi_gioi_thieu_loai SET DEFAULT 'tinh',
  ALTER COLUMN don_vi_gioi_thieu_loai SET NOT NULL;

ALTER TABLE public.kho_don_vi_cuu_tro
  DROP CONSTRAINT IF EXISTS kho_don_vi_cuu_tro_dv_gioi_thieu_chk;
ALTER TABLE public.kho_don_vi_cuu_tro
  ADD CONSTRAINT kho_don_vi_cuu_tro_dv_gioi_thieu_chk CHECK (
    (don_vi_gioi_thieu_loai = 'tinh'         AND don_vi_gioi_thieu_id IS NULL)
    OR (don_vi_gioi_thieu_loai = 'xa_phuong' AND don_vi_gioi_thieu_id IS NOT NULL)
  );

COMMENT ON COLUMN public.kho_don_vi_cuu_tro.don_vi_gioi_thieu_loai IS
  'Bắt buộc: ''tinh'' (MTTQ tỉnh — mặc định) | ''xa_phuong'' (kèm don_vi_gioi_thieu_id).';

-- ---------------------------------------------------------------------------
-- 2. Kết quả ủng hộ (đồng) = giá trị hàng nhập kho từ đơn vị
--                         + tiền mặt & giá trị hiện vật quy đổi ở Chương trình vì hộ nghèo
-- Mỗi đơn vị một dòng (đơn vị chưa ủng hộ gì trả 0) — egress nhỏ, danh sách
-- Đơn vị hỗ trợ là danh mục phân trang client nên gộp ở client theo id.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_kho_don_vi_cuu_tro_ket_qua(p_don_vi_id bigint DEFAULT NULL)
RETURNS TABLE (don_vi_id bigint, ket_qua_ung_ho numeric)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    dv.id AS don_vi_id,
    COALESCE(kho.tong, 0) + COALESCE(vnn.tong, 0) AS ket_qua_ung_ho
  FROM public.kho_don_vi_cuu_tro dv
  LEFT JOIN (
    SELECT p.don_vi_cuu_tro_id AS id, sum(ct.thanh_tien) AS tong
    FROM public.kho_nhap_xuat_kho p
    JOIN public.kho_nhap_xuat_kho_ct ct ON ct.phieu_id = p.id
    WHERE p.loai_phieu = 'nhap_ngoai' AND p.don_vi_cuu_tro_id IS NOT NULL
    GROUP BY p.don_vi_cuu_tro_id
  ) kho ON kho.id = dv.id
  LEFT JOIN (
    SELECT v.don_vi_ho_tro_id AS id,
           sum(COALESCE(v.so_tien, 0) + COALESCE(v.tong_tien_quy_doi, 0)) AS tong
    FROM public.vnn_chuong_trinh v
    WHERE v.don_vi_ho_tro_id IS NOT NULL
    GROUP BY v.don_vi_ho_tro_id
  ) vnn ON vnn.id = dv.id
  WHERE p_don_vi_id IS NULL OR dv.id = p_don_vi_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_kho_don_vi_cuu_tro_ket_qua(bigint) TO authenticated;

NOTIFY pgrst, 'reload schema';
