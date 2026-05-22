-- ============================================================================
-- Thủ công: thêm cột tt (thứ tự, tự tăng) cho public.kho_danh_sach_kho
-- ============================================================================
-- Dùng khi:
--   - `supabase db push` / migration chưa chạy tới file 20260611160000, hoặc
--   - App/PostgREST báo thiếu cột `tt` sau khi đã ALTER (cần reload schema).
--
-- Chạy: Supabase Dashboard → SQL Editor (role có quyền DDL), dán toàn bộ file.
-- Idempotent: chạy lại an toàn trong hầu hết trường hợp.
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS public.kho_danh_sach_kho_tt_seq;

ALTER TABLE public.kho_danh_sach_kho
  ADD COLUMN IF NOT EXISTS tt integer;

UPDATE public.kho_danh_sach_kho k
SET tt = s.rn
FROM (
  SELECT id, row_number() OVER (ORDER BY id)::integer AS rn
  FROM public.kho_danh_sach_kho
) s
WHERE k.id = s.id AND k.tt IS NULL;

ALTER TABLE public.kho_danh_sach_kho
  ALTER COLUMN tt SET NOT NULL;

SELECT setval(
  'public.kho_danh_sach_kho_tt_seq',
  COALESCE((SELECT MAX(tt) FROM public.kho_danh_sach_kho), 0),
  true
);

ALTER TABLE public.kho_danh_sach_kho
  ALTER COLUMN tt SET DEFAULT nextval('public.kho_danh_sach_kho_tt_seq'::regclass);

ALTER SEQUENCE public.kho_danh_sach_kho_tt_seq OWNED BY public.kho_danh_sach_kho.tt;

CREATE INDEX IF NOT EXISTS idx_kho_danh_sach_kho_tt ON public.kho_danh_sach_kho (tt);

NOTIFY pgrst, 'reload schema';

-- Kiểm tra nhanh:
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'kho_danh_sach_kho' AND column_name = 'tt';
