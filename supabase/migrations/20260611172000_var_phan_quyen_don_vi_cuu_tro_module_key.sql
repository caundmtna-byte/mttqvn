-- Đổi module_key phân quyền theo route mới (don-vi-ho-tro → don-vi-cuu-tro).
UPDATE public.var_phan_quyen
SET module_key = 'don-vi-cuu-tro',
    tg_cap_nhat = now()
WHERE module_key = 'don-vi-ho-tro';

UPDATE public.var_phan_quyen
SET module_key = 'don-vi-cuu-tro',
    tg_cap_nhat = now()
WHERE module_key = 'mat-tran-to-quoc/kho-cuu-tro/don-vi-ho-tro';

NOTIFY pgrst, 'reload schema';
