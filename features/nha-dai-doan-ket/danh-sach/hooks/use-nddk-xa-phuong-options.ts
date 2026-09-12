import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { geoDataQueryOptions } from '@/lib/supabase/query-config';
import { getXaPhuongAll } from '@/features/he-thong/danh-sach-tinh-thanh/services/dia-ban-service';
import { useTinhThanhList } from '@/features/he-thong/danh-sach-tinh-thanh/hooks/use-dia-ban';

export interface NddkXaPhuongOption {
  value: string;
  label: string;
  subLabel?: string;
}

/**
 * Tuỳ chọn xã/phường cho combobox và chip lọc.
 *
 * Dùng `getXaPhuongAll` (cache RAM + localStorage, TTL 24h) chứ không truy vấn
 * riêng cho module này — xem `docs/supabase-egress.md`.
 *
 * `scopedToXaPhuongId` khác null ⇒ chỉ còn đúng xã của người đang thao tác:
 * cán bộ cấp xã không được gán hồ sơ sang xã khác.
 */
export function useNddkXaPhuongOptions(scopedToXaPhuongId?: string | null): NddkXaPhuongOption[] {
  const { data: xaPhuongAll = [] } = useQuery({
    queryKey: queryKeys.xaPhuong.listAll,
    queryFn: getXaPhuongAll,
    ...geoDataQueryOptions,
  });
  const { data: tinhList = [] } = useTinhThanhList();

  const tinhById = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tinhList) m.set(t.id, t.ten);
    return m;
  }, [tinhList]);

  return useMemo(() => {
    const rows = [...xaPhuongAll].sort((a, b) => {
      const ta = tinhById.get(a.id_tinh_thanh) ?? '';
      const tb = tinhById.get(b.id_tinh_thanh) ?? '';
      if (ta !== tb) return ta.localeCompare(tb, 'vi');
      return a.ten.localeCompare(b.ten, 'vi');
    });
    const options = rows.map((x) => ({
      value: String(x.id),
      label: x.ten,
      subLabel: tinhById.get(x.id_tinh_thanh),
    }));
    const scoped = scopedToXaPhuongId?.toString().trim();
    if (scoped) return options.filter((o) => o.value === scoped);
    return options;
  }, [xaPhuongAll, tinhById, scopedToXaPhuongId]);
}
