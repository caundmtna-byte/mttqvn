import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';

/** Số cán bộ sắp đến hạn nâng bậc lương + ngày đến hạn gần nhất. */
export interface HomeTangLuongSapDenHan {
  total: number;
  ngayGanNhat: string | null;
}

/**
 * Phạm vi đếm — dịch từ viewer của module Tăng lương.
 *
 * Module này có BA nhánh chứ không phải hai như các module khác: cấp Tỉnh lọc
 * theo `cap_quan_ly` của CÁN BỘ, không phải theo đơn vị.
 */
export interface HomeTangLuongScope {
  kieu: 'all' | 'tinh' | 'xa_phuong';
  viewerDonViId: string | null;
}

/** Cửa sổ cảnh báo mặc định, khớp mức cảnh báo sớm nhất của module (90 ngày). */
export const HOME_TANG_LUONG_SO_NGAY = 90;

/**
 * Đếm phía máy chủ qua RPC `get_tang_luong_sap_den_han_count`.
 *
 * Kỳ nâng lương tiếp theo không nằm sẵn trong bảng mà phải suy ra (lần nâng gần
 * nhất của từng cán bộ + 3 năm). Làm phép đó ở trình duyệt nghĩa là kéo nguyên
 * bảng lịch sử mỗi lần mở Trang chủ, nên việc gom nhóm đặt ở Postgres.
 */
export async function getHomeTangLuongSapDenHan(
  scope: HomeTangLuongScope,
  soNgay: number = HOME_TANG_LUONG_SO_NGAY,
): Promise<HomeTangLuongSapDenHan> {
  const supabase = getSupabase();
  if (!supabase) return { total: 0, ngayGanNhat: null };

  const { data, error } = await supabase.rpc('get_tang_luong_sap_den_han_count', {
    p_so_ngay: soNgay,
    p_scope: scope.kieu,
    p_viewer_don_vi_id: scope.viewerDonViId != null ? Number(scope.viewerDonViId) : null,
  } as never);
  if (error) handleSupabaseError(error);

  const row = ((data ?? []) as unknown as Record<string, unknown>[])[0];
  const total = Number(row?.so_luong ?? 0);
  const ngay = row?.gan_nhat;
  return {
    total: Number.isFinite(total) ? total : 0,
    ngayGanNhat: ngay == null || ngay === '' ? null : String(ngay).slice(0, 10),
  };
}
