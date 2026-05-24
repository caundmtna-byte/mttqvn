-- ============================================================================
-- Seed mẫu: public.kho_don_vi_cuu_tro (đơn vị hỗ trợ — Chùa / Giáo xứ / Cơ quan / Đơn vị / Cá nhân)
-- ============================================================================
-- Điều kiện: đã chạy migration `20260611170000_kho_don_vi_cuu_tro.sql` (và các migration drop cột nếu có).
--
-- Cách chạy: Supabase SQL Editor (hoặc `psql`) — dán toàn bộ file.
--
-- Idempotent: chỉ chèn nếu chưa có dòng `ten` bắt đầu bằng `SEED-DVCT|`.
-- Xóa seed: `DELETE FROM public.kho_don_vi_cuu_tro WHERE ten LIKE 'SEED-DVCT|%';`
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.kho_don_vi_cuu_tro WHERE ten LIKE 'SEED-DVCT|%') THEN
    RAISE NOTICE 'seed_kho_don_vi_cuu_tro: đã có bản ghi seed (bỏ qua).';
    RETURN;
  END IF;

  INSERT INTO public.kho_don_vi_cuu_tro (loai, ten, dia_chi, dien_thoai, email, ghi_chu) VALUES
    (
      'don_vi',
      'SEED-DVCT|Hội Chữ thập đỏ phường mẫu',
      '12 Nguyễn Huệ, Long Xuyên',
      '02903851111',
      'seed-hck@example.invalid',
      'Dữ liệu seed — có thể xóa: DELETE ... WHERE ten LIKE ''SEED-DVCT|%'';'
    ),
    (
      'co_quan',
      'SEED-DVCT|Cơ quan hành chính hỗ trợ cứu trợ',
      NULL,
      '02838234567',
      NULL,
      'Cơ quan seed (không địa chỉ).'
    ),
    (
      'ca_nhan',
      'SEED-DVCT|Nguyễn Văn Mẫu',
      'ấp An Hòa, xã Vĩnh Thạnh Trung',
      '0909123456',
      NULL,
      'Cá nhân tham gia quyên góp (seed).'
    );

  RAISE NOTICE 'seed_kho_don_vi_cuu_tro: đã tạo 3 bản ghi (2 đơn vị/cơ quan + 1 cá nhân).';
END $$;
