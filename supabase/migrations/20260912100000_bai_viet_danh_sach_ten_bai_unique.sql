-- Không cho trùng TÊN BÀI trong `bai_viet_danh_sach`.
-- So sánh sau khi bỏ khoảng trắng thừa và không phân biệt hoa/thường, nên
-- "Bài  A " và "bài a" là trùng nhau. Cùng quy tắc với chuẩn hoá phía client
-- (`normalizeBaiVietTenBaiForCompare`) — sửa một bên phải sửa cả bên kia.

-- Dữ liệu đang trùng sẽ làm CREATE UNIQUE INDEX thất bại với thông báo khó hiểu.
-- Dừng sớm và chỉ rõ những tên nào phải dọn trước.
DO $$
DECLARE
  v_so_nhom integer;
  v_vi_du   text;
BEGIN
  SELECT count(*), string_agg(ten_chuan, ' | ' ORDER BY ten_chuan)
    INTO v_so_nhom, v_vi_du
  FROM (
    SELECT lower(regexp_replace(btrim(ten_bai), '\s+', ' ', 'g')) AS ten_chuan
    FROM public.bai_viet_danh_sach
    GROUP BY 1
    HAVING count(*) > 1
    LIMIT 10
  ) t;

  IF coalesce(v_so_nhom, 0) > 0 THEN
    RAISE EXCEPTION
      'Còn % tên bài đang bị trùng, phải sửa/xoá trước khi siết ràng buộc. Ví dụ: %',
      v_so_nhom, v_vi_du;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_bai_viet_danh_sach_ten_bai_lower
  ON public.bai_viet_danh_sach (lower(regexp_replace(btrim(ten_bai), '\s+', ' ', 'g')));
