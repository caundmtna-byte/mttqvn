-- Gợi ý: chạy sau migrate và sau seed_mttq_nhiem_ky.sql (cần nhiệm kỳ 'Khóa XV (2024-2029)').
-- Cần ít nhất một dòng public.var_nhan_vien.
-- Script idempotent: kiểm tra ma_uv UB1..UB3 cùng nhiệm kỳ Khóa XV.

DO $$
DECLARE
  v_nv   BIGINT;
  v_nk   BIGINT;
  v_tinh BIGINT;
  v_tan_ky   BIGINT;
  v_quy_chau BIGINT;
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

  INSERT INTO public.mttq_uy_vien_uy_ban (
    ma_uv, nhiem_ky_id, don_vi_id, ho_va_ten, chuc_vu_don_vi,
    ngay_sinh, gioi_tinh, trang_thai_tham_gia, ngay_nhap_trang_thai,
    van_hoa, trinh_do_cm, trinh_do_llct, dan_toc, ton_giao, dang_vien,
    ngay_vao_dang, que_quan, noi_o_hien_nay, so_dien_thoai, ghi_chu, id_nguoi_tao
  ) VALUES
    (
      'UB1', v_nk, NULL, 'Hoàng Nghĩa Hiếu', 'Phó Bí thư Tỉnh ủy',
      DATE '1967-01-01', 'Nam', 'Đang tham gia', DATE '2024-07-31',
      '12/12', 'Thạc sĩ', 'Cao cấp', 'Kinh', 'Không', true,
      NULL, NULL, NULL, NULL, NULL, v_nv
    ),
    (
      'UB2', v_nk, v_tan_ky, 'Kha Văn Tám', 'Chủ tịch Liên đoàn Lao động',
      DATE '1972-01-01', 'Nam', 'Đang tham gia', DATE '2024-07-31',
      '12/12', 'Thạc sĩ', 'Cao cấp', 'Kinh', 'Không', true,
      NULL, NULL, NULL, NULL, NULL, v_nv
    ),
    (
      'UB3', v_nk, v_quy_chau, 'Nguyễn Quang Tùng', 'Chủ tịch Hội Nông dân',
      DATE '1965-01-01', 'Nam', 'Đang tham gia', DATE '2024-07-31',
      '12/12', 'Đại học', 'Cao cấp', 'Kinh', 'Không', true,
      NULL, NULL, NULL, NULL, NULL, v_nv
    );

  RAISE NOTICE 'seed_mttq_uy_vien_uy_ban: đã chèn 3 ủy viên mẫu (nhiem_ky_id=%)', v_nk;
END $$;
