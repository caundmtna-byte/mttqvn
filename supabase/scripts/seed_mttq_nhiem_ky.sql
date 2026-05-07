-- Gợi ý: chạy thủ công trên Supabase SQL Editor (hoặc sau migrate) khi đã có ít nhất một dòng public.var_nhan_vien.
-- Script idempotent: kiểm tra ten_nhiem_ky mẫu 'Khóa XV (2024-2029)'.

DO $$
DECLARE
  v_nv BIGINT;
BEGIN
  SELECT id INTO v_nv FROM public.var_nhan_vien ORDER BY id LIMIT 1;
  IF v_nv IS NULL THEN
    RAISE NOTICE 'seed_mttq_nhiem_ky: bỏ qua — chưa có var_nhan_vien';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.mttq_nhiem_ky WHERE ten_nhiem_ky = 'Khóa XV (2024-2029)'
  ) THEN
    RAISE NOTICE 'seed_mttq_nhiem_ky: đã có bản ghi mẫu (ten_nhiem_ky = Khóa XV (2024-2029))';
    RETURN;
  END IF;

  INSERT INTO public.mttq_nhiem_ky (
    ten_nhiem_ky,
    tu_nam,
    den_nam,
    thong_tin,
    sl_dau_nhiem_ky,
    sl_dang_tham_gia,
    sl_thoi_tham_gia,
    sl_can_bo_sung,
    sl_thieu,
    id_nguoi_tao
  ) VALUES (
    'Khóa XV (2024-2029)',
    2024,
    2029,
    'Thông tin nhiệm kỳ Khóa XV',
    114,
    114,
    1,
    0,
    -1,
    v_nv
  );
END $$;
