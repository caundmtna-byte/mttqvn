-- Gợi ý: chạy sau migrate và sau seed_mttq_ky_hop.sql + seed_mttq_uy_vien_uy_ban.sql.
-- Cần nhiệm kỳ 'Khóa XV (2024-2029)', kỳ họp 'Lần thứ 1' (cấp tỉnh), ủy viên UB1/UB2/UB3.
-- Script idempotent: kiểm tra xem đã có bản ghi điểm danh cho kỳ họp + ủy viên tương ứng chưa.

DO $$
DECLARE
  v_nv      BIGINT;
  v_nk      BIGINT;
  v_kh1     BIGINT;
  v_kh2     BIGINT;
  v_uv1     BIGINT;
  v_uv2     BIGINT;
  v_uv3     BIGINT;
BEGIN
  SELECT id INTO v_nv FROM public.var_nhan_vien ORDER BY id LIMIT 1;
  IF v_nv IS NULL THEN
    RAISE NOTICE 'seed_mttq_diem_danh_uy_vien: bỏ qua — chưa có var_nhan_vien';
    RETURN;
  END IF;

  SELECT id INTO v_nk FROM public.mttq_nhiem_ky
  WHERE lower(trim(ten_nhiem_ky)) = lower(trim('Khóa XV (2024-2029)'))
  LIMIT 1;
  IF v_nk IS NULL THEN
    RAISE NOTICE 'seed_mttq_diem_danh_uy_vien: bỏ qua — chưa có mttq_nhiem_ky Khóa XV (2024-2029)';
    RETURN;
  END IF;

  -- Lấy kỳ họp cấp tỉnh lần thứ 1 và lần thứ 2
  SELECT id INTO v_kh1 FROM public.mttq_ky_hop
  WHERE nhiem_ky_id = v_nk AND ky_thu = 'Lần thứ 1' AND don_vi_id IS NULL
  LIMIT 1;
  SELECT id INTO v_kh2 FROM public.mttq_ky_hop
  WHERE nhiem_ky_id = v_nk AND ky_thu = 'Lần thứ 2' AND don_vi_id IS NULL
  LIMIT 1;

  IF v_kh1 IS NULL THEN
    RAISE NOTICE 'seed_mttq_diem_danh_uy_vien: bỏ qua — chưa có mttq_ky_hop (chạy seed_mttq_ky_hop.sql)';
    RETURN;
  END IF;

  -- Lấy ủy viên UB1, UB2, UB3
  SELECT id INTO v_uv1 FROM public.mttq_uy_vien_uy_ban
  WHERE nhiem_ky_id = v_nk AND lower(trim(ma_uv)) = 'ub1' LIMIT 1;
  SELECT id INTO v_uv2 FROM public.mttq_uy_vien_uy_ban
  WHERE nhiem_ky_id = v_nk AND lower(trim(ma_uv)) = 'ub2' LIMIT 1;
  SELECT id INTO v_uv3 FROM public.mttq_uy_vien_uy_ban
  WHERE nhiem_ky_id = v_nk AND lower(trim(ma_uv)) = 'ub3' LIMIT 1;

  IF v_uv1 IS NULL THEN
    RAISE NOTICE 'seed_mttq_diem_danh_uy_vien: bỏ qua — chưa có ủy viên (chạy seed_mttq_uy_vien_uy_ban.sql)';
    RETURN;
  END IF;

  -- Kiểm tra idempotent
  IF EXISTS (
    SELECT 1 FROM public.mttq_diem_danh_uy_vien
    WHERE ky_hop_id = v_kh1 AND uy_vien_id = v_uv1
  ) THEN
    RAISE NOTICE 'seed_mttq_diem_danh_uy_vien: đã có bản ghi mẫu, bỏ qua';
    RETURN;
  END IF;

  -- Điểm danh kỳ họp lần 1: UB1 có mặt, UB2 có mặt, UB3 vắng mặt
  INSERT INTO public.mttq_diem_danh_uy_vien (ky_hop_id, uy_vien_id, trang_thai, ghi_chu, id_nguoi_tao)
  VALUES
    (v_kh1, v_uv1, 'Có mặt',   NULL,           v_nv),
    (v_kh1, v_uv2, 'Có mặt',   NULL,           v_nv),
    (v_kh1, v_uv3, 'Vắng mặt', 'Bận công tác', v_nv);

  -- Điểm danh kỳ họp lần 2 (nếu tồn tại): UB1 có mặt, UB2 vắng mặt, UB3 có mặt
  IF v_kh2 IS NOT NULL AND v_uv2 IS NOT NULL AND v_uv3 IS NOT NULL THEN
    INSERT INTO public.mttq_diem_danh_uy_vien (ky_hop_id, uy_vien_id, trang_thai, ghi_chu, id_nguoi_tao)
    VALUES
      (v_kh2, v_uv1, 'Có mặt',   NULL,     v_nv),
      (v_kh2, v_uv2, 'Vắng mặt', NULL,     v_nv),
      (v_kh2, v_uv3, 'Có mặt',   NULL,     v_nv);
  END IF;

  RAISE NOTICE 'seed_mttq_diem_danh_uy_vien: đã chèn dữ liệu điểm danh mẫu';
END $$;
