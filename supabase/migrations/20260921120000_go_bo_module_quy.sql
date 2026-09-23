-- Gỡ bỏ hoàn toàn hai module quỹ tiền: Quỹ vì người nghèo và Quỹ cứu trợ.
--
-- Hai quỹ dùng CHUNG một bộ ba bảng, phân biệt bằng cột `quy`
-- ('vi_nguoi_ngheo' | 'cuu_tro'), nên gỡ là gỡ cả cụm — không có nửa vời.
--
-- ⚠️ MIGRATION NÀY XOÁ DỮ LIỆU TIỀN, KHÔNG HOÀN TÁC ĐƯỢC.
-- Thời điểm chạy, DB production có: 2 phiếu thu (PT-2026-0001 cứu trợ
-- 500.000.000đ · PT-2026-0002 vì người nghèo 15.000.000đ), 2 tài khoản,
-- 3 khoản mục, 19 dòng `audit_log`. Đã sao lưu trước khi chạy:
-- ~/Desktop/mttqvn-db-backups/mttqvn-20260921-221048.sql
--
-- Ba file migration cũ (20260729100000, 20260729101000, 20260914100000) GIỮ
-- NGUYÊN — chúng là lịch sử đã chạy, không sửa lại quá khứ.
--
-- Trigger, index, policy và sequence identity của ba bảng tự rơi theo DROP TABLE.
-- Hai sequence số chứng từ là sequence độc lập nên phải gọi tên riêng.

-- ---------------------------------------------------------------------------
-- 1. View và RPC đọc bảng quỹ — bỏ trước để DROP TABLE không vướng
-- ---------------------------------------------------------------------------

DROP VIEW IF EXISTS public.quy_so_du_view;

DROP FUNCTION IF EXISTS public.get_quy_so_thu_chi_page(
  text, text, integer, integer, text, text, bigint[], bigint[], date, date, jsonb
);

-- ---------------------------------------------------------------------------
-- 2. Ba bảng nghiệp vụ
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS public.quy_so_thu_chi CASCADE;
DROP TABLE IF EXISTS public.quy_danh_muc_khoan CASCADE;
DROP TABLE IF EXISTS public.quy_danh_muc_tai_khoan CASCADE;

-- Sequence sinh số phiếu thu / phiếu chi: tạo bằng CREATE SEQUENCE độc lập,
-- không thuộc sở hữu cột nào nên DROP TABLE không đụng tới.
DROP SEQUENCE IF EXISTS public.quy_so_thu_chi_pt_seq;
DROP SEQUENCE IF EXISTS public.quy_so_thu_chi_pc_seq;

-- ---------------------------------------------------------------------------
-- 3. Hàm riêng của quỹ
--
-- CHỈ những hàm mang tiền tố `fn_quy_`. Các hàm dùng chung mà tên có chữ
-- "quyen" (`fn_co_quyen`, `fn_la_quan_tri`, `fn_gan_id_nguoi_tao`,
-- `fn_ghi_nhat_ky`) là của toàn hệ thống — TUYỆT ĐỐI không đụng.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.fn_quy_sinh_so_chung_tu();
DROP FUNCTION IF EXISTS public.fn_quy_chan_doi_so_chung_tu();
DROP FUNCTION IF EXISTS public.fn_quy_kiem_cung_quy();
DROP FUNCTION IF EXISTS public.fn_quy_set_tg_cap_nhat();

-- ---------------------------------------------------------------------------
-- 4. Dọn dữ liệu còn sót ở các bảng dùng chung
--
-- Bốn `module_key` dưới đây đã đối chiếu với `permission-modules-config.ts`:
-- chỉ bốn màn hình quỹ dùng, không module nào khác trùng segment cuối.
-- ---------------------------------------------------------------------------

DELETE FROM public.var_phan_quyen
WHERE module_key IN ('so-thu-chi', 'danh-muc-chi-phi', 'danh-muc-tai-khoan', 'bao-cao-thong-ke');

DELETE FROM public.audit_log
WHERE bang IN ('quy_so_thu_chi', 'quy_danh_muc_khoan', 'quy_danh_muc_tai_khoan');

NOTIFY pgrst, 'reload schema';
