-- Dữ liệu mẫu: bai_viet_danh_sach
-- Phụ thuộc: migrations + seed_bai_viet_thiet_lap.sql + ít nhất một nhân viên trong var_nhan_vien

INSERT INTO public.bai_viet_danh_sach (
  ten_bai,
  id_the_loai,
  don_gia,
  ngay_dang,
  id_nguon_dang,
  id_trang_dang,
  link,
  id_nguoi_tao
)
SELECT
  'Bài mẫu: hoạt động đoàn kết',
  tl1.id,
  150000::numeric,
  CURRENT_DATE,
  nd1.id,
  td1.id,
  'https://example.org/bai-mau-hoat-dong',
  nv.id
FROM (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1) nv
CROSS JOIN LATERAL (SELECT id FROM public.bai_viet_thiet_lap_the_loai ORDER BY id LIMIT 1) tl1
CROSS JOIN LATERAL (SELECT id FROM public.bai_viet_thiet_lap_khac WHERE loai = 'nguon_dang' ORDER BY id LIMIT 1) nd1
CROSS JOIN LATERAL (SELECT id FROM public.bai_viet_thiet_lap_khac WHERE loai = 'trang_dang' ORDER BY id LIMIT 1) td1
WHERE NOT EXISTS (SELECT 1 FROM public.bai_viet_danh_sach LIMIT 1);

INSERT INTO public.bai_viet_danh_sach (
  ten_bai,
  id_the_loai,
  don_gia,
  ngay_dang,
  id_nguon_dang,
  id_trang_dang,
  link,
  id_nguoi_tao
)
SELECT
  'Bài mẫu: tin tức địa phương',
  tl2.id,
  200000::numeric,
  CURRENT_DATE - 1,
  nd2.id,
  td2.id,
  'https://example.org/bai-mau-tin-tuc',
  nv.id
FROM (SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1) nv
CROSS JOIN LATERAL (
  SELECT id FROM public.bai_viet_thiet_lap_the_loai ORDER BY id LIMIT 1 OFFSET 1
) tl2
CROSS JOIN LATERAL (
  SELECT id FROM public.bai_viet_thiet_lap_khac WHERE loai = 'nguon_dang' ORDER BY id LIMIT 1 OFFSET 1
) nd2
CROSS JOIN LATERAL (
  SELECT id FROM public.bai_viet_thiet_lap_khac WHERE loai = 'trang_dang' ORDER BY id LIMIT 1 OFFSET 1
) td2
WHERE EXISTS (SELECT 1 FROM public.bai_viet_thiet_lap_the_loai OFFSET 1 LIMIT 1)
  AND EXISTS (SELECT 1 FROM public.bai_viet_thiet_lap_khac WHERE loai = 'nguon_dang' OFFSET 1 LIMIT 1)
  AND EXISTS (SELECT 1 FROM public.bai_viet_thiet_lap_khac WHERE loai = 'trang_dang' OFFSET 1 LIMIT 1)
  AND (SELECT count(*)::int FROM public.bai_viet_danh_sach) = 1;
