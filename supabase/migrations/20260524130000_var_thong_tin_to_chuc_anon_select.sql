-- Cho phép đọc thông tin thương hiệu (logo, tên app) trước đăng nhập — favicon/PWA/trang đăng nhập.
DROP POLICY IF EXISTS var_thong_tin_to_chuc_select ON public.var_thong_tin_to_chuc;
CREATE POLICY var_thong_tin_to_chuc_select ON public.var_thong_tin_to_chuc
  FOR SELECT TO anon, authenticated USING (true);
