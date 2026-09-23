import { useMemo } from 'react';
import { useMttqThietLapAll } from '@/features/mat-tran-to-quoc/thiet-lap-cai-dat/hooks/use-mttq-thiet-lap';

export interface DanTocOption {
  value: string;
  label: string;
}

/**
 * Tuỳ chọn Dân tộc cho combobox và chip lọc.
 *
 * Nguồn là danh mục dùng chung `mttq_thiet_lap` (loai = 'dan_toc') — cùng danh
 * mục module Cán bộ đang dùng, cơ quan tự thêm/sửa trên màn Thiết lập MTTQ.
 * Không hard-code danh sách ở client: thêm một dân tộc sẽ phải sửa code và chạy
 * lại migration, mà danh mục còn lệch với module Cán bộ.
 *
 * `useMttqThietLapAll` dùng `masterDataQueryOptions` (cache dài) nên gọi ở nhiều
 * nơi cũng chỉ một request.
 */
export function useDanTocOptions(options?: { enabled?: boolean }): DanTocOption[] {
  const { data: all = [] } = useMttqThietLapAll({ enabled: options?.enabled !== false });

  return useMemo(
    () =>
      all
        .filter((r) => r.loai === 'dan_toc')
        .sort((a, b) => a.thu_tu - b.thu_tu || a.ten.localeCompare(b.ten, 'vi'))
        .map((r) => ({ value: String(r.id), label: r.ten })),
    [all],
  );
}
