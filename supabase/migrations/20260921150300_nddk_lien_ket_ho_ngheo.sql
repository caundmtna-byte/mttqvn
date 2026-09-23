-- Nối Nhà đại đoàn kết với Thông tin hộ nghèo.
--
-- Nhóm cột "Nhà đại đoàn kết" trong mẫu nhập liệu hộ nghèo (Nội dung · Năm ·
-- Loại hình · Số tiền · Trạng thái) trùng gần như hệt bảng nddk đã chạy. Thay
-- vì chép 5 cột đó sang bảng hộ — hai nơi nhập tay, sửa một bên quên bên kia là
-- báo cáo lệch — thêm một khoá ngoại để màn hộ nghèo ĐỌC thẳng hồ sơ nhà.
--
-- Nullable: 25 hồ sơ nhà đang có chưa gắn hộ nào, và nhiều căn sẽ mãi không
-- gắn (chủ hộ không nằm trong danh sách hộ nghèo).
-- ON DELETE SET NULL: xoá một hộ chỉ GỠ liên kết, tuyệt đối không kéo theo hồ
-- sơ nhà — đó là dữ liệu của module khác, có tiền và có vết phê duyệt riêng.

ALTER TABLE public.nddk_nha_dai_doan_ket
  ADD COLUMN IF NOT EXISTS ho_ngheo_id BIGINT;

ALTER TABLE public.nddk_nha_dai_doan_ket
  DROP CONSTRAINT IF EXISTS nddk_nha_dai_doan_ket_ho_ngheo_id_fkey;
ALTER TABLE public.nddk_nha_dai_doan_ket
  ADD CONSTRAINT nddk_nha_dai_doan_ket_ho_ngheo_id_fkey
    FOREIGN KEY (ho_ngheo_id) REFERENCES public.hngh_thong_tin_ho_ngheo (id)
    ON UPDATE CASCADE ON DELETE SET NULL;

-- Postgres không tự đánh index cho khoá ngoại; thiếu nó thì mỗi lần xoá một hộ
-- phải quét toàn bộ bảng nhà để thực thi SET NULL.
CREATE INDEX IF NOT EXISTS idx_nddk_ho_ngheo
  ON public.nddk_nha_dai_doan_ket (ho_ngheo_id);

COMMENT ON COLUMN public.nddk_nha_dai_doan_ket.ho_ngheo_id IS
  'Hộ nghèo được hỗ trợ căn nhà này (tuỳ chọn) — FK hngh_thong_tin_ho_ngheo.';

NOTIFY pgrst, 'reload schema';
