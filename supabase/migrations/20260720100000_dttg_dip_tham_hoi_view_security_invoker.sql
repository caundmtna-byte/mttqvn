-- Supabase linter: "Security Definer View"
-- PG15+ views default to security_invoker=false (checks base-table access as view owner).
-- Set security_invoker=true so RLS and grants apply to the calling role (e.g. authenticated).

ALTER VIEW public.dttg_dip_tham_hoi_with_counts SET (security_invoker = true);
