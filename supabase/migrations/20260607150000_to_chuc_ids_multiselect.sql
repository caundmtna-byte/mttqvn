-- ══════════════════════════════════════════════════════════
-- A. mttq_can_bo: chuyển to_chuc_id (single FK) → to_chuc_ids (BIGINT[])
-- ══════════════════════════════════════════════════════════

-- 1. Thêm cột mảng mới
ALTER TABLE public.mttq_can_bo
  ADD COLUMN IF NOT EXISTS to_chuc_ids BIGINT[] NOT NULL DEFAULT '{}';

-- 2. Migrate dữ liệu: đưa to_chuc_id cũ vào mảng (chỉ khi có giá trị)
UPDATE public.mttq_can_bo
  SET to_chuc_ids = ARRAY[to_chuc_id]
  WHERE to_chuc_id IS NOT NULL;

-- 3. Xoá trigger cũ validate to_chuc_id (nếu có)
DROP TRIGGER IF EXISTS mttq_can_bo_validate_fk_trigger ON public.mttq_can_bo;

-- 4. Xoá cột FK cũ
ALTER TABLE public.mttq_can_bo
  DROP COLUMN IF EXISTS to_chuc_id;

-- ══════════════════════════════════════════════════════════
-- B. var_nhan_vien: thêm cột to_chuc_ids mới
-- ══════════════════════════════════════════════════════════

ALTER TABLE public.var_nhan_vien
  ADD COLUMN IF NOT EXISTS to_chuc_ids BIGINT[] NOT NULL DEFAULT '{}';
