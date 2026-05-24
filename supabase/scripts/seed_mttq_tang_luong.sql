-- Gợi ý: chạy thủ công trên Supabase SQL Editor sau migrate `20260612180000_mttq_tang_luong.sql`.
-- Phụ thuộc:
--   - public.var_nhan_vien (≥1)
--   - public.mttq_can_bo (≥1) — seed_mttq_can_bo.sql
--   - public.luong_thiet_lap_ngach_luong + bậc — seed_luong_thiet_lap_ngach_luong.sql
-- Idempotent: bỏ qua nếu đã có ghi chú seed.

DO $$
DECLARE
  v_nv    BIGINT;
  v_cb    BIGINT;
  v_ngach BIGINT;
  v_bac1  BIGINT;
  v_bac2  BIGINT;
  v_mlcs  NUMERIC;
  v_he1   NUMERIC;
  v_he2   NUMERIC;
  v_luong1 BIGINT;
  v_luong2 BIGINT;
BEGIN
  SELECT id INTO v_nv FROM public.var_nhan_vien ORDER BY id LIMIT 1;
  IF v_nv IS NULL THEN
    RAISE NOTICE 'seed_mttq_tang_luong: bỏ qua — chưa có var_nhan_vien';
    RETURN;
  END IF;

  SELECT id INTO v_cb FROM public.mttq_can_bo ORDER BY id LIMIT 1;
  IF v_cb IS NULL THEN
    RAISE NOTICE 'seed_mttq_tang_luong: bỏ qua — chưa có mttq_can_bo';
    RETURN;
  END IF;

  SELECT id INTO v_ngach FROM public.luong_thiet_lap_ngach_luong ORDER BY thu_tu, id LIMIT 1;
  IF v_ngach IS NULL THEN
    RAISE NOTICE 'seed_mttq_tang_luong: bỏ qua — chưa có ngạch lương (chạy seed_luong_thiet_lap_ngach_luong.sql)';
    RETURN;
  END IF;

  SELECT id INTO v_bac1
  FROM public.luong_thiet_lap_bac_luong
  WHERE ngach_luong_id = v_ngach
  ORDER BY thu_tu, ma_bac
  LIMIT 1;

  SELECT id INTO v_bac2
  FROM public.luong_thiet_lap_bac_luong
  WHERE ngach_luong_id = v_ngach AND id <> COALESCE(v_bac1, 0)
  ORDER BY thu_tu, ma_bac
  OFFSET 1 LIMIT 1;

  IF v_bac1 IS NULL OR v_bac2 IS NULL THEN
    RAISE NOTICE 'seed_mttq_tang_luong: bỏ qua — chưa đủ bậc lương cho ngạch id=%', v_ngach;
    RETURN;
  END IF;

  SELECT muc_luong_co_so INTO v_mlcs FROM public.luong_thiet_lap_cau_hinh WHERE id = 1;
  SELECT he_so INTO v_he1 FROM public.luong_thiet_lap_bac_luong WHERE id = v_bac1;
  SELECT he_so INTO v_he2 FROM public.luong_thiet_lap_bac_luong WHERE id = v_bac2;
  v_luong1 := ROUND(COALESCE(v_mlcs, 0) * COALESCE(v_he1, 0))::BIGINT;
  v_luong2 := ROUND(COALESCE(v_mlcs, 0) * COALESCE(v_he2, 0))::BIGINT;

  IF EXISTS (
    SELECT 1 FROM public.mttq_tang_luong
    WHERE ghi_chu = 'Dữ liệu seed — có thể xóa sau khi test.'
  ) THEN
    RAISE NOTICE 'seed_mttq_tang_luong: đã có bản ghi mẫu';
    RETURN;
  END IF;

  INSERT INTO public.mttq_tang_luong (
    can_bo_id,
    ngay_nang_luong,
    loai_ky,
    ngach_luong_id_cu,
    bac_luong_id_cu,
    ngach_luong_id_moi,
    bac_luong_id_moi,
    so_thang_rut_ngan,
    ngay_den_han_goc,
    luong,
    ghi_chu,
    id_nguoi_tao
  ) VALUES (
    v_cb,
    DATE '2023-01-01',
    'dung_han',
    NULL,
    NULL,
    v_ngach,
    v_bac1,
    NULL,
    NULL,
    v_luong1,
    'Dữ liệu seed — có thể xóa sau khi test.',
    v_nv
  );

  INSERT INTO public.mttq_tang_luong (
    can_bo_id,
    ngay_nang_luong,
    loai_ky,
    ngach_luong_id_cu,
    bac_luong_id_cu,
    ngach_luong_id_moi,
    bac_luong_id_moi,
    so_thang_rut_ngan,
    ngay_den_han_goc,
    luong,
    ghi_chu,
    id_nguoi_tao
  ) VALUES (
    v_cb,
    DATE '2026-01-01',
    'truoc_han_6',
    v_ngach,
    v_bac1,
    v_ngach,
    v_bac2,
    6,
    DATE '2026-01-01',
    v_luong2,
    'Lần nâng thứ hai (seed, trước hạn 6 tháng).',
    v_nv
  );

  RAISE NOTICE 'seed_mttq_tang_luong: đã tạo 2 bản ghi lịch sử cho can_bo_id=%', v_cb;
END $$;
