-- Supabase linter: "Security Definer View"
-- PG15+ views default to security_invoker=false (checks base-table access as view owner).
-- Set security_invoker=true so RLS and grants apply to the calling role (e.g. authenticated).

ALTER VIEW public.v_diem_danh_ky_hop_summary SET (security_invoker = true);
ALTER VIEW public.v_cong_viec_bao_cao SET (security_invoker = true);
