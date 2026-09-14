-- Sửa cảnh báo "Security Definer View" của Supabase linter cho public.quy_so_du_view.
-- PG15+ mặc định view chạy với quyền của người tạo (security_invoker = false):
-- RLS của bảng nền bị áp theo owner chứ không theo người đang truy vấn.
-- Bật security_invoker = true để RLS + GRANT áp đúng cho vai gọi (authenticated).
-- An toàn: quy_danh_muc_tai_khoan và quy_so_thu_chi đều đã ENABLE RLS, có policy
-- SELECT ... USING (true) cho authenticated và đã GRANT SELECT, nên view vẫn đọc đủ dữ liệu.

ALTER VIEW public.quy_so_du_view SET (security_invoker = true);
