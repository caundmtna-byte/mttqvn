-- ============================================================================
-- DTTG Dịp thăm hỏi — backfill dữ liệu từ bảng con + grant view
-- Chạy khi bảng cha trống nhưng bảng con đã có dip_tham_hoi (TEXT)
-- ============================================================================

-- Quyền đọc view (cần cho PostgREST / authenticated)
GRANT SELECT ON public.dttg_dip_tham_hoi_with_counts TO authenticated;
GRANT SELECT ON public.dttg_dip_tham_hoi_with_counts TO anon;

ALTER VIEW public.dttg_dip_tham_hoi_with_counts SET (security_invoker = true);

-- Backfill bản ghi cha từ DISTINCT dip_tham_hoi ở bảng con
INSERT INTO public.dttg_dip_tham_hoi (ten_dip, id_nguoi_tao)
SELECT DISTINCT trim(src.dip_tham_hoi), nv.id
FROM (
  SELECT dip_tham_hoi FROM public.dttg_tham_hoi_to_chuc
  WHERE dip_tham_hoi IS NOT NULL AND trim(dip_tham_hoi) <> ''
  UNION
  SELECT dip_tham_hoi FROM public.dttg_tham_hoi_ca_nhan
  WHERE dip_tham_hoi IS NOT NULL AND trim(dip_tham_hoi) <> ''
) src
CROSS JOIN LATERAL (
  SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1
) nv
WHERE NOT EXISTS (
  SELECT 1 FROM public.dttg_dip_tham_hoi d
  WHERE lower(trim(d.ten_dip)) = lower(trim(src.dip_tham_hoi))
);

-- Gắn FK dip_tham_hoi_id trên bảng con (nếu cột đã có)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'dttg_tham_hoi_to_chuc'
      AND column_name = 'dip_tham_hoi_id'
  ) THEN
    UPDATE public.dttg_tham_hoi_to_chuc t
    SET dip_tham_hoi_id = d.id
    FROM public.dttg_dip_tham_hoi d
    WHERE t.dip_tham_hoi_id IS NULL
      AND t.dip_tham_hoi IS NOT NULL
      AND trim(t.dip_tham_hoi) <> ''
      AND lower(trim(t.dip_tham_hoi)) = lower(trim(d.ten_dip));
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'dttg_tham_hoi_ca_nhan'
      AND column_name = 'dip_tham_hoi_id'
  ) THEN
    UPDATE public.dttg_tham_hoi_ca_nhan t
    SET dip_tham_hoi_id = d.id
    FROM public.dttg_dip_tham_hoi d
    WHERE t.dip_tham_hoi_id IS NULL
      AND t.dip_tham_hoi IS NOT NULL
      AND trim(t.dip_tham_hoi) <> ''
      AND lower(trim(t.dip_tham_hoi)) = lower(trim(d.ten_dip));
  END IF;
END $$;

-- Seed mẫu nếu vẫn trống (dev/demo)
INSERT INTO public.dttg_dip_tham_hoi (
  ten_dip,
  mo_ta,
  thoi_gian_du_kien,
  so_luong_to_chuc_du_kien,
  so_luong_ca_nhan_du_kien,
  trang_thai,
  id_nguoi_tao
)
SELECT
  seed.ten_dip,
  seed.mo_ta,
  seed.thoi_gian_du_kien,
  seed.so_luong_to_chuc_du_kien,
  seed.so_luong_ca_nhan_du_kien,
  seed.trang_thai,
  nv.id
FROM (
  VALUES
    (
      'Đại lễ Phật đản'::text,
      'Thăm hỏi các cơ sở tôn giáo dịp Phật đản'::text,
      'Tháng 5/2026'::text,
      10::int,
      5::int,
      'Chưa thực hiện'::text
    ),
    (
      'Ngày Thương binh - Liệt sĩ (27/7)',
      'Thăm hỏi dịp 27/7',
      'Tháng 7/2026',
      8,
      12,
      'Đang thực hiện'
    )
) AS seed (ten_dip, mo_ta, thoi_gian_du_kien, so_luong_to_chuc_du_kien, so_luong_ca_nhan_du_kien, trang_thai)
CROSS JOIN LATERAL (
  SELECT id FROM public.var_nhan_vien ORDER BY id LIMIT 1
) nv
WHERE NOT EXISTS (SELECT 1 FROM public.dttg_dip_tham_hoi LIMIT 1)
  AND nv.id IS NOT NULL;
