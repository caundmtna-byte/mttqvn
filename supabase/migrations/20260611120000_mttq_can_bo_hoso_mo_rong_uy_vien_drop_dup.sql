-- ============================================================================
-- Hồ sơ cán bộ: thêm văn hóa, ngày vào Đảng, quê quán, nơi ở (trước đây lưu ở UB).
-- Ủy viên ủy ban: bỏ ngày nhập TT (trùng mttq_can_bo.ngay_nhap_trang_thai) + các cột đã chuyển sang cán bộ.
-- Backfill từ mttq_uy_vien_uy_ban chỉ khi các cột nguồn vẫn tồn tại (idempotent).
-- ============================================================================

ALTER TABLE public.mttq_can_bo
  ADD COLUMN IF NOT EXISTS van_hoa TEXT,
  ADD COLUMN IF NOT EXISTS ngay_vao_dang DATE,
  ADD COLUMN IF NOT EXISTS que_quan TEXT,
  ADD COLUMN IF NOT EXISTS noi_o_hien_nay TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mttq_uy_vien_uy_ban' AND column_name = 'van_hoa'
  ) THEN
    UPDATE public.mttq_can_bo c
    SET
      van_hoa = COALESCE(NULLIF(btrim(c.van_hoa), ''), NULLIF(btrim(u.van_hoa), '')),
      ngay_vao_dang = COALESCE(c.ngay_vao_dang, u.ngay_vao_dang),
      que_quan = COALESCE(NULLIF(btrim(c.que_quan), ''), NULLIF(btrim(u.que_quan), '')),
      noi_o_hien_nay = COALESCE(NULLIF(btrim(c.noi_o_hien_nay), ''), NULLIF(btrim(u.noi_o_hien_nay), ''))
    FROM public.mttq_uy_vien_uy_ban u
    WHERE u.can_bo_id = c.id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mttq_uy_vien_uy_ban' AND column_name = 'ngay_nhap_trang_thai'
  ) THEN
    UPDATE public.mttq_can_bo c
    SET ngay_nhap_trang_thai = COALESCE(c.ngay_nhap_trang_thai, u.ngay_nhap_trang_thai)
    FROM public.mttq_uy_vien_uy_ban u
    WHERE u.can_bo_id = c.id
      AND u.ngay_nhap_trang_thai IS NOT NULL
      AND c.ngay_nhap_trang_thai IS NULL;
  END IF;
END $$;

ALTER TABLE public.mttq_uy_vien_uy_ban
  DROP COLUMN IF EXISTS ngay_nhap_trang_thai,
  DROP COLUMN IF EXISTS van_hoa,
  DROP COLUMN IF EXISTS ngay_vao_dang,
  DROP COLUMN IF EXISTS que_quan,
  DROP COLUMN IF EXISTS noi_o_hien_nay;
