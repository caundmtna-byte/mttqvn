-- Đổi module_key cũ (hoa hồng) → slug nhuận bút (khớp route /quan-ly-viet-bai/nhuan-but-viet-bai).

UPDATE public.var_phan_quyen
SET module_key = 'nhuan-but-viet-bai'
WHERE module_key IN ('hoa-hong-viet-bai', 'quan-ly-viet-bai/hoa-hong-viet-bai');
