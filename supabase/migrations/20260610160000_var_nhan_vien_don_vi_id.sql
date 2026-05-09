-- Đơn vị quản lý (xã/phường) khi chức vụ có cấp quản lý "Xã phường".
ALTER TABLE public.var_nhan_vien
  ADD COLUMN IF NOT EXISTS don_vi_id BIGINT REFERENCES public.var_ssn_xa_phuong (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_var_nhan_vien_don_vi ON public.var_nhan_vien (don_vi_id);
