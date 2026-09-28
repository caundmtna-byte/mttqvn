-- ============================================================================
-- Thông tin hộ nghèo — số căn cước phải đúng 12 chữ số.
--
-- "Không trùng hộ khác" đã có từ trước: unique `uq_hngh_so_cccd` + trigger
-- `fn_hngh_chuan_hoa()` bóc mọi khoảng trắng (20260921150600). Thiếu định dạng
-- thì "abc" hay 9 số vẫn lưu được và unique không bảo vệ được gì.
--
-- Trigger chuẩn hoá chạy BEFORE ⇒ CHECK so trên giá trị đã bóc khoảng trắng,
-- nên "040 012 345 678" vẫn hợp lệ. Cột vẫn để trống được (hộ chưa có giấy tờ).
--
-- NOT VALID: dòng cũ sai định dạng (nếu có) không làm hỏng migration; mọi lần
-- thêm/sửa từ nay đều bị kiểm, nên dòng sai sẽ bị buộc sửa ở lần lưu kế tiếp.
-- Rà trước:
--   SELECT id, ho_ten_dai_dien, so_cccd FROM public.hngh_thong_tin_ho_ngheo
--   WHERE so_cccd IS NOT NULL AND so_cccd !~ '^[0-9]{12}$';
-- Không còn dòng nào thì chạy:
--   ALTER TABLE public.hngh_thong_tin_ho_ngheo VALIDATE CONSTRAINT hngh_so_cccd_chk;
--
-- Client giữ bản sao ở `features/nha-dai-doan-ket/thong-tin-ho-ngheo/utils/so-cccd.ts`
-- (`SO_CCCD_REGEX`). Sửa một bên phải sửa cả bên kia.
-- ============================================================================

ALTER TABLE public.hngh_thong_tin_ho_ngheo
  DROP CONSTRAINT IF EXISTS hngh_so_cccd_chk;
ALTER TABLE public.hngh_thong_tin_ho_ngheo
  ADD CONSTRAINT hngh_so_cccd_chk
  CHECK (so_cccd IS NULL OR so_cccd ~ '^[0-9]{12}$') NOT VALID;

COMMENT ON CONSTRAINT hngh_so_cccd_chk ON public.hngh_thong_tin_ho_ngheo IS
  'Số căn cước: để trống hoặc đúng 12 chữ số (sau khi trigger bóc khoảng trắng).';

NOTIFY pgrst, 'reload schema';
