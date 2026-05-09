-- ============================================================================
-- mttq_can_bo: phòng ban / bộ phận (FK var_phong_ban)
-- ============================================================================

ALTER TABLE public.mttq_can_bo
  ADD COLUMN IF NOT EXISTS phong_ban_id BIGINT
  REFERENCES public.var_phong_ban (id)
  ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mttq_can_bo_phong_ban ON public.mttq_can_bo (phong_ban_id);
