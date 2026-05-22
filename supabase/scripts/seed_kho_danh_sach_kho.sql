-- ============================================================================
-- Seed mẫu: public.kho_danh_sach_kho (danh sách kho cứu trợ)
-- ============================================================================
-- Điều kiện:
--   - Đã chạy migration tạo bảng `kho_danh_sach_kho` + nullable `don_vi_id` (`20260611150000_...`) + cột `tt` (`20260611160000_...`)
--   - Có ít nhất một xã trong `var_ssn_xa_phuong` (seed địa bàn trong migration tinh/xa)
--
-- Cách chạy: Supabase SQL Editor (hoặc `psql` trỏ vào DB) — dán toàn bộ file.
--
-- Idempotent: chỉ chèn nếu chưa có dòng `ten_kho` bắt đầu bằng `SEED-KHO|`.
-- Xóa seed: `DELETE FROM public.kho_danh_sach_kho WHERE ten_kho LIKE 'SEED-KHO|%';`
-- ============================================================================

DO $$
DECLARE
  v_xa1 bigint;
  v_xa2 bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM public.kho_danh_sach_kho WHERE ten_kho LIKE 'SEED-KHO|%') THEN
    RAISE NOTICE 'seed_kho_danh_sach_kho: đã có bản ghi seed (bỏ qua).';
    RETURN;
  END IF;

  SELECT x.id
  INTO v_xa1
  FROM public.var_ssn_xa_phuong x
  JOIN public.var_ssn_tinh_thanh t ON t.id = x.id_tinh_thanh
  WHERE lower(trim(t.ten)) = lower(trim('An Giang'))
  ORDER BY x.thu_tu, x.id
  LIMIT 1;

  SELECT x.id
  INTO v_xa2
  FROM public.var_ssn_xa_phuong x
  JOIN public.var_ssn_tinh_thanh t ON t.id = x.id_tinh_thanh
  WHERE lower(trim(t.ten)) = lower(trim('An Giang'))
    AND x.id IS DISTINCT FROM v_xa1
  ORDER BY x.thu_tu, x.id
  LIMIT 1;

  IF v_xa1 IS NULL THEN
    RAISE NOTICE 'seed_kho_danh_sach_kho: bỏ qua — không tìm thấy xã (kiểm tra var_ssn_xa_phuong).';
    RETURN;
  END IF;

  INSERT INTO public.kho_danh_sach_kho (ten_kho, don_vi_id, mo_ta) VALUES
    (
      'SEED-KHO|Long Xuyên — kho trung tâm',
      v_xa1,
      'Dữ liệu seed — có thể xóa: DELETE ... WHERE ten_kho LIKE ''SEED-KHO|%'';'
    ),
    (
      'SEED-KHO|Dự phòng — hàng cứu trợ',
      COALESCE(v_xa2, v_xa1),
      'Dữ liệu seed — có thể xóa: DELETE ... WHERE ten_kho LIKE ''SEED-KHO|%'';'
    ),
    (
      'SEED-KHO|Tỉnh — chưa gắn xã/phường',
      NULL,
      'Dữ liệu seed (don_vi_id NULL) — có thể xóa: DELETE ... WHERE ten_kho LIKE ''SEED-KHO|%'';'
    );

  RAISE NOTICE 'seed_kho_danh_sach_kho: đã tạo 3 kho (2 xã + 1 không đơn vị).';
END $$;
