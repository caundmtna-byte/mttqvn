-- Nhóm "Nghĩa tình dòng Lam" (/an-sinh-xa-hoi): mục "Thông tin hệ thống" ở màn chi
-- tiết phải hiện đủ 4 trường — Người tạo · Thời gian tạo · Người cập nhật · Thời gian
-- cập nhật. Trước migration này chỉ nddk_nha_dai_doan_ket lưu người cập nhật, còn 5
-- bảng danh mục kho không lưu cả người tạo.
--
-- Cả hai cột do MÁY CHỦ gán bằng trigger (nhận diện qua fn_nhan_vien_id_hien_tai(),
-- tức ten_tai_khoan) — form không gửi, nên không thể giả mạo.
--
-- Dữ liệu cũ: id_nguoi_cap_nhat lấy bằng id_nguoi_tao nếu bảng có cột đó; 5 bảng danh
-- mục kho để NULL (không biết ai tạo) — giao diện hiện "—".

BEGIN;

-- 1. Hàm dùng chung (thay cho bản riêng của nddk) ------------------------------
CREATE FUNCTION public.fn_gan_nguoi_cap_nhat() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'auth'
    AS $$
BEGIN
  -- Không nhận diện được (service role, job nền) ⇒ giữ người cũ / người tạo.
  NEW.id_nguoi_cap_nhat := COALESCE(
    public.fn_nhan_vien_id_hien_tai(),
    CASE WHEN TG_OP = 'INSERT' THEN NEW.id_nguoi_tao ELSE OLD.id_nguoi_cap_nhat END
  );
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_gan_nguoi_cap_nhat() IS
  'BEFORE INSERT OR UPDATE: gán id_nguoi_cap_nhat = nhân viên đang đăng nhập. Bảng gắn trigger này phải có cả id_nguoi_tao.';

-- nddk: chuyển sang hàm chung, bỏ hàm riêng.
DROP TRIGGER trg_nddk_nguoi_cap_nhat ON public.nddk_nha_dai_doan_ket;
DROP FUNCTION public.fn_nddk_gan_nguoi_cap_nhat();
CREATE TRIGGER tg_gan_nguoi_cap_nhat_nddk_nha_dai_doan_ket
  BEFORE INSERT OR UPDATE ON public.nddk_nha_dai_doan_ket
  FOR EACH ROW EXECUTE FUNCTION public.fn_gan_nguoi_cap_nhat();
-- nddk trước đây để client tự gửi id_nguoi_tao — nay máy chủ ghi đè như mọi bảng khác.
CREATE TRIGGER tg_gan_id_nguoi_tao_nddk_nha_dai_doan_ket
  BEFORE INSERT ON public.nddk_nha_dai_doan_ket
  FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao();

-- 2. Người tạo cho 5 bảng danh mục kho -----------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'kho_dot_cuu_tro', 'kho_danh_muc_hang_hoa', 'kho_danh_sach_hang_hoa',
    'kho_danh_sach_kho', 'kho_don_vi_cuu_tro'
  ] LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN id_nguoi_tao bigint
         REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE SET NULL', t);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.fn_gan_id_nguoi_tao()',
      'tg_gan_id_nguoi_tao_' || t, t);
  END LOOP;
END $$;

-- 3. Người cập nhật cho 9 bảng --------------------------------------------------
-- Tên trigger 'tg_gan_nguoi_cap_nhat_*' xếp SAU 'tg_gan_id_nguoi_tao_*' theo thứ tự
-- chữ cái, nên lúc INSERT id_nguoi_tao đã được gán khi COALESCE đọc tới.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'kho_dot_cuu_tro', 'kho_danh_muc_hang_hoa', 'kho_danh_sach_hang_hoa',
    'kho_danh_sach_kho', 'kho_don_vi_cuu_tro', 'kho_nhap_xuat_kho',
    'vnn_chuong_trinh', 'hngh_thong_tin_ho_ngheo', 'ktnt_khen_thuong_nha_tai_tro'
  ] LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN id_nguoi_cap_nhat bigint
         REFERENCES public.var_nhan_vien(id) ON UPDATE CASCADE ON DELETE SET NULL', t);
    EXECUTE format(
      'COMMENT ON COLUMN public.%I.id_nguoi_cap_nhat IS %L', t,
      'Người thêm/sửa gần nhất — trigger fn_gan_nguoi_cap_nhat gán, form không có ô nhập.');
  END LOOP;
END $$;

-- Dữ liệu cũ: người cập nhật = người tạo. Tắt TẠM mọi trigger người dùng của bảng
-- (tg_cap_nhat, nhật ký, chuẩn hoá, kiểm tồn…) để KHÔNG đổi tg_cap_nhat và KHÔNG
-- ghi hàng nghìn dòng nhật ký giả. Ràng buộc FK là trigger nội bộ, vẫn chạy.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'kho_nhap_xuat_kho', 'vnn_chuong_trinh', 'hngh_thong_tin_ho_ngheo',
    'ktnt_khen_thuong_nha_tai_tro'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE TRIGGER USER', t);
    EXECUTE format(
      'UPDATE public.%I SET id_nguoi_cap_nhat = id_nguoi_tao
        WHERE id_nguoi_cap_nhat IS NULL AND id_nguoi_tao IS NOT NULL', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE TRIGGER USER', t);
  END LOOP;
END $$;

-- Trigger tạo SAU bước điền dữ liệu cũ.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'kho_dot_cuu_tro', 'kho_danh_muc_hang_hoa', 'kho_danh_sach_hang_hoa',
    'kho_danh_sach_kho', 'kho_don_vi_cuu_tro', 'kho_nhap_xuat_kho',
    'vnn_chuong_trinh', 'hngh_thong_tin_ho_ngheo', 'ktnt_khen_thuong_nha_tai_tro'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.fn_gan_nguoi_cap_nhat()',
      'tg_gan_nguoi_cap_nhat_' || t, t);
  END LOOP;
END $$;

COMMIT;
