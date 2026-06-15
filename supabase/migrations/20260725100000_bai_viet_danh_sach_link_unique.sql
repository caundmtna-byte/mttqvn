-- Unique liên kết bài viết (trim + không phân biệt hoa/thường)
CREATE UNIQUE INDEX IF NOT EXISTS uq_bai_viet_danh_sach_link_lower
  ON public.bai_viet_danh_sach (lower(trim(link)));
