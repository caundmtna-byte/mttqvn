-- "Đợt cứu trợ" → "Chương trình vận động" (sheet "An sinh xã hội", tab
-- "Chương trình vận động"). Bảng và module_key giữ nguyên ('dot-cuu-tro') vì RLS
-- và FK của kho_nhap_xuat_kho đang trỏ vào; chỉ thêm cột nghiệp vụ.
--
--   Loại · Đơn vị chủ trì · Thời gian từ–đến · Tài khoản tiếp nhận · Ngân hàng ·
--   Trạng thái · Tiến độ · Văn bản phát động (= cột `link` có sẵn, đổi nhãn).
--
-- Đơn vị chủ trì dùng đúng cặp (loai, id) như kho_don_vi_cuu_tro.don_vi_gioi_thieu_*:
-- 'tinh' ⇒ id NULL; 'xa_phuong' ⇒ id là xã. Dòng cũ coi là của tỉnh.
-- Phạm vi xem (xã chỉ thấy chương trình của xã mình) đặt ở client — RLS đọc giữ
-- USING (true) vì phiếu XUẤT ở kho xã vẫn phải chọn được chương trình của tỉnh.

BEGIN;

ALTER TABLE public.kho_dot_cuu_tro
  ADD COLUMN loai text NOT NULL DEFAULT 'Cứu trợ',
  ADD COLUMN don_vi_chu_tri_loai text NOT NULL DEFAULT 'tinh',
  ADD COLUMN don_vi_chu_tri_id bigint
    REFERENCES public.var_ssn_xa_phuong(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD COLUMN tu_ngay date,
  ADD COLUMN den_ngay date,
  ADD COLUMN tai_khoan_tiep_nhan text,
  ADD COLUMN ngan_hang text,
  ADD COLUMN trang_thai text NOT NULL DEFAULT 'Đang triển khai',
  ADD COLUMN ngay_cap_nhat_trang_thai timestamp with time zone NOT NULL DEFAULT now(),
  ADD COLUMN tien_do text,
  ADD CONSTRAINT kho_dot_cuu_tro_loai_chk
    CHECK (loai = ANY (ARRAY['Nghĩa tình dòng Lam'::text, 'Cứu trợ'::text])),
  ADD CONSTRAINT kho_dot_cuu_tro_don_vi_chu_tri_chk CHECK (
    (don_vi_chu_tri_loai = 'tinh' AND don_vi_chu_tri_id IS NULL)
    OR (don_vi_chu_tri_loai = 'xa_phuong' AND don_vi_chu_tri_id IS NOT NULL)
  ),
  ADD CONSTRAINT kho_dot_cuu_tro_thoi_gian_chk
    CHECK (tu_ngay IS NULL OR den_ngay IS NULL OR den_ngay >= tu_ngay),
  ADD CONSTRAINT kho_dot_cuu_tro_trang_thai_chk
    CHECK (trang_thai = ANY (ARRAY['Đang triển khai'::text, 'Kết thúc'::text]));

CREATE INDEX idx_kho_dot_cuu_tro_don_vi_chu_tri ON public.kho_dot_cuu_tro (don_vi_chu_tri_id);

COMMENT ON COLUMN public.kho_dot_cuu_tro.link IS 'Văn bản phát động (URL).';
COMMENT ON COLUMN public.kho_dot_cuu_tro.tien_do IS 'Ghi chú tiến độ, nhập tay.';

-- Ngày cập nhật trạng thái: máy chủ gán (hàm dùng chung, cùng luật với vnn/nddk/hngh).
CREATE FUNCTION public.fn_gan_ngay_trang_thai() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.ngay_cap_nhat_trang_thai := now();
  ELSIF NEW.trang_thai IS DISTINCT FROM OLD.trang_thai THEN
    NEW.ngay_cap_nhat_trang_thai := now();
  ELSE
    NEW.ngay_cap_nhat_trang_thai := OLD.ngay_cap_nhat_trang_thai;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_gan_ngay_trang_thai() IS
  'BEFORE INSERT OR UPDATE: ngay_cap_nhat_trang_thai = now() khi thêm mới hoặc khi trang_thai đổi; không thì giữ giá trị cũ.';

CREATE TRIGGER trg_kho_dot_cuu_tro_ngay_trang_thai
  BEFORE INSERT OR UPDATE ON public.kho_dot_cuu_tro
  FOR EACH ROW EXECUTE FUNCTION public.fn_gan_ngay_trang_thai();

CREATE TRIGGER tg_lich_su_trang_thai_kho_dot_cuu_tro
  AFTER UPDATE OF trang_thai ON public.kho_dot_cuu_tro
  FOR EACH ROW EXECUTE FUNCTION public.fn_ghi_lich_su_trang_thai();

COMMIT;
