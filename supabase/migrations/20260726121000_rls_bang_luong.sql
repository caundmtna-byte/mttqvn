-- ============================================================================
-- RLS đợt 2 — chặn GHI vào nhóm bảng lương
--
-- `mttq_tang_luong` (nâng bậc lương của cán bộ) và hai bảng thiết lập ngạch/bậc
-- là dữ liệu nhạy cảm nhất về tiền trong hệ thống. Trước bản này cả ba đều có
-- policy `FOR ALL ... USING (true) WITH CHECK (true)` cho mọi tài khoản đã đăng
-- nhập ⇒ bất kỳ ai cũng sửa được bậc lương của bất kỳ ai qua REST API.
--
-- Luật áp dụng đúng bằng ma trận quyền mà giao diện đang dùng (`var_phan_quyen`),
-- nên KHÔNG có người dùng hợp lệ nào bị chặn thêm:
--   · `danh-sach-tang-luong` — hiện có 17 cán bộ được cấp them/sua/xoa;
--   · `thiet-lap-luong` — hiện chưa cấp cho ai, tức là chỉ quản trị, đúng như
--     giao diện đang thể hiện (nút thêm/sửa bị ẩn với mọi người khác).
--
-- Quyền ĐỌC giữ nguyên (mở) — phạm vi xem theo đơn vị là việc của đợt sau.
-- ============================================================================

-- --------------------------------------------------------- mttq_tang_luong
DROP POLICY IF EXISTS mttq_tang_luong_modify ON public.mttq_tang_luong;
DROP POLICY IF EXISTS mttq_tang_luong_them ON public.mttq_tang_luong;
DROP POLICY IF EXISTS mttq_tang_luong_sua ON public.mttq_tang_luong;
DROP POLICY IF EXISTS mttq_tang_luong_xoa ON public.mttq_tang_luong;

CREATE POLICY mttq_tang_luong_them ON public.mttq_tang_luong
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_co_quyen('danh-sach-tang-luong', 'them'));

CREATE POLICY mttq_tang_luong_sua ON public.mttq_tang_luong
  FOR UPDATE TO authenticated
  USING (public.fn_co_quyen('danh-sach-tang-luong', 'sua'))
  WITH CHECK (public.fn_co_quyen('danh-sach-tang-luong', 'sua'));

CREATE POLICY mttq_tang_luong_xoa ON public.mttq_tang_luong
  FOR DELETE TO authenticated
  USING (public.fn_co_quyen('danh-sach-tang-luong', 'xoa'));

-- ------------------------------------------- luong_thiet_lap_ngach_luong
DROP POLICY IF EXISTS luong_thiet_lap_ngach_luong_modify ON public.luong_thiet_lap_ngach_luong;
DROP POLICY IF EXISTS luong_thiet_lap_ngach_luong_ghi ON public.luong_thiet_lap_ngach_luong;

CREATE POLICY luong_thiet_lap_ngach_luong_ghi ON public.luong_thiet_lap_ngach_luong
  FOR ALL TO authenticated
  USING (public.fn_co_quyen('thiet-lap-luong', 'sua'))
  WITH CHECK (public.fn_co_quyen('thiet-lap-luong', 'sua'));

-- --------------------------------------------- luong_thiet_lap_bac_luong
DROP POLICY IF EXISTS luong_thiet_lap_bac_luong_modify ON public.luong_thiet_lap_bac_luong;
DROP POLICY IF EXISTS luong_thiet_lap_bac_luong_ghi ON public.luong_thiet_lap_bac_luong;

CREATE POLICY luong_thiet_lap_bac_luong_ghi ON public.luong_thiet_lap_bac_luong
  FOR ALL TO authenticated
  USING (public.fn_co_quyen('thiet-lap-luong', 'sua'))
  WITH CHECK (public.fn_co_quyen('thiet-lap-luong', 'sua'));

NOTIFY pgrst, 'reload schema';
