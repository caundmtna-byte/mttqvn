-- ============================================================================
-- RLS đợt 1 — chặn GHI vào ba bảng định danh & phân quyền
--
-- Hiện trạng trước bản này: **81/81 policy đều là `USING (true)`**, và 40 trong
-- số đó là `FOR ALL ... WITH CHECK (true)`. Nghĩa là bất kỳ tài khoản nào đã
-- đăng nhập cũng **ghi được** vào mọi bảng qua REST API, bỏ qua toàn bộ giao
-- diện. Cụ thể, chỉ cần mở DevTools là có thể:
--   · tự cấp cho chức vụ của mình mọi quyền trong `var_phan_quyen`;
--   · đặt `var_chuc_vu.cap_bac = 1` cho chính mình (cấp bậc 1 = bỏ qua mọi
--     kiểm tra quyền trong ứng dụng);
--   · sửa `var_nhan_vien.ten_tai_khoan` / `don_vi_id` của người khác.
-- Ba đường đó cộng lại là chiếm quyền toàn hệ thống.
--
-- Bản này KHÔNG đụng tới quyền ĐỌC (`SELECT` vẫn mở như cũ) nên không màn hình
-- nào đổi hành vi; chỉ siết quyền GHI đúng bằng luật mà giao diện đang áp dụng.
-- Phạm vi xem theo đơn vị để dành cho đợt RLS sau.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Hai hàm tra cứu quyền, dùng lại cho mọi policy về sau
-- ---------------------------------------------------------------------------

-- Quản trị hệ thống.
--
-- Giống hệt luật đang chạy ở Edge Function `admin-user` và ở `legacyCan` phía
-- client: cấp bậc 1, hoặc được cấp quyền `quan_tri`/`all`/`admin`. Trong dữ
-- liệu thật hiện chưa có giá trị quyền `quan_tri` nào — nhánh đó để sẵn cho
-- sau này, còn thực tế hôm nay là "cấp bậc 1".
--
-- SECURITY DEFINER là bắt buộc: hàm đọc `var_nhan_vien`, mà policy của chính
-- bảng đó lại gọi hàm này — không bỏ qua RLS thì thành đệ quy vô tận.
CREATE OR REPLACE FUNCTION public.fn_la_quan_tri()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.var_nhan_vien nv
    LEFT JOIN public.var_chuc_vu cv ON cv.id = nv.id_chuc_vu
    WHERE nv.auth_user_id = auth.uid()
      AND nv.trang_thai = 'Hoạt động'
      AND (
        cv.cap_bac = 1
        OR EXISTS (
          SELECT 1 FROM public.var_phan_quyen pq
          WHERE pq.chuc_vu_id = nv.id_chuc_vu
            AND pq.quyen ~* '(^|,)\s*(quan_tri|all|admin)\s*(,|$)'
        )
      )
  );
$$;

COMMENT ON FUNCTION public.fn_la_quan_tri() IS
  'Người đang đăng nhập có phải quản trị hệ thống không (cấp bậc 1 hoặc quyền quan_tri/all/admin).';

-- Kiểm quyền theo ma trận `var_phan_quyen` — đúng thứ mà giao diện đang dùng.
-- `p_hanh_dong` là một trong: 'xem', 'them', 'sua', 'xoa' (giá trị thật trong
-- cột `quyen`, lưu dạng chuỗi ngăn cách bởi dấu phẩy).
CREATE OR REPLACE FUNCTION public.fn_co_quyen(p_module_key text, p_hanh_dong text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT public.fn_la_quan_tri() OR EXISTS (
    SELECT 1
    FROM public.var_nhan_vien nv
    JOIN public.var_phan_quyen pq ON pq.chuc_vu_id = nv.id_chuc_vu
    WHERE nv.auth_user_id = auth.uid()
      AND nv.trang_thai = 'Hoạt động'
      AND pq.module_key = p_module_key
      AND pq.quyen ~* ('(^|,)\s*' || p_hanh_dong || '\s*(,|$)')
  );
$$;

COMMENT ON FUNCTION public.fn_co_quyen(text, text) IS
  'Người đang đăng nhập có quyền <hanh_dong> trên <module_key> không, theo ma trận var_phan_quyen.';

GRANT EXECUTE ON FUNCTION public.fn_la_quan_tri() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_co_quyen(text, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- var_phan_quyen — ma trận quyền. Sửa ở đây là đổi ai xem được gì.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS var_phan_quyen_modify ON public.var_phan_quyen;
DROP POLICY IF EXISTS var_phan_quyen_ghi ON public.var_phan_quyen;
CREATE POLICY var_phan_quyen_ghi ON public.var_phan_quyen
  FOR ALL TO authenticated
  USING (public.fn_la_quan_tri())
  WITH CHECK (public.fn_la_quan_tri());
-- Policy SELECT cũ giữ nguyên: mọi người vẫn đọc được để dựng ma trận quyền.

-- ---------------------------------------------------------------------------
-- var_chuc_vu — `cap_bac = 1` là cửa bỏ qua mọi kiểm tra quyền.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS var_chuc_vu_modify ON public.var_chuc_vu;
DROP POLICY IF EXISTS var_chuc_vu_ghi ON public.var_chuc_vu;
CREATE POLICY var_chuc_vu_ghi ON public.var_chuc_vu
  FOR ALL TO authenticated
  USING (public.fn_la_quan_tri())
  WITH CHECK (public.fn_la_quan_tri());

-- ---------------------------------------------------------------------------
-- var_nhan_vien — hồ sơ cán bộ + tài khoản đăng nhập + đơn vị (đầu vào của
-- phạm vi xem).
--
-- Người dùng thường VẪN phải sửa được hồ sơ của CHÍNH MÌNH (trang Hồ sơ cá
-- nhân: đổi ảnh đại diện, số điện thoại…), nên tách riêng: thêm/xoá chỉ quản
-- trị, sửa thì quản trị hoặc chính chủ.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS var_nhan_vien_modify ON public.var_nhan_vien;
DROP POLICY IF EXISTS var_nhan_vien_them ON public.var_nhan_vien;
DROP POLICY IF EXISTS var_nhan_vien_sua ON public.var_nhan_vien;
DROP POLICY IF EXISTS var_nhan_vien_xoa ON public.var_nhan_vien;

CREATE POLICY var_nhan_vien_them ON public.var_nhan_vien
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_la_quan_tri());

CREATE POLICY var_nhan_vien_sua ON public.var_nhan_vien
  FOR UPDATE TO authenticated
  USING (public.fn_la_quan_tri() OR auth_user_id = auth.uid())
  WITH CHECK (public.fn_la_quan_tri() OR auth_user_id = auth.uid());

CREATE POLICY var_nhan_vien_xoa ON public.var_nhan_vien
  FOR DELETE TO authenticated
  USING (public.fn_la_quan_tri());

NOTIFY pgrst, 'reload schema';
