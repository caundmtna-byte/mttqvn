/**
 * Đếm kỳ họp sắp diễn ra cho Trang chủ.
 *
 * **Egress:** Trang chủ là trang ai cũng mở đầu tiên nên tuyệt đối không kéo bảng về
 * đếm ở client. Ở đây dùng `count: 'exact'` của PostgREST (server đếm) và chỉ lấy về
 * **đúng 1 dòng, 2 cột** để hiện ngày họp gần nhất — tổng cộng 1 request, vài trăm byte.
 */
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { KyHopUpcomingScope } from '../utils/ky-hop-upcoming-scope';

export interface HomeKyHopUpcoming {
  /** Số kỳ họp có `ngay_hop` từ hôm nay trở đi, trong phạm vi xem của người dùng. */
  total: number;
  /** Ngày họp gần nhất (YYYY-MM-DD) hoặc null nếu không có. */
  ngayHopGanNhat: string | null;
  /** Kỳ thứ của kỳ họp gần nhất. */
  kyThuGanNhat: string | null;
}

const EMPTY: HomeKyHopUpcoming = { total: 0, ngayHopGanNhat: null, kyThuGanNhat: null };

export async function getHomeKyHopUpcoming(
  scope: KyHopUpcomingScope,
  todayIso: string,
): Promise<HomeKyHopUpcoming> {
  if (scope.kind === 'none') return EMPTY;
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client is not configured.');

  let query = supabase
    .from('mttq_ky_hop')
    .select('ky_thu,ngay_hop', { count: 'exact' })
    .gte('ngay_hop', todayIso)
    .order('ngay_hop', { ascending: true })
    .limit(1);

  // Phạm vi xem — xem `resolveKyHopUpcomingScope`. Gửi sai ở đây là lộ số liệu
  // đơn vị khác cho cán bộ xã, vì RLS bảng này vẫn là `USING (true)`.
  if (scope.kind === 'don_vi') query = query.eq('don_vi_id', scope.donViId);
  if (scope.kind === 'nguoi_tao') query = query.eq('id_nguoi_tao', scope.nhanVienId);

  const { data, error, count } = await query;
  if (error) handleSupabaseError(error);

  const first = (data ?? [])[0] as { ky_thu?: unknown; ngay_hop?: unknown } | undefined;
  return {
    total: count ?? 0,
    ngayHopGanNhat: first?.ngay_hop == null ? null : String(first.ngay_hop).slice(0, 10),
    kyThuGanNhat: first?.ky_thu == null ? null : String(first.ky_thu),
  };
}
