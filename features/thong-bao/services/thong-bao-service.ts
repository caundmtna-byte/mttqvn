/**
 * Truy vấn hộp thông báo của chính người đang đăng nhập.
 *
 * **Phạm vi xem không nằm ở đây.** Bảng `thong_bao` có RLS thật: policy
 * `thong_bao_select` chỉ trả về dòng có `nhan_vien_id = fn_nhan_vien_id_hien_tai()`.
 * Vì vậy các truy vấn dưới đây cố ý KHÔNG kèm `.eq('nhan_vien_id', …)` — thêm vào
 * chỉ tạo ảo giác rằng client là nơi chặn dữ liệu.
 *
 * **Egress** (free-tier 5 GB/tháng — xem `docs/supabase-egress.md`):
 * - Chuông chỉ hỏi CON SỐ bằng `head: true, count: 'exact'` ⇒ không có dòng nào
 *   trong phản hồi, chỉ một header `Content-Range`.
 * - Danh sách chỉ tải khi người dùng thực sự mở chuông.
 * - "Đánh dấu tất cả đã đọc" đi qua RPC ⇒ 1 request thay vì N lệnh UPDATE.
 */
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import { fetchAllPages } from '@/lib/supabase/fetch-all-pages';
import type { ThongBao, ThongBaoLoai, ThongBaoMucDo } from '../core/types';

/** Cột đọc về — không có cột nào nặng nên không cần tách LIST/FULL. */
const SELECT_LIST = 'id,loai,muc_do,tieu_de,noi_dung,duong_dan,da_doc,tg_tao';

/**
 * Ngưỡng an toàn riêng cho hộp thông báo.
 *
 * Hộp này KHÔNG cắt ngầm (quy tắc 11 trong `docs/supabase-egress.md`): chuông mở
 * ra là thấy đủ mọi thông báo đang có. Việc đó an toàn vì hàm sinh phía database
 * gom nhóm (tối đa 2 dòng/người/ngày cho công việc + 1 dòng/tuần cho lương) và
 * lịch `thong_bao_don_cu` xoá thông báo đã đọc quá 60 ngày. Nếu con số vẫn vượt
 * ngưỡng này thì có gì đó sai ở hàm sinh — `fetchAllPages` ném lỗi chứ không trả
 * về một phần, để lỗi lộ ra thay vì âm thầm thiếu dòng.
 */
const NGUONG_AN_TOAN_THONG_BAO = 5_000;

function mapRow(row: Record<string, unknown>): ThongBao {
  return {
    id: String(row.id),
    loai: String(row.loai) as ThongBaoLoai,
    muc_do: String(row.muc_do ?? 'tin') as ThongBaoMucDo,
    tieu_de: String(row.tieu_de ?? ''),
    noi_dung: String(row.noi_dung ?? ''),
    duong_dan: row.duong_dan == null ? null : String(row.duong_dan),
    da_doc: Boolean(row.da_doc),
    tg_tao: String(row.tg_tao ?? ''),
  };
}

function client() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Chưa cấu hình kết nối Supabase.');
  return supabase;
}

/** Số thông báo chưa đọc — chỉ con số, không kéo dòng nào về. */
export async function getSoThongBaoChuaDoc(): Promise<number> {
  const { error, count } = await client()
    .from('thong_bao')
    .select('id', { head: true, count: 'exact' })
    .eq('da_doc', false);
  if (error) handleSupabaseError(error);
  return count ?? 0;
}

/** Toàn bộ hộp thông báo của người đang đăng nhập, chưa đọc trước. */
export async function getThongBaoList(): Promise<ThongBao[]> {
  const supabase = client();
  const rows = await fetchAllPages<Record<string, unknown>>(
    async (from, to) => {
      const { data, error } = await supabase
        .from('thong_bao')
        .select(SELECT_LIST)
        .order('da_doc', { ascending: true })
        .order('tg_tao', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to);
      if (error) handleSupabaseError(error);
      return (data ?? []) as unknown as Record<string, unknown>[];
    },
    { safetyLimit: NGUONG_AN_TOAN_THONG_BAO, label: 'thong_bao' },
  );
  return rows.map(mapRow);
}

/** Đánh dấu một thông báo đã đọc. Trigger ở database tự ghi mốc `tg_doc`. */
export async function danhDauDaDoc(id: string): Promise<void> {
  const { error } = await client()
    .from('thong_bao')
    .update({ da_doc: true })
    .eq('id', Number(id))
    // Không cần trả về dòng vừa ghi — cache phía client đã tự vá.
    .select('id');
  if (error) handleSupabaseError(error);
}

/** Đánh dấu toàn bộ đã đọc trong 1 request. Trả về số dòng vừa đổi. */
export async function danhDauTatCaDaDoc(): Promise<number> {
  const { data, error } = await client().rpc('rpc_thong_bao_danh_dau_tat_ca_da_doc' as never);
  if (error) handleSupabaseError(error);
  const n = Number(data ?? 0);
  return Number.isFinite(n) ? n : 0;
}
