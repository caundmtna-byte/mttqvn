-- ============================================================================
-- Dữ liệu mẫu: kho_danh_muc_hang_hoa + kho_danh_sach_hang_hoa (cứu trợ)
--
-- Phụ thuộc: migration 20260611140000_kho_hang_hoa.sql + public.set_tg_cap_nhat()
--
-- Cách chạy: Supabase → SQL Editor (hoặc psql), dán toàn bộ file và Execute.
-- Idempotent: INSERT ... SELECT ... WHERE NOT EXISTS theo unique (tên chuẩn hoá).
-- ============================================================================

-- ----- Danh mục -----
INSERT INTO public.kho_danh_muc_hang_hoa (ten_danh_muc, mo_ta, thu_tu, trang_thai)
SELECT 'Thực phẩm', 'Lương thực, thực phẩm khô và nước uống phục vụ cứu trợ', 1, 'Đang hoạt động'
WHERE NOT EXISTS (
  SELECT 1 FROM public.kho_danh_muc_hang_hoa t
  WHERE lower(trim(t.ten_danh_muc)) = lower(trim('Thực phẩm'))
);

INSERT INTO public.kho_danh_muc_hang_hoa (ten_danh_muc, mo_ta, thu_tu, trang_thai)
SELECT 'Y tế', 'Thuốc, vật tư y tế cơ bản', 2, 'Đang hoạt động'
WHERE NOT EXISTS (
  SELECT 1 FROM public.kho_danh_muc_hang_hoa t
  WHERE lower(trim(t.ten_danh_muc)) = lower(trim('Y tế'))
);

INSERT INTO public.kho_danh_muc_hang_hoa (ten_danh_muc, mo_ta, thu_tu, trang_thai)
SELECT 'Nhu yếu & sinh hoạt', 'Vệ sinh, đồ dùng cá nhân', 3, 'Đang hoạt động'
WHERE NOT EXISTS (
  SELECT 1 FROM public.kho_danh_muc_hang_hoa t
  WHERE lower(trim(t.ten_danh_muc)) = lower(trim('Nhu yếu & sinh hoạt'))
);

INSERT INTO public.kho_danh_muc_hang_hoa (ten_danh_muc, mo_ta, thu_tu, trang_thai)
SELECT 'Quần áo', 'Áo ấm, mưa, chăn màn', 4, 'Đang hoạt động'
WHERE NOT EXISTS (
  SELECT 1 FROM public.kho_danh_muc_hang_hoa t
  WHERE lower(trim(t.ten_danh_muc)) = lower(trim('Quần áo'))
);

INSERT INTO public.kho_danh_muc_hang_hoa (ten_danh_muc, mo_ta, thu_tu, trang_thai)
SELECT 'Khác', 'Vật tư không thuộc nhóm trên', 5, 'Đang hoạt động'
WHERE NOT EXISTS (
  SELECT 1 FROM public.kho_danh_muc_hang_hoa t
  WHERE lower(trim(t.ten_danh_muc)) = lower(trim('Khác'))
);

-- ----- Hàng hóa (theo id danh mục tra bằng tên) -----
INSERT INTO public.kho_danh_sach_hang_hoa (id_danh_muc, ten_hang_hoa, don_vi_tinh, mo_ta, quy_cach, thu_tu, trang_thai)
SELECT d.id, 'Gạo', 'kg', 'Gạo trắng xuất xứ trong nước', NULL, 1, 'Đang hoạt động'
FROM public.kho_danh_muc_hang_hoa d
WHERE lower(trim(d.ten_danh_muc)) = lower(trim('Thực phẩm'))
  AND NOT EXISTS (
    SELECT 1 FROM public.kho_danh_sach_hang_hoa h
    WHERE h.id_danh_muc = d.id AND lower(trim(h.ten_hang_hoa)) = lower(trim('Gạo'))
  );

INSERT INTO public.kho_danh_sach_hang_hoa (id_danh_muc, ten_hang_hoa, don_vi_tinh, mo_ta, quy_cach, thu_tu, trang_thai)
SELECT d.id, 'Mì gói', 'thùng', NULL, '30 gói/thùng', 2, 'Đang hoạt động'
FROM public.kho_danh_muc_hang_hoa d
WHERE lower(trim(d.ten_danh_muc)) = lower(trim('Thực phẩm'))
  AND NOT EXISTS (
    SELECT 1 FROM public.kho_danh_sach_hang_hoa h
    WHERE h.id_danh_muc = d.id AND lower(trim(h.ten_hang_hoa)) = lower(trim('Mì gói'))
  );

INSERT INTO public.kho_danh_sach_hang_hoa (id_danh_muc, ten_hang_hoa, don_vi_tinh, mo_ta, quy_cach, thu_tu, trang_thai)
SELECT d.id, 'Nước uống đóng chai', 'chai', NULL, '500ml/chai', 3, 'Đang hoạt động'
FROM public.kho_danh_muc_hang_hoa d
WHERE lower(trim(d.ten_danh_muc)) = lower(trim('Thực phẩm'))
  AND NOT EXISTS (
    SELECT 1 FROM public.kho_danh_sach_hang_hoa h
    WHERE h.id_danh_muc = d.id AND lower(trim(h.ten_hang_hoa)) = lower(trim('Nước uống đóng chai'))
  );

INSERT INTO public.kho_danh_sach_hang_hoa (id_danh_muc, ten_hang_hoa, don_vi_tinh, mo_ta, quy_cach, thu_tu, trang_thai)
SELECT d.id, 'Thuốc cảm cúm (gói)', 'gói', 'Theo chỉ định y tế khi phát', NULL, 1, 'Đang hoạt động'
FROM public.kho_danh_muc_hang_hoa d
WHERE lower(trim(d.ten_danh_muc)) = lower(trim('Y tế'))
  AND NOT EXISTS (
    SELECT 1 FROM public.kho_danh_sach_hang_hoa h
    WHERE h.id_danh_muc = d.id AND lower(trim(h.ten_hang_hoa)) = lower(trim('Thuốc cảm cúm (gói)'))
  );

INSERT INTO public.kho_danh_sach_hang_hoa (id_danh_muc, ten_hang_hoa, don_vi_tinh, mo_ta, quy_cach, thu_tu, trang_thai)
SELECT d.id, 'Băng gạc y tế', 'cuộn', NULL, NULL, 2, 'Đang hoạt động'
FROM public.kho_danh_muc_hang_hoa d
WHERE lower(trim(d.ten_danh_muc)) = lower(trim('Y tế'))
  AND NOT EXISTS (
    SELECT 1 FROM public.kho_danh_sach_hang_hoa h
    WHERE h.id_danh_muc = d.id AND lower(trim(h.ten_hang_hoa)) = lower(trim('Băng gạc y tế'))
  );

INSERT INTO public.kho_danh_sach_hang_hoa (id_danh_muc, ten_hang_hoa, don_vi_tinh, mo_ta, quy_cach, thu_tu, trang_thai)
SELECT d.id, 'Khẩu trang y tế', 'cái', NULL, '50 cái/hộp', 3, 'Đang hoạt động'
FROM public.kho_danh_muc_hang_hoa d
WHERE lower(trim(d.ten_danh_muc)) = lower(trim('Y tế'))
  AND NOT EXISTS (
    SELECT 1 FROM public.kho_danh_sach_hang_hoa h
    WHERE h.id_danh_muc = d.id AND lower(trim(h.ten_hang_hoa)) = lower(trim('Khẩu trang y tế'))
  );

INSERT INTO public.kho_danh_sach_hang_hoa (id_danh_muc, ten_hang_hoa, don_vi_tinh, mo_ta, quy_cach, thu_tu, trang_thai)
SELECT d.id, 'Xà phòng', 'thỏi', NULL, NULL, 1, 'Đang hoạt động'
FROM public.kho_danh_muc_hang_hoa d
WHERE lower(trim(d.ten_danh_muc)) = lower(trim('Nhu yếu & sinh hoạt'))
  AND NOT EXISTS (
    SELECT 1 FROM public.kho_danh_sach_hang_hoa h
    WHERE h.id_danh_muc = d.id AND lower(trim(h.ten_hang_hoa)) = lower(trim('Xà phòng'))
  );

INSERT INTO public.kho_danh_sach_hang_hoa (id_danh_muc, ten_hang_hoa, don_vi_tinh, mo_ta, quy_cach, thu_tu, trang_thai)
SELECT d.id, 'Kem đánh răng', 'tuýp', NULL, NULL, 2, 'Đang hoạt động'
FROM public.kho_danh_muc_hang_hoa d
WHERE lower(trim(d.ten_danh_muc)) = lower(trim('Nhu yếu & sinh hoạt'))
  AND NOT EXISTS (
    SELECT 1 FROM public.kho_danh_sach_hang_hoa h
    WHERE h.id_danh_muc = d.id AND lower(trim(h.ten_hang_hoa)) = lower(trim('Kem đánh răng'))
  );

INSERT INTO public.kho_danh_sach_hang_hoa (id_danh_muc, ten_hang_hoa, don_vi_tinh, mo_ta, quy_cach, thu_tu, trang_thai)
SELECT d.id, 'Áo ấm', 'bộ', 'Nhiều size', NULL, 1, 'Đang hoạt động'
FROM public.kho_danh_muc_hang_hoa d
WHERE lower(trim(d.ten_danh_muc)) = lower(trim('Quần áo'))
  AND NOT EXISTS (
    SELECT 1 FROM public.kho_danh_sach_hang_hoa h
    WHERE h.id_danh_muc = d.id AND lower(trim(h.ten_hang_hoa)) = lower(trim('Áo ấm'))
  );

INSERT INTO public.kho_danh_sach_hang_hoa (id_danh_muc, ten_hang_hoa, don_vi_tinh, mo_ta, quy_cach, thu_tu, trang_thai)
SELECT d.id, 'Chăn dạng gấp', 'chiếc', NULL, NULL, 2, 'Đang hoạt động'
FROM public.kho_danh_muc_hang_hoa d
WHERE lower(trim(d.ten_danh_muc)) = lower(trim('Quần áo'))
  AND NOT EXISTS (
    SELECT 1 FROM public.kho_danh_sach_hang_hoa h
    WHERE h.id_danh_muc = d.id AND lower(trim(h.ten_hang_hoa)) = lower(trim('Chăn dạng gấp'))
  );

INSERT INTO public.kho_danh_sach_hang_hoa (id_danh_muc, ten_hang_hoa, don_vi_tinh, mo_ta, quy_cach, thu_tu, trang_thai)
SELECT d.id, 'Đèn pin cầm tay', 'chiếc', 'Pin lắp rời', NULL, 1, 'Đang hoạt động'
FROM public.kho_danh_muc_hang_hoa d
WHERE lower(trim(d.ten_danh_muc)) = lower(trim('Khác'))
  AND NOT EXISTS (
    SELECT 1 FROM public.kho_danh_sach_hang_hoa h
    WHERE h.id_danh_muc = d.id AND lower(trim(h.ten_hang_hoa)) = lower(trim('Đèn pin cầm tay'))
  );
