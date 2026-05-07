-- ============================================================================
-- Danh sách công việc (giao việc) — FK nhân viên trách nhiệm / người tạo, mảng hỗ trợ
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cong_viec_danh_sach (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  muc_do           TEXT NOT NULL
                   CHECK (muc_do IN ('Thấp', 'Trung bình', 'Cao', 'Khẩn')),
  ten_cong_viec    TEXT NOT NULL,
  ghi_chu          TEXT,
  link_tai_lieu    TEXT,
  thoi_han         DATE,
  tien_do          SMALLINT NOT NULL DEFAULT 0
                   CHECK (tien_do >= 0 AND tien_do <= 100),
  id_trach_nhiem   BIGINT NOT NULL
                   CONSTRAINT cong_viec_danh_sach_id_trach_nhiem_fkey
                   REFERENCES public.var_nhan_vien (id)
                   ON UPDATE CASCADE ON DELETE RESTRICT,
  ids_ho_tro       BIGINT[] NOT NULL DEFAULT '{}',
  trang_thai       TEXT NOT NULL DEFAULT 'Mới'
                   CHECK (trang_thai IN ('Mới', 'Đang thực hiện', 'Hoàn thành', 'Tạm dừng', 'Hủy')),
  ket_qua          TEXT,
  link_kq          TEXT,
  ngay_hoan_thanh  DATE,
  id_nguoi_tao     BIGINT NOT NULL
                   CONSTRAINT cong_viec_danh_sach_id_nguoi_tao_fkey
                   REFERENCES public.var_nhan_vien (id)
                   ON UPDATE CASCADE ON DELETE RESTRICT,
  tg_tao           TIMESTAMPTZ NOT NULL DEFAULT now(),
  tg_cap_nhat      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cong_viec_danh_sach_trach_nhiem ON public.cong_viec_danh_sach (id_trach_nhiem);
CREATE INDEX IF NOT EXISTS idx_cong_viec_danh_sach_nguoi_tao ON public.cong_viec_danh_sach (id_nguoi_tao);
CREATE INDEX IF NOT EXISTS idx_cong_viec_danh_sach_thoi_han ON public.cong_viec_danh_sach (thoi_han DESC);
CREATE INDEX IF NOT EXISTS idx_cong_viec_danh_sach_ids_ho_tro ON public.cong_viec_danh_sach USING GIN (ids_ho_tro);

DROP TRIGGER IF EXISTS trg_cong_viec_danh_sach_updated ON public.cong_viec_danh_sach;
CREATE TRIGGER trg_cong_viec_danh_sach_updated
  BEFORE UPDATE ON public.cong_viec_danh_sach
  FOR EACH ROW EXECUTE FUNCTION public.set_tg_cap_nhat();

ALTER TABLE public.cong_viec_danh_sach ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cong_viec_danh_sach_select ON public.cong_viec_danh_sach;
CREATE POLICY cong_viec_danh_sach_select ON public.cong_viec_danh_sach
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS cong_viec_danh_sach_modify ON public.cong_viec_danh_sach;
CREATE POLICY cong_viec_danh_sach_modify ON public.cong_viec_danh_sach
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
