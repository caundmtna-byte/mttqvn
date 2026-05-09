-- Gợi ý: chạy thủ công sau khi đã có dữ liệu mttq_thiet_lap (đủ loại), ít nhất một var_chuc_vu, và ít nhất một var_nhan_vien.
-- Thay các ID bằng ID thực tế trong DB của bạn (hoặc bỏ file nếu không cần mẫu).

DO $$
DECLARE
  v_nv BIGINT;
  v_tc BIGINT;
  v_dt BIGINT;
  v_td BIGINT;
  v_ll BIGINT;
  v_cv BIGINT;
  v_tt BIGINT;
BEGIN
  SELECT id INTO v_nv FROM public.var_nhan_vien ORDER BY id LIMIT 1;
  IF v_nv IS NULL THEN
    RAISE NOTICE 'seed_mttq_can_bo: bỏ qua — chưa có var_nhan_vien';
    RETURN;
  END IF;

  SELECT id INTO v_tc FROM public.mttq_thiet_lap WHERE loai = 'to_chuc' ORDER BY thu_tu, id LIMIT 1;
  SELECT id INTO v_dt FROM public.mttq_thiet_lap WHERE loai = 'dan_toc' ORDER BY thu_tu, id LIMIT 1;
  SELECT id INTO v_td FROM public.mttq_thiet_lap WHERE loai = 'trinh_do' ORDER BY thu_tu, id LIMIT 1;
  SELECT id INTO v_ll FROM public.mttq_thiet_lap WHERE loai = 'ly_luan_chinh_tri' ORDER BY thu_tu, id LIMIT 1;
  SELECT id INTO v_cv FROM public.var_chuc_vu ORDER BY thu_tu, id LIMIT 1;
  SELECT id INTO v_tt FROM public.mttq_thiet_lap WHERE loai = 'trang_thai' ORDER BY thu_tu, id LIMIT 1;

  IF v_cv IS NULL THEN
    RAISE NOTICE 'seed_mttq_can_bo: bỏ qua — chưa có var_chuc_vu';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.mttq_can_bo WHERE ho_ten = 'Cán bộ mẫu (seed)') THEN
    RAISE NOTICE 'seed_mttq_can_bo: đã có bản ghi mẫu';
    RETURN;
  END IF;

  INSERT INTO public.mttq_can_bo (
    to_chuc_id, ho_ten, ngay_sinh, gioi_tinh, dan_toc_id, ton_giao, dia_chi,
    dang_vien, trinh_do_id, ly_luan_chinh_tri_id, dien_thoai, chuc_vu_id,
    phong_ban_id,
    ngay_tham_gia_to_chuc, trang_thai_id, ngay_nhap_trang_thai, id_nguoi_tao
  ) VALUES (
    v_tc, 'Cán bộ mẫu (seed)', '1988-06-01', 'Nam', v_dt, NULL, 'Nghệ An',
    true, v_td, v_ll, '0900000000', v_cv,
    NULL,
    '2015-05-01', v_tt, CURRENT_DATE, v_nv
  );
END $$;
