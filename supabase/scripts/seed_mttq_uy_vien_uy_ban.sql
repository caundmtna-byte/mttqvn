-- Gợi ý: chạy sau migrate (cần migration thêm van_hoa, ngay_nhap_trang_thai trên mttq_can_bo nếu dùng UPDATE cuối)
-- và sau seed_mttq_nhiem_ky.sql (cần nhiệm kỳ 'Khóa XV (2024-2029)').
-- Cần ít nhất một dòng public.var_nhan_vien và đủ danh mục mttq_thiet_lap + var_chuc_vu (giống seed_mttq_can_bo).
-- Script idempotent: kiểm tra ma_uv UB1..UB3 cùng nhiệm kỳ Khóa XV.

DO $$
DECLARE
  v_nv   BIGINT;
  v_nk   BIGINT;
  v_tinh BIGINT;
  v_tan_ky   BIGINT;
  v_quy_chau BIGINT;
  v_tc BIGINT;
  v_dt BIGINT;
  v_td BIGINT;
  v_ll BIGINT;
  v_cv BIGINT;
  v_tt BIGINT;
  v_cb1 BIGINT;
  v_cb2 BIGINT;
  v_cb3 BIGINT;
BEGIN
  SELECT id INTO v_nv FROM public.var_nhan_vien ORDER BY id LIMIT 1;
  IF v_nv IS NULL THEN
    RAISE NOTICE 'seed_mttq_uy_vien_uy_ban: bỏ qua — chưa có var_nhan_vien';
    RETURN;
  END IF;

  SELECT id INTO v_nk FROM public.mttq_nhiem_ky
  WHERE lower(trim(ten_nhiem_ky)) = lower(trim('Khóa XV (2024-2029)'))
  LIMIT 1;
  IF v_nk IS NULL THEN
    RAISE NOTICE 'seed_mttq_uy_vien_uy_ban: bỏ qua — chưa có mttq_nhiem_ky Khóa XV (2024-2029)';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.mttq_uy_vien_uy_ban
    WHERE nhiem_ky_id = v_nk AND ma_uv = 'UB1'
  ) THEN
    RAISE NOTICE 'seed_mttq_uy_vien_uy_ban: đã có bản ghi mẫu (UB1, Khóa XV)';
    RETURN;
  END IF;

  SELECT id INTO v_tc FROM public.mttq_thiet_lap WHERE loai = 'to_chuc' ORDER BY thu_tu, id LIMIT 1;
  SELECT id INTO v_dt FROM public.mttq_thiet_lap WHERE loai = 'dan_toc' ORDER BY thu_tu, id LIMIT 1;
  SELECT id INTO v_td FROM public.mttq_thiet_lap WHERE loai = 'trinh_do' ORDER BY thu_tu, id LIMIT 1;
  SELECT id INTO v_ll FROM public.mttq_thiet_lap WHERE loai = 'ly_luan_chinh_tri' ORDER BY thu_tu, id LIMIT 1;
  SELECT id INTO v_cv FROM public.var_chuc_vu ORDER BY thu_tu, id LIMIT 1;
  SELECT id INTO v_tt FROM public.mttq_thiet_lap WHERE loai = 'trang_thai' ORDER BY thu_tu, id LIMIT 1;

  IF v_tc IS NULL OR v_dt IS NULL OR v_td IS NULL OR v_ll IS NULL OR v_cv IS NULL OR v_tt IS NULL THEN
    RAISE NOTICE 'seed_mttq_uy_vien_uy_ban: bỏ qua — thiếu thiết lập / var_chuc_vu (xem seed_mttq_can_bo)';
    RETURN;
  END IF;

  SELECT id INTO v_tinh FROM public.var_ssn_tinh_thanh
  WHERE lower(trim(ten)) = lower(trim('Nghệ An'))
  LIMIT 1;

  IF v_tinh IS NOT NULL THEN
    INSERT INTO public.var_ssn_xa_phuong (id_tinh_thanh, ten, thu_tu)
    SELECT v_tinh, v.ten, v.thu_tu
    FROM (VALUES
      ('xã Tân Kỳ', 1),
      ('xã Quỳ Châu', 2)
    ) AS v(ten, thu_tu)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.var_ssn_xa_phuong x
      WHERE x.id_tinh_thanh = v_tinh AND lower(trim(x.ten)) = lower(trim(v.ten))
    );

    SELECT id INTO v_tan_ky FROM public.var_ssn_xa_phuong
    WHERE id_tinh_thanh = v_tinh AND lower(trim(ten)) = lower(trim('xã Tân Kỳ')) LIMIT 1;
    SELECT id INTO v_quy_chau FROM public.var_ssn_xa_phuong
    WHERE id_tinh_thanh = v_tinh AND lower(trim(ten)) = lower(trim('xã Quỳ Châu')) LIMIT 1;
  END IF;

  -- Đảm bảo 3 cán bộ mẫu (khớp họ tên + ngày sinh với dữ liệu ủy viên cũ) để FK can_bo_id
  INSERT INTO public.mttq_can_bo (
    to_chuc_id, ho_ten, ngay_sinh, gioi_tinh, dan_toc_id, ton_giao, dia_chi,
    dang_vien, trinh_do_id, ly_luan_chinh_tri_id, dien_thoai, chuc_vu_id,
    phong_ban_id, don_vi_id,
    ngay_tham_gia_to_chuc, trang_thai_id, ngay_nhap_trang_thai, id_nguoi_tao
  )
  SELECT v_tc, v.ho_ten, v.ngay_sinh::date, v.gioi_tinh::text, v_dt, v.ton_giao, v.dia_chi,
    true, v_td, v_ll, v.dien_thoai, v_cv,
    NULL, NULL,
    DATE '2015-05-01', v_tt, CURRENT_DATE, v_nv
  FROM (VALUES
    ('Hoàng Nghĩa Hiếu', DATE '1967-01-01', 'Nam', 'Không', 'Nghệ An', '0900000001'),
    ('Kha Văn Tám', DATE '1972-01-01', 'Nam', 'Không', 'Nghệ An', '0900000002'),
    ('Nguyễn Quang Tùng', DATE '1965-01-01', 'Nam', 'Không', 'Nghệ An', '0900000003')
  ) AS v(ho_ten, ngay_sinh, gioi_tinh, ton_giao, dia_chi, dien_thoai)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.mttq_can_bo c
    WHERE lower(trim(c.ho_ten)) = lower(trim(v.ho_ten))
      AND c.ngay_sinh IS NOT DISTINCT FROM v.ngay_sinh::date
  );

  SELECT id INTO v_cb1 FROM public.mttq_can_bo
  WHERE lower(trim(ho_ten)) = lower(trim('Hoàng Nghĩa Hiếu')) AND ngay_sinh = DATE '1967-01-01'
  ORDER BY id LIMIT 1;
  SELECT id INTO v_cb2 FROM public.mttq_can_bo
  WHERE lower(trim(ho_ten)) = lower(trim('Kha Văn Tám')) AND ngay_sinh = DATE '1972-01-01'
  ORDER BY id LIMIT 1;
  SELECT id INTO v_cb3 FROM public.mttq_can_bo
  WHERE lower(trim(ho_ten)) = lower(trim('Nguyễn Quang Tùng')) AND ngay_sinh = DATE '1965-01-01'
  ORDER BY id LIMIT 1;

  IF v_cb1 IS NULL OR v_cb2 IS NULL OR v_cb3 IS NULL THEN
    RAISE NOTICE 'seed_mttq_uy_vien_uy_ban: bỏ qua — không tạo/lấy được 3 mttq_can_bo tương ứng';
    RETURN;
  END IF;

  INSERT INTO public.mttq_uy_vien_uy_ban (
    ma_uv, nhiem_ky_id, don_vi_id, can_bo_id,
    trang_thai_tham_gia, ghi_chu, id_nguoi_tao
  ) VALUES
    ('UB1', v_nk, NULL, v_cb1, 'Đang tham gia', NULL, v_nv),
    ('UB2', v_nk, v_tan_ky, v_cb2, 'Đang tham gia', NULL, v_nv),
    ('UB3', v_nk, v_quy_chau, v_cb3, 'Đang tham gia', NULL, v_nv);

  UPDATE public.mttq_can_bo c
  SET
    van_hoa = COALESCE(NULLIF(btrim(c.van_hoa), ''), '12/12'),
    ngay_nhap_trang_thai = COALESCE(c.ngay_nhap_trang_thai, DATE '2024-07-31')
  WHERE c.id IN (v_cb1, v_cb2, v_cb3);

  RAISE NOTICE 'seed_mttq_uy_vien_uy_ban: đã chèn 3 ủy viên mẫu (nhiem_ky_id=%)', v_nk;
END $$;
