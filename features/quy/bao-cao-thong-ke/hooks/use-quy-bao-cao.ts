import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import type { QuyKey, QuyLoai } from '../../core/constants';
import {
  getQuySoThuChiAllForExport,
  type QuySoThuChiPageQuery,
} from '../../so-thu-chi/services/quy-so-thu-chi-service';
import type { QuySoThuChiListRow } from '../../so-thu-chi/core/types';

export interface QuyBaoCaoParams {
  quy: QuyKey;
  tuNgay: string | null;
  denNgay: string | null;
  loai: QuyLoai | null;
  khoanIds: string[];
  taiKhoanIds: string[];
}

/**
 * Toàn bộ dòng sổ trong kỳ để dựng báo cáo.
 *
 * Báo cáo phải cộng trên **toàn bộ** tập, không phải một trang, nên ở đây kéo
 * hết bằng `fetchAllServerPages` theo từng lô 500. Bộ lọc (nhất là khoảng ngày)
 * được đẩy xuống máy chủ trước, nên lượng dữ liệu kéo về đã bị chặn ngay từ
 * đầu — xem `docs/supabase-egress.md`.
 */
export function useQuyBaoCaoRows(params: QuyBaoCaoParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.quySoThuChi.baoCao(params),
    queryFn: (): Promise<QuySoThuChiListRow[]> => {
      const q: Omit<QuySoThuChiPageQuery, 'page' | 'pageSize'> = {
        quy: params.quy,
        search: '',
        sort: { column: 'ngay_chung_tu', direction: 'asc' },
        loai: params.loai,
        khoanIds: params.khoanIds,
        taiKhoanIds: params.taiKhoanIds,
        tuNgay: params.tuNgay,
        denNgay: params.denNgay,
        columnSearch: null,
      };
      return getQuySoThuChiAllForExport(q);
    },
    enabled: options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}
