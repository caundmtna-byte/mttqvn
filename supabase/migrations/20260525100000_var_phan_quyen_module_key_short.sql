-- Chuẩn hóa module_key cũ (full path) → segment cuối, trùng unique (chuc_vu_id, module_key).

UPDATE public.var_phan_quyen pq
SET module_key = regexp_replace(pq.module_key, '^(.*/)', '')
WHERE pq.module_key LIKE '%/%';
