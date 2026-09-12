-- ============================================================================
-- Gán `id_nguoi_tao` phía máy chủ — không tin giá trị trình duyệt gửi lên
--
-- Toàn hệ thống có 17 bảng mang cột `id_nguoi_tao`, và đây là trường truy vết
-- DUY NHẤT đang có. Nhưng giá trị của nó do payload trình duyệt quyết định.
-- Cộng với RLS còn `USING (true)`, một người dùng sửa request là ghi được bản
-- ghi **mang tên người khác** — trường duy nhất để truy vết lại là trường không
-- tin được.
--
-- Trigger này ghi đè `id_nguoi_tao` bằng nhân viên tương ứng với `auth.uid()`
-- lúc INSERT.
--
-- Vì sao KHÔNG ép cứng mọi trường hợp: khi không có phiên đăng nhập (Edge
-- Function chạy bằng service_role, script quản trị, tiến trình nhập liệu hàng
-- loạt) thì `auth.uid()` là NULL — lúc đó giữ nguyên giá trị được truyền vào,
-- nếu không các luồng quản trị sẽ mất người tạo. Người dùng đã đăng nhập thì
-- không còn cách nào mạo danh.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_gan_id_nguoi_tao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_nv bigint;
BEGIN
  v_nv := public.fn_nhan_vien_id_hien_tai();
  IF v_nv IS NOT NULL THEN
    NEW.id_nguoi_tao := v_nv;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_gan_id_nguoi_tao() IS
  'Trigger BEFORE INSERT: ghi đè id_nguoi_tao bằng nhân viên của auth.uid(). '
  'Không có phiên đăng nhập (service_role, script) thì giữ nguyên giá trị truyền vào.';

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN pg_tables p ON p.schemaname = 'public' AND p.tablename = c.table_name
    WHERE c.table_schema = 'public' AND c.column_name = 'id_nguoi_tao'
    ORDER BY c.table_name
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS tg_gan_id_nguoi_tao_%I ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER tg_gan_id_nguoi_tao_%I BEFORE INSERT ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao()', t, t);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
