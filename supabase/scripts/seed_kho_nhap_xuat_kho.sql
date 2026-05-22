-- ============================================================================
-- Seed mẫu: public.kho_nhap_xuat_kho + public.kho_nhap_xuat_kho_ct
-- ----------------------------------------------------------------------------
-- Điều kiện: đã chạy migration `20260612100000_kho_nhap_xuat_kho.sql`
--            và có sẵn dữ liệu trong:
--              - public.kho_danh_sach_kho      (>= 2 kho)
--              - public.kho_danh_sach_hang_hoa (>= 2 hàng hóa)
--              - public.kho_don_vi_cuu_tro     (>= 1 đơn vị)
--              - public.kho_dot_cuu_tro        (>= 1 đợt)
--
-- Cách chạy: Supabase SQL Editor (hoặc `psql`) — dán toàn bộ file.
--
-- Idempotent: chỉ chèn nếu chưa có ghi_chu = 'SEED-NXK|...'.
-- Xóa seed:  DELETE FROM public.kho_nhap_xuat_kho WHERE ghi_chu LIKE 'SEED-NXK|%';
-- ============================================================================

DO $$
DECLARE
  v_kho_a   BIGINT;
  v_kho_b   BIGINT;
  v_hh_1    BIGINT;
  v_hh_2    BIGINT;
  v_dvi     BIGINT;
  v_dot     BIGINT;
  v_dvt_1   TEXT;
  v_dvt_2   TEXT;
  v_phieu_id BIGINT;
BEGIN
  IF EXISTS (SELECT 1 FROM public.kho_nhap_xuat_kho WHERE ghi_chu LIKE 'SEED-NXK|%') THEN
    RAISE NOTICE 'seed_kho_nhap_xuat_kho: đã có bản ghi seed (bỏ qua).';
    RETURN;
  END IF;

  SELECT id INTO v_kho_a FROM public.kho_danh_sach_kho ORDER BY tt LIMIT 1;
  SELECT id INTO v_kho_b FROM public.kho_danh_sach_kho WHERE id <> v_kho_a ORDER BY tt LIMIT 1;
  SELECT id, don_vi_tinh INTO v_hh_1, v_dvt_1 FROM public.kho_danh_sach_hang_hoa ORDER BY id LIMIT 1;
  SELECT id, don_vi_tinh INTO v_hh_2, v_dvt_2 FROM public.kho_danh_sach_hang_hoa WHERE id <> v_hh_1 ORDER BY id LIMIT 1;
  SELECT id INTO v_dvi FROM public.kho_don_vi_cuu_tro ORDER BY tt LIMIT 1;
  SELECT id INTO v_dot FROM public.kho_dot_cuu_tro ORDER BY tt LIMIT 1;

  IF v_kho_a IS NULL OR v_kho_b IS NULL OR v_hh_1 IS NULL OR v_hh_2 IS NULL
     OR v_dvi IS NULL OR v_dot IS NULL THEN
    RAISE NOTICE 'seed_kho_nhap_xuat_kho: thiếu master data (kho/hàng/đơn vị/đợt) — bỏ qua.';
    RETURN;
  END IF;

  -- 1. Phiếu nhập từ đơn vị cứu trợ → kho A (2 mặt hàng)
  v_phieu_id := public.rpc_kho_tao_phieu_nhap_xuat(
    p_loai_phieu        => 'nhap_ngoai',
    p_ngay_phieu        => CURRENT_DATE - INTERVAL '7 day',
    p_kho_xuat_id       => NULL,
    p_kho_nhap_id       => v_kho_a,
    p_don_vi_cuu_tro_id => v_dvi,
    p_dot_cuu_tro_id    => NULL,
    p_ghi_chu           => 'SEED-NXK|Nhập kho từ đơn vị cứu trợ (mẫu)',
    p_chi_tiet          => jsonb_build_array(
      jsonb_build_object('hang_hoa_id', v_hh_1, 'don_vi_tinh', v_dvt_1, 'so_luong', 100, 'don_gia', 50000, 'thu_tu', 1),
      jsonb_build_object('hang_hoa_id', v_hh_2, 'don_vi_tinh', v_dvt_2, 'so_luong',  50, 'don_gia', 30000, 'thu_tu', 2)
    )
  );

  -- 2. Phiếu chuyển từ kho A → kho B (1 mặt hàng, 30 đơn vị)
  v_phieu_id := public.rpc_kho_tao_phieu_nhap_xuat(
    p_loai_phieu        => 'chuyen_kho',
    p_ngay_phieu        => CURRENT_DATE - INTERVAL '3 day',
    p_kho_xuat_id       => v_kho_a,
    p_kho_nhap_id       => v_kho_b,
    p_don_vi_cuu_tro_id => NULL,
    p_dot_cuu_tro_id    => NULL,
    p_ghi_chu           => 'SEED-NXK|Chuyển hàng giữa hai kho (mẫu)',
    p_chi_tiet          => jsonb_build_array(
      jsonb_build_object('hang_hoa_id', v_hh_1, 'don_vi_tinh', v_dvt_1, 'so_luong', 30, 'don_gia', 50000, 'thu_tu', 1)
    )
  );

  -- 3. Phiếu xuất từ kho A → đợt cứu trợ (1 mặt hàng, 20 đơn vị)
  v_phieu_id := public.rpc_kho_tao_phieu_nhap_xuat(
    p_loai_phieu        => 'xuat_ngoai',
    p_ngay_phieu        => CURRENT_DATE - INTERVAL '1 day',
    p_kho_xuat_id       => v_kho_a,
    p_kho_nhap_id       => NULL,
    p_don_vi_cuu_tro_id => NULL,
    p_dot_cuu_tro_id    => v_dot,
    p_ghi_chu           => 'SEED-NXK|Xuất kho cho đợt cứu trợ (mẫu)',
    p_chi_tiet          => jsonb_build_array(
      jsonb_build_object('hang_hoa_id', v_hh_2, 'don_vi_tinh', v_dvt_2, 'so_luong', 20, 'don_gia', 30000, 'thu_tu', 1)
    )
  );

  RAISE NOTICE 'seed_kho_nhap_xuat_kho: đã tạo 3 phiếu seed.';
END $$;
