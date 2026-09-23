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

  INSERT INTO public.kho_don_vi_cuu_tro
    (loai, ten, so_nguoi, nguoi_dai_dien, chuc_vu, dia_chi, dien_thoai,
     don_vi_gioi_thieu_loai, don_vi_gioi_thieu_id, email, ghi_chu) VALUES
    (
      'nhom_thien_nguyen',
      'SEED-DVCT|Hội Chữ thập đỏ phường mẫu',
      25,
      'Nguyễn Thị Hoa',
      'Chủ tịch hội',
      '12 Nguyễn Huệ, Long Xuyên',
      '02903851111',
      'xa_phuong',
      (SELECT id FROM public.var_ssn_xa_phuong ORDER BY thu_tu, id LIMIT 1),
      'seed-hck@example.invalid',
      'Dữ liệu seed — có thể xóa: DELETE ... WHERE ten LIKE ''SEED-DVCT|%'';'
    ),
    (
      'cq_cap_tinh',
      'SEED-DVCT|Cơ quan hành chính hỗ trợ cứu trợ',
      NULL,
      'Trần Văn Bình',
      'Chánh văn phòng',
      NULL,
      '02838234567',
      'tinh',
      NULL,
      NULL,
      'Cơ quan seed (không địa chỉ) — đơn vị giới thiệu là MTTQ tỉnh.'
    ),
    (
      'ca_nhan',
      'SEED-DVCT|Nguyễn Văn Mẫu',
      NULL,
      NULL,
      NULL,
      'ấp An Hòa, xã Vĩnh Thạnh Trung',
      '0909123456',
      NULL,
      NULL,
      NULL,
      'Cá nhân tham gia quyên góp (seed) — chưa nhập đơn vị giới thiệu.'
    );

  RAISE NOTICE 'seed_kho_don_vi_cuu_tro: đã tạo 3 bản ghi (2 đơn vị/cơ quan + 1 cá nhân).';
END $$;
