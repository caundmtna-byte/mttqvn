-- ============================================================================
-- Dữ liệu mẫu: bai_viet_thiet_lap_the_loai + bai_viet_thiet_lap_khac
--
-- Phụ thuộc: migration 20260506100000_bai_viet_thiet_lap.sql (hoặc tương đương)
--            + hàm public.set_tg_cap_nhat() đã tồn tại.
--
-- Cách chạy: Supabase → SQL Editor (hoặc psql), dán toàn bộ file và Execute.
--
-- Idempotent: mỗi INSERT bọc WHERE NOT EXISTS theo unique (lower(trim(tên))).
-- Đơn giá (don_gia) lưu kiểu NUMERIC — đơn vị VND (số nguyên, không dấu chấm).
-- ============================================================================

-- ----- Thể loại (theo bảng bạn cung cấp; ST = song song / viết tay tùy nghiệp vụ) -----
INSERT INTO public.bai_viet_thiet_lap_the_loai (ten_the_loai, mo_ta, don_gia)
SELECT 'Tin ST', 'Tin dạng song song / tin ST', 30000.00
WHERE NOT EXISTS (
  SELECT 1 FROM public.bai_viet_thiet_lap_the_loai t
  WHERE lower(trim(t.ten_the_loai)) = lower(trim('Tin ST'))
);

INSERT INTO public.bai_viet_thiet_lap_the_loai (ten_the_loai, mo_ta, don_gia)
SELECT 'Tin viết', NULL, 50000.00
WHERE NOT EXISTS (
  SELECT 1 FROM public.bai_viet_thiet_lap_the_loai t
  WHERE lower(trim(t.ten_the_loai)) = lower(trim('Tin viết'))
);

INSERT INTO public.bai_viet_thiet_lap_the_loai (ten_the_loai, mo_ta, don_gia)
SELECT 'Bài ST', 'Bài song song / bài ST', 30000.00
WHERE NOT EXISTS (
  SELECT 1 FROM public.bai_viet_thiet_lap_the_loai t
  WHERE lower(trim(t.ten_the_loai)) = lower(trim('Bài ST'))
);

INSERT INTO public.bai_viet_thiet_lap_the_loai (ten_the_loai, mo_ta, don_gia)
SELECT 'Bài viết', NULL, 150000.00
WHERE NOT EXISTS (
  SELECT 1 FROM public.bai_viet_thiet_lap_the_loai t
  WHERE lower(trim(t.ten_the_loai)) = lower(trim('Bài viết'))
);

INSERT INTO public.bai_viet_thiet_lap_the_loai (ten_the_loai, mo_ta, don_gia)
SELECT 'Bài tổng hợp', NULL, 50000.00
WHERE NOT EXISTS (
  SELECT 1 FROM public.bai_viet_thiet_lap_the_loai t
  WHERE lower(trim(t.ten_the_loai)) = lower(trim('Bài tổng hợp'))
);

INSERT INTO public.bai_viet_thiet_lap_the_loai (ten_the_loai, mo_ta, don_gia)
SELECT 'Video SX', 'Video sản xuất / quay dựng', 1000000.00
WHERE NOT EXISTS (
  SELECT 1 FROM public.bai_viet_thiet_lap_the_loai t
  WHERE lower(trim(t.ten_the_loai)) = lower(trim('Video SX'))
);

INSERT INTO public.bai_viet_thiet_lap_the_loai (ten_the_loai, mo_ta, don_gia)
SELECT 'Video ST', 'Video song song / dựng từ nguồn có sẵn', 150000.00
WHERE NOT EXISTS (
  SELECT 1 FROM public.bai_viet_thiet_lap_the_loai t
  WHERE lower(trim(t.ten_the_loai)) = lower(trim('Video ST'))
);

INSERT INTO public.bai_viet_thiet_lap_the_loai (ten_the_loai, mo_ta, don_gia)
SELECT 'Văn bản', 'Bản thảo văn bản thuần (không đồ họa)', 10000.00
WHERE NOT EXISTS (
  SELECT 1 FROM public.bai_viet_thiet_lap_the_loai t
  WHERE lower(trim(t.ten_the_loai)) = lower(trim('Văn bản'))
);

INSERT INTO public.bai_viet_thiet_lap_the_loai (ten_the_loai, mo_ta, don_gia)
SELECT 'Thiết kế họa', 'Ảnh bìa, infographic, slide', 300000.00
WHERE NOT EXISTS (
  SELECT 1 FROM public.bai_viet_thiet_lap_the_loai t
  WHERE lower(trim(t.ten_the_loai)) = lower(trim('Thiết kế họa'))
);

INSERT INTO public.bai_viet_thiet_lap_the_loai (ten_the_loai, mo_ta, don_gia)
SELECT 'Bài viết tổng hợp', 'Dài, nhiều nguồn / biên tập tổng hợp', 500000.00
WHERE NOT EXISTS (
  SELECT 1 FROM public.bai_viet_thiet_lap_the_loai t
  WHERE lower(trim(t.ten_the_loai)) = lower(trim('Bài viết tổng hợp'))
);

-- ----- Thiết lập khác — Trang đăng -----
INSERT INTO public.bai_viet_thiet_lap_khac (loai, ten, mo_ta, thu_tu)
SELECT
  'trang_dang',
  'Website chính thức',
  'Cổng thông tin điện tử đơn vị',
  1
WHERE NOT EXISTS (
  SELECT 1 FROM public.bai_viet_thiet_lap_khac k
  WHERE k.loai = 'trang_dang' AND lower(trim(k.ten)) = lower(trim('Website chính thức'))
);

INSERT INTO public.bai_viet_thiet_lap_khac (loai, ten, mo_ta, thu_tu)
SELECT
  'trang_dang',
  'Fanpage Facebook',
  'Trang cộng đồng / fanpage chính',
  2
WHERE NOT EXISTS (
  SELECT 1 FROM public.bai_viet_thiet_lap_khac k
  WHERE k.loai = 'trang_dang' AND lower(trim(k.ten)) = lower(trim('Fanpage Facebook'))
);

INSERT INTO public.bai_viet_thiet_lap_khac (loai, ten, mo_ta, thu_tu)
SELECT
  'trang_dang',
  'Kênh YouTube',
  'Video dài, livestream',
  3
WHERE NOT EXISTS (
  SELECT 1 FROM public.bai_viet_thiet_lap_khac k
  WHERE k.loai = 'trang_dang' AND lower(trim(k.ten)) = lower(trim('Kênh YouTube'))
);

INSERT INTO public.bai_viet_thiet_lap_khac (loai, ten, mo_ta, thu_tu)
SELECT
  'trang_dang',
  'Zalo Official Account',
  'OA — tin nhắn / bài đăng Zalo',
  4
WHERE NOT EXISTS (
  SELECT 1 FROM public.bai_viet_thiet_lap_khac k
  WHERE k.loai = 'trang_dang' AND lower(trim(k.ten)) = lower(trim('Zalo Official Account'))
);

INSERT INTO public.bai_viet_thiet_lap_khac (loai, ten, mo_ta, thu_tu)
SELECT
  'trang_dang',
  'Báo điện tử liên kết',
  'Đăng lại / syndication sang báo đối tác',
  5
WHERE NOT EXISTS (
  SELECT 1 FROM public.bai_viet_thiet_lap_khac k
  WHERE k.loai = 'trang_dang' AND lower(trim(k.ten)) = lower(trim('Báo điện tử liên kết'))
);

-- ----- Thiết lập khác — Nguồn đăng -----
INSERT INTO public.bai_viet_thiet_lap_khac (loai, ten, mo_ta, thu_tu)
SELECT
  'nguon_dang',
  'Ban Tuyên giáo',
  'Nội dung do ban chủ trì',
  1
WHERE NOT EXISTS (
  SELECT 1 FROM public.bai_viet_thiet_lap_khac k
  WHERE k.loai = 'nguon_dang' AND lower(trim(k.ten)) = lower(trim('Ban Tuyên giáo'))
);

INSERT INTO public.bai_viet_thiet_lap_khac (loai, ten, mo_ta, thu_tu)
SELECT
  'nguon_dang',
  'Văn phòng đơn vị',
  'Thư ký, hành chính — tin ngắn, thông báo',
  2
WHERE NOT EXISTS (
  SELECT 1 FROM public.bai_viet_thiet_lap_khac k
  WHERE k.loai = 'nguon_dang' AND lower(trim(k.ten)) = lower(trim('Văn phòng đơn vị'))
);

INSERT INTO public.bai_viet_thiet_lap_khac (loai, ten, mo_ta, thu_tu)
SELECT
  'nguon_dang',
  'Cộng tác viên (CTV)',
  'Bài từ CTV / tình nguyện viên',
  3
WHERE NOT EXISTS (
  SELECT 1 FROM public.bai_viet_thiet_lap_khac k
  WHERE k.loai = 'nguon_dang' AND lower(trim(k.ten)) = lower(trim('Cộng tác viên (CTV)'))
);

INSERT INTO public.bai_viet_thiet_lap_khac (loai, ten, mo_ta, thu_tu)
SELECT
  'nguon_dang',
  'Phóng viên báo chí',
  'Tác giả có thẻ nhà báo / cơ quan báo',
  4
WHERE NOT EXISTS (
  SELECT 1 FROM public.bai_viet_thiet_lap_khac k
  WHERE k.loai = 'nguon_dang' AND lower(trim(k.ten)) = lower(trim('Phóng viên báo chí'))
);

INSERT INTO public.bai_viet_thiet_lap_khac (loai, ten, mo_ta, thu_tu)
SELECT
  'nguon_dang',
  'Đơn vị truyền thông liên kết',
  'Đối tác agency / studio ngoài',
  5
WHERE NOT EXISTS (
  SELECT 1 FROM public.bai_viet_thiet_lap_khac k
  WHERE k.loai = 'nguon_dang' AND lower(trim(k.ten)) = lower(trim('Đơn vị truyền thông liên kết'))
);
