-- ============================================================================
-- Chuẩn bị DB trước khi chạy lại migration 20260610230000_mttq_uy_vien_uy_ban_can_bo
--
-- Lỗi thường gặp:
--   1) "violates foreign key ... mttq_diem_danh_uy_vien_uy_vien_id_fkey"
--      → phải xóa điểm danh trỏ tới ủy viên trước khi TRUNCATE/DELETE uy viên.
--   2) "còn N bản ghi chưa map được can_bo_id"
--      → tạo (hoặc sửa) dòng mttq_can_bo khớp ho_ten + ngay_sinh với ủy viên.
--
-- Chạy trong SQL Editor (Supabase) hoặc: psql -f repair_uy_vien_can_bo_before_migration.sql
-- Thứ tự: B0 → B1 → B2 (tuỳ chọn) → B3 → B4 → SELECT cuối → chạy lại migration (hoặc chạy tay các bước còn lại trong file migration).
--
-- Điều kiện B3–B4: vẫn còn ho_va_ten, ngay_sinh trên mttq_uy_vien_uy_ban (migration chưa DROP cột).
-- Nếu đã DROP cột, cần db reset hoặc khôi phục backup rồi migrate lại.
-- hoặc khôi phục backup rồi migrate lại.
--
-- Cần ít nhất 1 dòng trong public.mttq_can_bo để B3 copy FK (chạy seed_mttq_can_bo.sql trước).
--
-- CLI nếu migration bị đánh dấu applied sai:
--   supabase migration repair --status reverted 20260610230000
--   supabase db push
-- ============================================================================

-- B0 — Tạo cột can_bo_id nếu CHƯA có (lỗi 42703: column can_bo_id does not exist = migration chưa ADD cột)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mttq_uy_vien_uy_ban'
      AND column_name = 'can_bo_id'
  ) THEN
    ALTER TABLE public.mttq_uy_vien_uy_ban
      ADD COLUMN can_bo_id BIGINT
      REFERENCES public.mttq_can_bo (id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END $$;

-- B1 — Xóa điểm danh (bắt buộc nếu muốn xóa/truncate ủy viên hoặc seed lại từ đầu)
DELETE FROM public.mttq_diem_danh_uy_vien;

-- B2 — (Tuỳ chọn, môi trường dev) xóa hết ủy viên để chạy lại seed_mttq_uy_vien_uy_ban.sql
-- Bỏ comment 2 dòng dưới nếu bạn muốn làm sạch hoàn toàn bảng ủy viên:
-- DELETE FROM public.mttq_uy_vien_uy_ban;
-- hoặc: TRUNCATE public.mttq_uy_vien_uy_ban RESTART IDENTITY CASCADE;
--        (CASCADE chỉ có tác dụng nếu có FK từ bảng khác trỏ VÀO uy viên; hiện tại điểm danh đã xóa ở B1.)

-- B3 — Tạo cán bộ “khớp” từng dòng ủy viên còn thiếu can_bo_id (dùng 1 dòng can_bo mẫu làm mẫu FK)
-- Chỉ chạy khi cột ho_va_ten, ngay_sinh VẪN CÒN trên mttq_uy_vien_uy_ban (migration chưa DROP cột).
INSERT INTO public.mttq_can_bo (
  to_chuc_id,
  ho_ten,
  ngay_sinh,
  gioi_tinh,
  dan_toc_id,
  ton_giao,
  dia_chi,
  dang_vien,
  trinh_do_id,
  ly_luan_chinh_tri_id,
  dien_thoai,
  chuc_vu_id,
  phong_ban_id,
  don_vi_id,
  ngay_tham_gia_to_chuc,
  trang_thai_id,
  ngay_nhap_trang_thai,
  id_nguoi_tao
)
SELECT
  tpl.to_chuc_id,
  u.ho_va_ten,
  u.ngay_sinh,
  COALESCE(NULLIF(trim(u.gioi_tinh), ''), 'Nam'),
  tpl.dan_toc_id,
  COALESCE(NULLIF(trim(u.ton_giao), ''), 'Không'),
  COALESCE(NULLIF(trim(tpl.dia_chi), ''), '—'),
  COALESCE(u.dang_vien, false),
  tpl.trinh_do_id,
  tpl.ly_luan_chinh_tri_id,
  COALESCE(NULLIF(trim(u.so_dien_thoai), ''), '0000000000'),
  tpl.chuc_vu_id,
  tpl.phong_ban_id,
  tpl.don_vi_id,
  tpl.ngay_tham_gia_to_chuc,
  tpl.trang_thai_id,
  tpl.ngay_nhap_trang_thai,
  tpl.id_nguoi_tao
FROM public.mttq_uy_vien_uy_ban u
CROSS JOIN LATERAL (
  SELECT c.*
  FROM public.mttq_can_bo c
  ORDER BY c.id
  LIMIT 1
) AS tpl
WHERE EXISTS (SELECT 1 FROM public.mttq_can_bo LIMIT 1)
  AND NOT EXISTS (
  SELECT 1
  FROM public.mttq_can_bo c2
  WHERE lower(trim(c2.ho_ten)) = lower(trim(u.ho_va_ten))
    AND c2.ngay_sinh IS NOT DISTINCT FROM u.ngay_sinh
);

-- B4 — Gán can_bo_id cho ủy viên (nếu migration đã ADD cột nhưng chưa NOT NULL / chưa DROP)
UPDATE public.mttq_uy_vien_uy_ban u
SET can_bo_id = c.id
FROM public.mttq_can_bo c
WHERE u.can_bo_id IS NULL
  AND lower(trim(u.ho_va_ten)) = lower(trim(c.ho_ten))
  AND u.ngay_sinh IS NOT DISTINCT FROM c.ngay_sinh;

-- Kiểm tra: phải 0 dòng NULL trước khi chạy tiếp migration (NOT NULL + DROP cột)
SELECT id, ho_va_ten, ngay_sinh, can_bo_id
FROM public.mttq_uy_vien_uy_ban
WHERE can_bo_id IS NULL;
