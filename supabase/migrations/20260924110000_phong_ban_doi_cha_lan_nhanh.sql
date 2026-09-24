-- Đổi phòng cha thì tính lại đường dẫn cây cho CẢ NHÁNH.
--
-- Trigger cũ (`var_phong_ban_path_after_insert`) chỉ tính `duong_dan` / `cap_do`
-- lúc INSERT. Khi đổi `cha_id`, client tự tính cho đúng một phòng, còn mọi phòng
-- con cháu vẫn giữ đường dẫn cũ ⇒ cây lệch, lọc/sắp theo `duong_dan` sai mà
-- không có dấu hiệu gì trên màn hình.
--
-- 1. BEFORE UPDATE OF cha_id: tính lại đường dẫn của chính phòng đó từ phòng cha
--    mới, và chặn chọn chính nó / một phòng cấp dưới của nó làm cha (vòng lặp).
-- 2. AFTER UPDATE (khi duong_dan đổi): thay tiền tố đường dẫn cho mọi phòng con cháu
--    trong MỘT câu lệnh, cộng lệch `cap_do` tương ứng.
--
-- Client (`tinhViTriCay`) vẫn gửi đường dẫn tự tính — trigger ghi đè bằng giá
-- trị đúng, nên hai bên không thể lệch nhau.

CREATE OR REPLACE FUNCTION public.fn_var_phong_ban_doi_cha()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  p_duong text;
  p_cap   int;
BEGIN
  IF NEW.cha_id IS NOT DISTINCT FROM OLD.cha_id THEN
    RETURN NEW;
  END IF;

  IF NEW.cha_id IS NULL THEN
    NEW.duong_dan := '/' || NEW.id::text;
    NEW.cap_do    := 1;
    RETURN NEW;
  END IF;

  SELECT p.duong_dan, p.cap_do INTO p_duong, p_cap
  FROM public.var_phong_ban p
  WHERE p.id = NEW.cha_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'var_phong_ban: cha_id % không tồn tại', NEW.cha_id
      USING ERRCODE = '23503';
  END IF;

  IF NEW.cha_id = NEW.id OR p_duong = OLD.duong_dan OR p_duong LIKE OLD.duong_dan || '/%' THEN
    RAISE EXCEPTION 'Không được chọn chính phòng này hoặc một phòng cấp dưới của nó làm phòng cấp trên.'
      USING ERRCODE = '23514';
  END IF;

  NEW.duong_dan := p_duong || '/' || NEW.id::text;
  NEW.cap_do    := p_cap + 1;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_var_phong_ban_doi_cha() IS
  'BEFORE UPDATE OF cha_id: tính lại duong_dan/cap_do từ phòng cha mới, chặn vòng lặp cha–con.';

DROP TRIGGER IF EXISTS trg_var_phong_ban_doi_cha ON public.var_phong_ban;
CREATE TRIGGER trg_var_phong_ban_doi_cha
  BEFORE UPDATE OF cha_id ON public.var_phong_ban
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_var_phong_ban_doi_cha();

CREATE OR REPLACE FUNCTION public.fn_var_phong_ban_lan_nhanh()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Các dòng con cháu được cập nhật ngay trong câu lệnh dưới; trigger này bắn
  -- lại cho từng dòng đó thì không làm gì nữa.
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  UPDATE public.var_phong_ban
     SET duong_dan = NEW.duong_dan || substr(duong_dan, length(OLD.duong_dan) + 1),
         cap_do    = cap_do + (NEW.cap_do - OLD.cap_do)
   WHERE duong_dan LIKE OLD.duong_dan || '/%';
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.fn_var_phong_ban_lan_nhanh() IS
  'AFTER UPDATE khi duong_dan đổi: thay tiền tố đường dẫn và cap_do cho toàn bộ phòng con cháu.';

DROP TRIGGER IF EXISTS trg_var_phong_ban_lan_nhanh ON public.var_phong_ban;
-- Không dùng `UPDATE OF duong_dan`: cột đó do trigger BEFORE đổi chứ không nằm
-- trong câu SET, nên `UPDATE OF` sẽ không bắn. Lọc bằng WHEN thay thế.
CREATE TRIGGER trg_var_phong_ban_lan_nhanh
  AFTER UPDATE ON public.var_phong_ban
  FOR EACH ROW
  WHEN (OLD.duong_dan IS DISTINCT FROM NEW.duong_dan)
  EXECUTE FUNCTION public.fn_var_phong_ban_lan_nhanh();
