-- Gợi ý: chạy thủ công trên Supabase SQL Editor (hoặc sau migrate) khi đã có:
--   - ít nhất một dòng public.var_nhan_vien
--   - ít nhất một dòng public.mttq_can_bo (có thể chạy seed_mttq_can_bo.sql trước)
-- Script idempotent: kiểm tra ten_lop_tap_huan mẫu 'Lớp seed — bồi dưỡng kỹ năng giám sát'.

DO $$
DECLARE
  v_nv     BIGINT;
  v_cb1    BIGINT;
  v_cb2    BIGINT;
  v_lop1   BIGINT;
  v_lop2   BIGINT;
BEGIN
  SELECT id INTO v_nv FROM public.var_nhan_vien ORDER BY id LIMIT 1;
  IF v_nv IS NULL THEN
    RAISE NOTICE 'seed_mttq_lop_tap_huan: bỏ qua — chưa có var_nhan_vien';
    RETURN;
  END IF;

  SELECT id INTO v_cb1 FROM public.mttq_can_bo ORDER BY id LIMIT 1;
  IF v_cb1 IS NULL THEN
    RAISE NOTICE 'seed_mttq_lop_tap_huan: bỏ qua — chưa có mttq_can_bo (chạy seed_mttq_can_bo.sql hoặc tạo cán bộ)';
    RETURN;
  END IF;

  SELECT id INTO v_cb2 FROM public.mttq_can_bo WHERE id <> v_cb1 ORDER BY id LIMIT 1;

  IF EXISTS (
    SELECT 1 FROM public.mttq_lop_tap_huan
    WHERE ten_lop_tap_huan = 'Lớp seed — bồi dưỡng kỹ năng giám sát'
  ) THEN
    RAISE NOTICE 'seed_mttq_lop_tap_huan: đã có bản ghi mẫu (ten_lop_tap_huan = Lớp seed — bồi dưỡng kỹ năng giám sát)';
    RETURN;
  END IF;

  INSERT INTO public.mttq_lop_tap_huan (
    ten_lop_tap_huan,
    nam_tap_huan,
    cap_tap_huan,
    ghi_chu,
    id_nguoi_tao
  ) VALUES (
    'Lớp seed — bồi dưỡng kỹ năng giám sát',
    2026,
    'Cấp tỉnh',
    'Tập huấn đợt 1 đầu năm (seed).',
    v_nv
  )
  RETURNING id INTO v_lop1;

  INSERT INTO public.mttq_lop_tap_huan (
    ten_lop_tap_huan,
    nam_tap_huan,
    cap_tap_huan,
    ghi_chu,
    id_nguoi_tao
  ) VALUES (
    'Lớp seed — nghiệp vụ công tác Mặt trận',
    2026,
    'Cấp xã',
    'Tập huấn cho cán bộ mới (seed).',
    v_nv
  )
  RETURNING id INTO v_lop2;

  INSERT INTO public.mttq_lop_tap_huan_ct (
    id_lop_tap_huan,
    can_bo_id,
    thuoc_dien,
    chuc_vu,
    don_vi_cong_tac
  )
  SELECT
    v_lop1,
    cb.id,
    'Biên chế',
    COALESCE(cv.ten, ''),
    COALESCE(tc.ten, '')
  FROM public.mttq_can_bo cb
  LEFT JOIN public.mttq_thiet_lap cv ON cv.id = cb.chuc_vu_id
  LEFT JOIN public.mttq_thiet_lap tc ON tc.id = cb.to_chuc_id
  WHERE cb.id = v_cb1;

  IF v_cb2 IS NOT NULL THEN
    INSERT INTO public.mttq_lop_tap_huan_ct (
      id_lop_tap_huan,
      can_bo_id,
      thuoc_dien,
      chuc_vu,
      don_vi_cong_tac
    )
    SELECT
      v_lop1,
      cb.id,
      'Ngoài biên chế',
      COALESCE(cv.ten, ''),
      COALESCE(tc.ten, '')
    FROM public.mttq_can_bo cb
    LEFT JOIN public.mttq_thiet_lap cv ON cv.id = cb.chuc_vu_id
    LEFT JOIN public.mttq_thiet_lap tc ON tc.id = cb.to_chuc_id
    WHERE cb.id = v_cb2;
  END IF;

  IF v_cb2 IS NOT NULL THEN
    INSERT INTO public.mttq_lop_tap_huan_ct (
      id_lop_tap_huan,
      can_bo_id,
      thuoc_dien,
      chuc_vu,
      don_vi_cong_tac
    )
    SELECT
      v_lop2,
      cb.id,
      'Biên chế',
      COALESCE(cv.ten, ''),
      COALESCE(tc.ten, '')
    FROM public.mttq_can_bo cb
    LEFT JOIN public.mttq_thiet_lap cv ON cv.id = cb.chuc_vu_id
    LEFT JOIN public.mttq_thiet_lap tc ON tc.id = cb.to_chuc_id
    WHERE cb.id = v_cb1;

    INSERT INTO public.mttq_lop_tap_huan_ct (
      id_lop_tap_huan,
      can_bo_id,
      thuoc_dien,
      chuc_vu,
      don_vi_cong_tac
    )
    SELECT
      v_lop2,
      cb.id,
      'Ngoài biên chế',
      COALESCE(cv.ten, ''),
      COALESCE(tc.ten, '')
    FROM public.mttq_can_bo cb
    LEFT JOIN public.mttq_thiet_lap cv ON cv.id = cb.chuc_vu_id
    LEFT JOIN public.mttq_thiet_lap tc ON tc.id = cb.to_chuc_id
    WHERE cb.id = v_cb2;
  ELSE
    INSERT INTO public.mttq_lop_tap_huan_ct (
      id_lop_tap_huan,
      can_bo_id,
      thuoc_dien,
      chuc_vu,
      don_vi_cong_tac
    )
    SELECT
      v_lop2,
      cb.id,
      'Biên chế',
      COALESCE(cv.ten, ''),
      COALESCE(tc.ten, '')
    FROM public.mttq_can_bo cb
    LEFT JOIN public.mttq_thiet_lap cv ON cv.id = cb.chuc_vu_id
    LEFT JOIN public.mttq_thiet_lap tc ON tc.id = cb.to_chuc_id
    WHERE cb.id = v_cb1;
  END IF;

  RAISE NOTICE 'seed_mttq_lop_tap_huan: đã tạo 2 lớp tập huấn id=% và id=% với chi tiết', v_lop1, v_lop2;
END $$;
