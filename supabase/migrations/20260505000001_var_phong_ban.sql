-- ============================================================================
-- Bảng var_phong_ban — cây phòng ban, khóa int8, tên không trùng (so khớp
-- lower(trim(...))). duong_dan / cap_do: INSERT placeholder; trigger sau INSERT.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.var_phong_ban (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ten_phong_ban   TEXT NOT NULL,
  mo_ta           TEXT,
  cha_id          BIGINT REFERENCES public.var_phong_ban (id) ON DELETE SET NULL,
  cap_do          INTEGER NOT NULL DEFAULT 0,
  duong_dan       TEXT NOT NULL DEFAULT '',
  trang_thai      TEXT NOT NULL DEFAULT 'Đang hoạt động'
                  CHECK (trang_thai IN ('Đang hoạt động','Ngừng hoạt động')),
  thu_tu          INTEGER NOT NULL DEFAULT 0,
  tg_tao          TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_var_phong_ban_ten_lower
  ON public.var_phong_ban (lower(trim(ten_phong_ban)));

CREATE INDEX IF NOT EXISTS idx_var_phong_ban_cha       ON public.var_phong_ban (cha_id);
CREATE INDEX IF NOT EXISTS idx_var_phong_ban_duong_dan ON public.var_phong_ban (duong_dan);

ALTER TABLE public.var_phong_ban ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS var_phong_ban_select ON public.var_phong_ban;
CREATE POLICY var_phong_ban_select ON public.var_phong_ban
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS var_phong_ban_modify ON public.var_phong_ban;
CREATE POLICY var_phong_ban_modify ON public.var_phong_ban
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.var_phong_ban_path_after_insert() RETURNS trigger AS $$
DECLARE
  p_duong text;
  p_cap   int;
BEGIN
  IF NEW.cha_id IS NULL THEN
    UPDATE public.var_phong_ban
    SET duong_dan = '/' || NEW.id::text, cap_do = 1
    WHERE id = NEW.id;
  ELSE
    SELECT p.duong_dan, p.cap_do INTO p_duong, p_cap
    FROM public.var_phong_ban p
    WHERE p.id = NEW.cha_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'var_phong_ban: cha_id % không tồn tại', NEW.cha_id;
    END IF;
    UPDATE public.var_phong_ban
    SET duong_dan = p_duong || '/' || NEW.id::text, cap_do = p_cap + 1
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_var_phong_ban_path_ins ON public.var_phong_ban;
CREATE TRIGGER trg_var_phong_ban_path_ins
  AFTER INSERT ON public.var_phong_ban
  FOR EACH ROW EXECUTE FUNCTION public.var_phong_ban_path_after_insert();

DROP TRIGGER IF EXISTS trg_var_phong_ban_updated ON public.var_phong_ban;
CREATE TRIGGER trg_var_phong_ban_updated
  BEFORE UPDATE ON public.var_phong_ban
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();
