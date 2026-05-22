-- ============================================================================
-- Seed mẫu: public.kho_dot_cuu_tro (đợt cứu trợ)
-- ============================================================================
-- Điều kiện: đã chạy migration `20260611173000_kho_dot_cuu_tro.sql`.
--
-- Cách chạy: Supabase SQL Editor (hoặc `psql`) — dán toàn bộ file.
--
-- Idempotent: chỉ chèn nếu chưa có dòng `ten` bắt đầu bằng `SEED-DCT|`.
-- Xóa seed: `DELETE FROM public.kho_dot_cuu_tro WHERE ten LIKE 'SEED-DCT|%';`
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.kho_dot_cuu_tro WHERE ten LIKE 'SEED-DCT|%') THEN
    RAISE NOTICE 'seed_kho_dot_cuu_tro: đã có bản ghi seed (bỏ qua).';
    RETURN;
  END IF;

  INSERT INTO public.kho_dot_cuu_tro (ten, mo_ta, link) VALUES
    (
      'SEED-DCT|Bão Yagi 2024',
      'Đợt cứu trợ, hỗ trợ người dân sau bão (dữ liệu seed — có thể xóa).',
      'https://example.invalid/thong-tin-bao-yagi'
    ),
    (
      'SEED-DCT|Lũ lụt miền Trung 2025',
      'Tổ chức quyên góp, phân phối hàng cứu trợ.',
      NULL
    ),
    (
      'SEED-DCT|Hỗ trợ khẩn cấp Q1/2026',
      NULL,
      'https://example.invalid/cuu-tro-q1-2026'
    );

  RAISE NOTICE 'seed_kho_dot_cuu_tro: đã tạo 3 bản ghi.';
END $$;
