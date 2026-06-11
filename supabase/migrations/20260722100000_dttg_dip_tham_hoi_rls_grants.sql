-- ============================================================================
-- DTTG Dịp thăm hỏi — RLS + GRANT cho bảng gốc và view (PostgREST / authenticated)
-- Bổ sung khi bảng được tạo thủ công thiếu quyền đọc qua API
-- ============================================================================

ALTER TABLE public.dttg_dip_tham_hoi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dttg_dip_tham_hoi_select ON public.dttg_dip_tham_hoi;
CREATE POLICY dttg_dip_tham_hoi_select
  ON public.dttg_dip_tham_hoi
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS dttg_dip_tham_hoi_modify ON public.dttg_dip_tham_hoi;
CREATE POLICY dttg_dip_tham_hoi_modify
  ON public.dttg_dip_tham_hoi
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dttg_dip_tham_hoi TO authenticated;
GRANT SELECT ON public.dttg_dip_tham_hoi TO anon;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

GRANT SELECT ON public.dttg_dip_tham_hoi_with_counts TO authenticated;
GRANT SELECT ON public.dttg_dip_tham_hoi_with_counts TO anon;

ALTER VIEW public.dttg_dip_tham_hoi_with_counts SET (security_invoker = true);

NOTIFY pgrst, 'reload schema';
