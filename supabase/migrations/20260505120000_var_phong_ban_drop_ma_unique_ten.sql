-- Nâng cấp từ bản var_phong_ban có cột ma_phong_ban (migration cũ).
-- Idempotent: an toàn chạy lại.

ALTER TABLE public.var_phong_ban DROP CONSTRAINT IF EXISTS uq_var_phong_ban_ma;
DROP INDEX IF EXISTS public.idx_var_phong_ban_ma_lower;
ALTER TABLE public.var_phong_ban DROP COLUMN IF EXISTS ma_phong_ban;

DROP INDEX IF EXISTS public.uq_var_phong_ban_ten_lower;
CREATE UNIQUE INDEX IF NOT EXISTS uq_var_phong_ban_ten_lower
  ON public.var_phong_ban (lower(trim(ten_phong_ban)));
