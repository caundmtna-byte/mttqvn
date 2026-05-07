-- Gợi ý: chạy sau migrate và sau seed_mttq_nhiem_ky.sql (cần nhiệm kỳ 'Khóa XV (2024-2029)').
-- Cần ít nhất một dòng public.var_nhan_vien.
-- Script idempotent: kiểm tra bản ghi mẫu (nhiệm kỳ Khóa XV, kỳ thứ 1, ngày 2024-07-31, cấp tỉnh don_vi_id NULL).

DO $$
DECLARE
  v_nv     BIGINT;
  v_nk     BIGINT;
  v_tinh   BIGINT;
  v_dc     BIGINT;
  v_vinh   BIGINT;
  v_as     BIGINT;
BEGIN
  SELECT id INTO v_nv FROM public.var_nhan_vien ORDER BY id LIMIT 1;
  IF v_nv IS NULL THEN
    RAISE NOTICE 'seed_mttq_ky_hop: bỏ qua — chưa có var_nhan_vien';
    RETURN;
  END IF;

  SELECT id INTO v_nk FROM public.mttq_nhiem_ky
  WHERE lower(trim(ten_nhiem_ky)) = lower(trim('Khóa XV (2024-2029)'))
  LIMIT 1;
  IF v_nk IS NULL THEN
    RAISE NOTICE 'seed_mttq_ky_hop: bỏ qua — chưa có mttq_nhiem_ky Khóa XV (2024-2029) (chạy seed_mttq_nhiem_ky.sql)';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.mttq_ky_hop
    WHERE nhiem_ky_id = v_nk
      AND ky_thu = 'Lần thứ 1'
      AND don_vi_id IS NULL
      AND ngay_hop = DATE '2024-07-31'
  ) THEN
    RAISE NOTICE 'seed_mttq_ky_hop: đã có bản ghi mẫu (Khóa XV, Lần thứ 1, 2024-07-31, cấp tỉnh)';
    RETURN;
  END IF;

  -- Đảm bảo có xã/phường tên Diễn Châu, Vinh, Anh Sơn (seed gốc chỉ có xã An Giang)
  SELECT id INTO v_tinh FROM public.var_ssn_tinh_thanh
  WHERE lower(trim(ten)) = lower(trim('Nghệ An'))
  LIMIT 1;

  IF v_tinh IS NOT NULL THEN
    INSERT INTO public.var_ssn_xa_phuong (id_tinh_thanh, ten, thu_tu)
    SELECT v_tinh, v.ten, v.thu_tu
    FROM (VALUES
      ('Diễn Châu', 1),
      ('Vinh', 2),
      ('Anh Sơn', 3)
    ) AS v(ten, thu_tu)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.var_ssn_xa_phuong x
      WHERE x.id_tinh_thanh = v_tinh AND lower(trim(x.ten)) = lower(trim(v.ten))
    );

    SELECT id INTO v_dc FROM public.var_ssn_xa_phuong
    WHERE id_tinh_thanh = v_tinh AND lower(trim(ten)) = lower(trim('Diễn Châu')) LIMIT 1;
    SELECT id INTO v_vinh FROM public.var_ssn_xa_phuong
    WHERE id_tinh_thanh = v_tinh AND lower(trim(ten)) = lower(trim('Vinh')) LIMIT 1;
    SELECT id INTO v_as FROM public.var_ssn_xa_phuong
    WHERE id_tinh_thanh = v_tinh AND lower(trim(ten)) = lower(trim('Anh Sơn')) LIMIT 1;
  END IF;

  INSERT INTO public.mttq_ky_hop (
    nhiem_ky_id, don_vi_id, ky_thu, ngay_hop, noi_dung_ky_hop, tai_lieu_hop, ghi_chu, id_nguoi_tao
  ) VALUES
    (v_nk, NULL, 'Lần thứ 1', '2024-07-31', 'Phiên họp thứ nhất', NULL, NULL, v_nv),
    (v_nk, NULL, 'Lần thứ 2', '2024-08-30', 'Kỳ họp thứ 2 khóa XV, nhiệm kỳ 2024 - 2029', NULL, NULL, v_nv),
    (v_nk, NULL, 'Lần thứ 3', '2024-10-10', 'Kỳ họp thứ 3 khóa XV, nhiệm kỳ 2024 - 2029', NULL, NULL, v_nv),
    (v_nk, v_dc, 'Lần thứ 4', '2024-12-12', '1111', NULL, NULL, v_nv),
    (v_nk, v_vinh, 'Lần thứ 1', '2024-07-12', 'Kỳ họp thứ nhất', NULL, NULL, v_nv),
    (v_nk, v_as, 'Lần thứ 1', '2024-04-25', 'Kỳ họp thứ nhất', NULL, NULL, v_nv),
    (v_nk, NULL, 'Lần thứ 1', '2025-01-02', 'Lần thứ 5', NULL, NULL, v_nv);

  RAISE NOTICE 'seed_mttq_ky_hop: đã chèn 7 kỳ họp mẫu (nhiem_ky_id=%)', v_nk;
END $$;
