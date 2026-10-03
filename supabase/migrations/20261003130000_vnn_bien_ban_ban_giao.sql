-- ============================================================================
-- Chương trình hỗ trợ — dữ liệu "Biên bản bàn giao tiền, hiện vật hỗ trợ".
--
-- Chỉ lưu phần biên bản cần mà khoản hỗ trợ / hộ nghèo / phiếu khảo sát CHƯA
-- có: ngày + địa điểm bàn giao, đại diện bên giao, hai người làm chứng, căn cứ
-- quyết định, danh sách hiện vật (tên, ĐVT, số lượng, đơn giá, ghi chú), mục
-- đích sử dụng, thời hạn duy trì mô hình / hạn hoàn thành nhà. Người nhận,
-- CCCD, số tiền, nguồn, lĩnh vực… đọc từ dòng và hộ nghèo được gắn khi in.
--
-- Cấu trúc kiểm ở client (`vi-nguoi-ngheo/core/bien-ban-ban-giao.ts`); DB chỉ
-- CHECK "là object". Chưa nhập gì ⇒ NULL.
--
-- RPC `get_vnn_page` CỐ Ý không trả cột này (egress).
-- ============================================================================

ALTER TABLE public.vnn_chuong_trinh
  ADD COLUMN IF NOT EXISTS bien_ban_ban_giao JSONB;

ALTER TABLE public.vnn_chuong_trinh
  DROP CONSTRAINT IF EXISTS vnn_bien_ban_ban_giao_chk;

ALTER TABLE public.vnn_chuong_trinh
  ADD CONSTRAINT vnn_bien_ban_ban_giao_chk
    CHECK (bien_ban_ban_giao IS NULL OR jsonb_typeof(bien_ban_ban_giao) = 'object');

COMMENT ON COLUMN public.vnn_chuong_trinh.bien_ban_ban_giao IS
  'Dữ liệu biên bản bàn giao in: ngày/địa điểm, bên giao, làm chứng, căn cứ, hiện vật[], mục đích. NULL khi chưa nhập.';

NOTIFY pgrst, 'reload schema';
