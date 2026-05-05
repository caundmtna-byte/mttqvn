-- Đổi cap_bac_id → cap_bac nếu bảng đã tạo từ bản migration cũ (trước khi đổi tên cột).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'var_chuc_vu' AND column_name = 'cap_bac_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'var_chuc_vu' AND column_name = 'cap_bac'
  ) THEN
    ALTER TABLE public.var_chuc_vu RENAME COLUMN cap_bac_id TO cap_bac;
  END IF;
END $$;
