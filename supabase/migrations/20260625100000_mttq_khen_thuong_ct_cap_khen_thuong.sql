-- Cấp khen thưởng trên từng dòng chi tiết (Tỉnh / Trung ương / Xã)
ALTER TABLE public.mttq_khen_thuong_ct
  ADD COLUMN IF NOT EXISTS cap_khen_thuong TEXT NOT NULL DEFAULT 'Xã'
  CHECK (cap_khen_thuong IN ('Tỉnh', 'Trung ương', 'Xã'));
