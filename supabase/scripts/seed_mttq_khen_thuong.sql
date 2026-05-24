-- Gợi ý: chạy thủ công trên Supabase SQL Editor (hoặc sau migrate) khi đã có:
--   - ít nhất một dòng public.var_nhan_vien
--   - ít nhất một dòng public.mttq_can_bo (có thể chạy seed_mttq_can_bo.sql trước)
-- Script idempotent: kiểm tra so_qd mẫu 'QĐ-MTTQ-SEED-01'.

DO $$
DECLARE
  v_nv   BIGINT;
  v_cb1  BIGINT;
  v_cb2  BIGINT;
  v_kt   BIGINT;
BEGIN
  SELECT id INTO v_nv FROM public.var_nhan_vien ORDER BY id LIMIT 1;
  IF v_nv IS NULL THEN
    RAISE NOTICE 'seed_mttq_khen_thuong: bỏ qua — chưa có var_nhan_vien';
    RETURN;
  END IF;

  SELECT id INTO v_cb1 FROM public.mttq_can_bo ORDER BY id LIMIT 1;
  IF v_cb1 IS NULL THEN
    RAISE NOTICE 'seed_mttq_khen_thuong: bỏ qua — chưa có mttq_can_bo (chạy seed_mttq_can_bo.sql hoặc tạo cán bộ)';
    RETURN;
  END IF;

  SELECT id INTO v_cb2 FROM public.mttq_can_bo WHERE id <> v_cb1 ORDER BY id LIMIT 1;

  IF EXISTS (SELECT 1 FROM public.mttq_khen_thuong WHERE so_qd = 'QĐ-MTTQ-SEED-01') THEN
    RAISE NOTICE 'seed_mttq_khen_thuong: đã có bản ghi mẫu (so_qd = QĐ-MTTQ-SEED-01)';
    RETURN;
  END IF;

  INSERT INTO public.mttq_khen_thuong (
    so_qd,
    ngay_khen_thuong,
    don_vi_de_xuat,
    ghi_chu,
    trang_thai,
    id_nguoi_tao
  ) VALUES (
    'QĐ-MTTQ-SEED-01',
    DATE '2026-03-15',
    'Ban Thường trực Ủy ban MTTQ (mẫu)',
    'Dữ liệu seed — có thể xóa sau khi test.',
    'Đã ban hành',
    v_nv
  )
  RETURNING id INTO v_kt;

  INSERT INTO public.mttq_khen_thuong_ct (
    id_khen_thuong,
    can_bo_id,
    cap_khen_thuong,
    hinh_thuc_khen,
    danh_hieu,
    noi_dung_khen,
    ho_so_khen
  ) VALUES
    (
      v_kt,
      v_cb1,
      'Xã',
      'Thường xuyên',
      'Giấy khen',
      'Hoàn thành tốt nhiệm vụ được giao (seed).',
      NULL
    ),
    (
      v_kt,
      COALESCE(v_cb2, v_cb1),
      'Tỉnh',
      'Chuyên đề',
      'Bằng khen',
      'Tham gia tích cực đợt cao điểm (seed).',
      NULL
    );

  RAISE NOTICE 'seed_mttq_khen_thuong: đã tạo quyết định id=% với 2 dòng chi tiết', v_kt;
END $$;
