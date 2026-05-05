-- ============================================================================
-- Bảng var_chuc_vu — chức vụ, khóa int8, tên unique (lower(trim)), cột cap_bac int2.
-- phong_ban_id → var_phong_ban; cap_bac SMALLINT không FK (cấp bậc chỉ mock ở app).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.var_chuc_vu (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ten_chuc_vu     TEXT NOT NULL,
  mo_ta           TEXT,
  phong_ban_id    BIGINT REFERENCES public.var_phong_ban (id) ON DELETE SET NULL,
  cap_bac           SMALLINT,
  trang_thai      TEXT NOT NULL DEFAULT 'Đang hoạt động'
                  CHECK (trang_thai IN ('Đang hoạt động','Ngừng hoạt động')),
  thu_tu          INTEGER NOT NULL DEFAULT 0,
  tg_tao          TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_var_chuc_vu_ten_lower
  ON public.var_chuc_vu (lower(trim(ten_chuc_vu)));

CREATE INDEX IF NOT EXISTS idx_var_chuc_vu_phong_ban ON public.var_chuc_vu (phong_ban_id);
CREATE INDEX IF NOT EXISTS idx_var_chuc_vu_cap_bac   ON public.var_chuc_vu (cap_bac);
CREATE INDEX IF NOT EXISTS idx_var_chuc_vu_thu_tu      ON public.var_chuc_vu (thu_tu);

ALTER TABLE public.var_chuc_vu ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS var_chuc_vu_select ON public.var_chuc_vu;
CREATE POLICY var_chuc_vu_select ON public.var_chuc_vu
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS var_chuc_vu_modify ON public.var_chuc_vu;
CREATE POLICY var_chuc_vu_modify ON public.var_chuc_vu
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_var_chuc_vu_updated ON public.var_chuc_vu;
CREATE TRIGGER trg_var_chuc_vu_updated
  BEFORE UPDATE ON public.var_chuc_vu
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();
