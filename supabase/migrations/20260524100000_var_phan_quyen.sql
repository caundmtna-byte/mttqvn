-- ============================================================================
-- Bảng var_phan_quyen — quyền theo chức vụ + module.
-- module_key: key ngắn (vd. phong-ban, nhan-vien), không lưu full path — app map ↔ module_id.
-- Cột quyen: chuỗi token tiếng Việt cách nhau bởi dấu phẩy (xem,them,sua,xoa,quan_tri,…).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.var_phan_quyen (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  module_key      TEXT NOT NULL,
  chuc_vu_id      BIGINT NOT NULL REFERENCES public.var_chuc_vu (id) ON DELETE CASCADE,
  quyen           TEXT NOT NULL DEFAULT '',
  tg_cap_nhat     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_var_phan_quyen_chuc_vu_module
  ON public.var_phan_quyen (chuc_vu_id, module_key);

CREATE INDEX IF NOT EXISTS idx_var_phan_quyen_chuc_vu ON public.var_phan_quyen (chuc_vu_id);

ALTER TABLE public.var_phan_quyen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS var_phan_quyen_select ON public.var_phan_quyen;
CREATE POLICY var_phan_quyen_select ON public.var_phan_quyen
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS var_phan_quyen_modify ON public.var_phan_quyen;
CREATE POLICY var_phan_quyen_modify ON public.var_phan_quyen
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_var_phan_quyen_updated ON public.var_phan_quyen;
CREATE TRIGGER trg_var_phan_quyen_updated
  BEFORE UPDATE ON public.var_phan_quyen
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();
