-- ============================================================================
-- Cột thứ tự hiển thị `tt` — tự tăng (sequence) trên mỗi INSERT
-- Phụ thuộc: bảng public.kho_danh_sach_kho (20260611130000, 20260611150000).
-- Sau khi chạy: PostgREST reload schema (API thấy cột mới).
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
