-- ============================================================================
-- Chương trình hỗ trợ — dữ liệu 4 phiếu khảo sát in từ hệ thống:
--   1. Hộ bị thiệt hại do thiên tai, sự cố   (Cứu trợ, Nhà bị sập, Hoả hoạn)
--   2. Hộ có thành viên ốm đau / qua đời      (Chữa bệnh, Người chết)
--   3. Hộ đề nghị hỗ trợ mô hình sinh kế      (Mô hình sinh kế)
--   4. Học sinh có hoàn cảnh khó khăn         (Học sinh nghèo)
--
-- Thông tin CON NGƯỜI của chủ hộ (CCCD, năm sinh, nhân khẩu…) vẫn đọc từ
-- `hngh_thong_tin_ho_ngheo` qua `ho_ngheo_id` — không chép sang đây.
--
-- Mỗi lĩnh vực một bộ trường khác nhau (~45 trường, mỗi dòng chỉ dùng một bộ)
-- ⇒ một cột JSONB thay vì ~40 cột gần như luôn NULL. Cấu trúc và danh mục ô
-- tick được kiểm ở client (`vi-nguoi-ngheo/core/schema.ts`):
--   { "chung": {...}, "thien_tai" | "benh_tat" | "sinh_ke" | "hoc_sinh": {...} }
-- Lĩnh vực không có phiếu (Tết vì người nghèo) ⇒ NULL.
--
-- RPC `get_vnn_page` CỐ Ý không trả cột này (egress) — chi tiết / sửa / in đọc
-- bằng select đầy đủ.
-- ============================================================================

ALTER TABLE public.vnn_chuong_trinh
  ADD COLUMN IF NOT EXISTS phieu_khao_sat JSONB;

ALTER TABLE public.vnn_chuong_trinh
  DROP CONSTRAINT IF EXISTS vnn_phieu_khao_sat_chk;

ALTER TABLE public.vnn_chuong_trinh
  ADD CONSTRAINT vnn_phieu_khao_sat_chk
    CHECK (phieu_khao_sat IS NULL OR jsonb_typeof(phieu_khao_sat) = 'object');

COMMENT ON COLUMN public.vnn_chuong_trinh.phieu_khao_sat IS
  'Dữ liệu phiếu khảo sát in: {chung, thien_tai|benh_tat|sinh_ke|hoc_sinh}. NULL khi lĩnh vực không có phiếu.';

NOTIFY pgrst, 'reload schema';
