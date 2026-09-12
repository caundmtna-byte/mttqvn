import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { geoDataQueryOptions } from '@/lib/supabase/query-config';
import { txt } from '@/lib/text';
import type { TinhThanh, XaPhuong } from '../core/types';
import type { TinhThanhFormValues, XaPhuongFormValues } from '../core/schema';
import {
  getTinhThanhList,
  getXaPhuongByTinhThanh,
  getXaPhuongAll,
  createTinhThanh,
  updateTinhThanh,
  deleteTinhThanhMany,
  createXaPhuong,
  updateXaPhuong,
  deleteXaPhuongMany,
  importTinhThanhRows,
  importXaPhuongRows,
} from '../services/dia-ban-service';

const tinhKey = queryKeys.tinhThanh.all;

export function useTinhThanhList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: tinhKey,
    queryFn: getTinhThanhList,
    enabled: options?.enabled !== false,
    // geoDataQueryOptions (24h): an toàn hơn Infinity khi dữ liệu tỉnh/thành
    // vẫn đang được bổ sung. Mutations vẫn invalidate cache ngay lập tức.
    ...geoDataQueryOptions,
  });
}

export function useXaPhuongByTinhThanh(idTinhThanh: string | null) {
  const id = idTinhThanh?.trim() ?? '';
  return useQuery({
    queryKey: queryKeys.xaPhuong.byTinh(id),
    queryFn: () => getXaPhuongByTinhThanh(id),
    enabled: id.length > 0,
    ...geoDataQueryOptions,
  });
}

/** Tab xã: `tinhFilterId` rỗng = tải toàn bộ; có id = theo tỉnh. */
export function useXaPhuongForTab(
  tabIsXa: boolean,
  tinhFilterId: string,
  options?: { enabled?: boolean },
) {
  const tid = tinhFilterId.trim();
  const allMode = tabIsXa && tid.length === 0;
  const oneMode = tabIsXa && tid.length > 0;
  const viewOk = options?.enabled !== false;
  return useQuery({
    queryKey: allMode ? queryKeys.xaPhuong.listAll : queryKeys.xaPhuong.byTinh(tid),
    queryFn: () => (allMode ? getXaPhuongAll() : getXaPhuongByTinhThanh(tid)),
    enabled: viewOk && (allMode || oneMode),
    ...geoDataQueryOptions,
  });
}

/* ------------------------------------------------------------------ *
 * Vá cache thay vì invalidate
 *
 * `geoDataQueryOptions` cố tình giữ dữ liệu địa giới 24h vì bảng xã/phường
 * ~10k dòng, kéo lại rất tốn egress (xem `docs/supabase-egress.md`).
 * Invalidate sau mỗi lần sửa 1 xã sẽ phá sạch công sức đó. Nên mọi mutation
 * vá thẳng cache theo id; chỉ khi KHÔNG suy ra được kết quả (không có bản ghi
 * cũ trong cache) mới invalidate làm lưới an toàn.
 * ------------------------------------------------------------------ */

type QueryClientRef = ReturnType<typeof useQueryClient>;

/** Phạm vi của một cache xã/phường, suy từ query key. */
export type XaCacheScope = { kind: 'all' } | { kind: 'tinh'; idTinhThanh: string };

/** Đọc phạm vi từ query key; `null` = key lạ, không đụng tới. */
export function readXaCacheScope(key: readonly unknown[]): XaCacheScope | null {
  if (!Array.isArray(key) || key[0] !== 'xa-phuong') return null;
  if (key.length === 2 && key[1] === 'list-all') return { kind: 'all' };
  if (key.length === 3 && key[1] === 'by-tinh' && typeof key[2] === 'string') {
    return { kind: 'tinh', idTinhThanh: key[2] };
  }
  return null;
}

/** Id là int8 của Supabase đưa về chuỗi — so sánh theo số khi cả hai là số. */
function compareId(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return a.localeCompare(b);
}

/**
 * Sắp lại đúng thứ tự mà truy vấn gốc trả về:
 * `listAll` theo (id_tinh_thanh, thu_tu), `byTinh` theo thu_tu. Khoá chính chốt cuối
 * để thứ tự ổn định khi trùng `thu_tu`.
 */
export function sortXaList(list: XaPhuong[], scope: XaCacheScope): XaPhuong[] {
  return [...list].sort((a, b) => {
    if (scope.kind === 'all') {
      const t = compareId(a.id_tinh_thanh, b.id_tinh_thanh);
      if (t !== 0) return t;
    }
    if (a.thu_tu !== b.thu_tu) return a.thu_tu - b.thu_tu;
    return compareId(a.id, b.id);
  });
}

/**
 * Đưa một bản ghi xã (mới tạo hoặc vừa sửa) vào một cache:
 * bỏ bản cũ cùng id ở mọi phạm vi, thêm lại nếu phạm vi còn khớp
 * (xã đổi tỉnh thì tự rời danh sách tỉnh cũ).
 */
export function applyXaRowToCache(
  list: XaPhuong[],
  row: XaPhuong,
  scope: XaCacheScope,
): XaPhuong[] {
  const rest = list.filter((r) => r.id !== row.id);
  const belongs = scope.kind === 'all' || scope.idTinhThanh === row.id_tinh_thanh;
  if (!belongs) return rest.length === list.length ? list : rest;
  return sortXaList([...rest, row], scope);
}

/** Bỏ các xã đã xóa khỏi một cache. */
export function removeXaRowsFromCache(list: XaPhuong[], ids: ReadonlySet<string>): XaPhuong[] {
  const next = list.filter((r) => !ids.has(r.id));
  return next.length === list.length ? list : next;
}

/** Cộng/trừ `so_xa_phuong` của danh sách tỉnh theo từng id (không âm). */
export function applyXaCountDelta(
  list: TinhThanh[],
  deltas: ReadonlyMap<string, number>,
): TinhThanh[] {
  if (deltas.size === 0) return list;
  return list.map((t) => {
    const d = deltas.get(t.id);
    if (!d) return t;
    return { ...t, so_xa_phuong: Math.max(0, (t.so_xa_phuong ?? 0) + d) };
  });
}

/** Thêm mới hoặc thay thế một tỉnh, giữ nguyên `so_xa_phuong` đang có. */
export function upsertTinhInList(list: TinhThanh[], row: TinhThanh): TinhThanh[] {
  const old = list.find((t) => t.id === row.id);
  const merged: TinhThanh = { ...row, so_xa_phuong: row.so_xa_phuong ?? old?.so_xa_phuong ?? 0 };
  const rest = list.filter((t) => t.id !== row.id);
  return [...rest, merged].sort((a, b) => {
    if (a.thu_tu !== b.thu_tu) return a.thu_tu - b.thu_tu;
    return compareId(a.id, b.id);
  });
}

/** Bỏ các tỉnh đã xóa. */
export function removeTinhFromList(list: TinhThanh[], ids: ReadonlySet<string>): TinhThanh[] {
  const next = list.filter((t) => !ids.has(t.id));
  return next.length === list.length ? list : next;
}

/** Duyệt mọi cache xã đang có và vá từng cái theo phạm vi của nó. */
function patchXaCaches(
  client: QueryClientRef,
  updater: (list: XaPhuong[], scope: XaCacheScope) => XaPhuong[],
) {
  const entries = client.getQueriesData<XaPhuong[]>({ queryKey: queryKeys.xaPhuong.all });
  for (const [key, data] of entries) {
    if (!Array.isArray(data)) continue;
    const scope = readXaCacheScope(key);
    if (!scope) continue;
    const next = updater(data, scope);
    if (next !== data) client.setQueryData(key, next);
  }
}

/** Tìm bản ghi xã trong bất kỳ cache nào — để biết tỉnh cũ trước khi sửa/xóa. */
function findXaInCaches(client: QueryClientRef, id: string): XaPhuong | null {
  const entries = client.getQueriesData<XaPhuong[]>({ queryKey: queryKeys.xaPhuong.all });
  for (const [, data] of entries) {
    if (!Array.isArray(data)) continue;
    const found = data.find((r) => r.id === id);
    if (found) return found;
  }
  return null;
}

function patchTinhCounts(client: QueryClientRef, deltas: ReadonlyMap<string, number>) {
  client.setQueryData<TinhThanh[]>(tinhKey, (cur) =>
    cur ? applyXaCountDelta(cur, deltas) : cur,
  );
}

function invalidateTinh(client: QueryClientRef) {
  void client.invalidateQueries({ queryKey: tinhKey });
}

export function useCreateTinhThanh(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTinhThanh,
    onSuccess: (created) => {
      queryClient.setQueryData<TinhThanh[]>(tinhKey, (cur) =>
        cur ? upsertTinhInList(cur, { ...created, so_xa_phuong: 0 }) : cur,
      );
      toast.success(txt('diaBan.toast.createTinhSuccess'));
      onSuccess?.();
    },
  });
}

export function useUpdateTinhThanh(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TinhThanhFormValues }) => updateTinhThanh(id, data),
    onSuccess: (updated) => {
      // `updateTinhThanh` không trả `so_xa_phuong` — `upsertTinhInList` giữ lại số cũ.
      queryClient.setQueryData<TinhThanh[]>(tinhKey, (cur) =>
        cur ? upsertTinhInList(cur, updated) : cur,
      );
      toast.success(txt('diaBan.toast.updateTinhSuccess'));
      onSuccess?.();
    },
  });
}

export function useDeleteTinhThanh() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteTinhThanhMany(ids),
    onSuccess: (_, ids) => {
      const idSet = new Set(ids);
      queryClient.setQueryData<TinhThanh[]>(tinhKey, (cur) =>
        cur ? removeTinhFromList(cur, idSet) : cur,
      );
      // Xóa tỉnh kéo theo xã: bỏ khỏi cache "toàn bộ", vứt hẳn cache theo từng tỉnh.
      patchXaCaches(queryClient, (list) => {
        const next = list.filter((r) => !idSet.has(r.id_tinh_thanh));
        return next.length === list.length ? list : next;
      });
      for (const id of ids) {
        void queryClient.removeQueries({ queryKey: queryKeys.xaPhuong.byTinh(id) });
      }
      toast.success(txt('diaBan.toast.deleteTinhSuccess', { count: ids.length }));
    },
  });
}

export function useCreateXaPhuong(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createXaPhuong,
    onSuccess: (created) => {
      patchXaCaches(queryClient, (list, scope) => applyXaRowToCache(list, created, scope));
      patchTinhCounts(queryClient, new Map([[created.id_tinh_thanh, 1]]));
      toast.success(txt('diaBan.toast.createXaSuccess'));
      onSuccess?.();
    },
  });
}

export function useUpdateXaPhuong(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: XaPhuongFormValues }) => updateXaPhuong(id, data),
    onSuccess: (updated, { id }) => {
      const before = findXaInCaches(queryClient, id);
      patchXaCaches(queryClient, (list, scope) => applyXaRowToCache(list, updated, scope));
      if (!before) {
        // Không có bản cũ trong cache ⇒ không suy được xã đã đổi tỉnh hay chưa: đành invalidate.
        invalidateTinh(queryClient);
      } else if (before.id_tinh_thanh !== updated.id_tinh_thanh) {
        patchTinhCounts(
          queryClient,
          new Map([
            [before.id_tinh_thanh, -1],
            [updated.id_tinh_thanh, 1],
          ]),
        );
      }
      toast.success(txt('diaBan.toast.updateXaSuccess'));
      onSuccess?.();
    },
  });
}

export function useDeleteXaPhuong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids }: { ids: string[] }) => deleteXaPhuongMany(ids),
    onSuccess: (_, { ids }) => {
      const removed = ids
        .map((id) => findXaInCaches(queryClient, id))
        .filter((r): r is XaPhuong => r !== null);
      const idSet = new Set(ids);
      patchXaCaches(queryClient, (list) => removeXaRowsFromCache(list, idSet));
      if (removed.length === ids.length) {
        const deltas = new Map<string, number>();
        for (const r of removed) {
          deltas.set(r.id_tinh_thanh, (deltas.get(r.id_tinh_thanh) ?? 0) - 1);
        }
        patchTinhCounts(queryClient, deltas);
      } else {
        // Thiếu bản ghi cũ ⇒ không biết trừ số xã của tỉnh nào: invalidate làm lưới an toàn.
        invalidateTinh(queryClient);
      }
      toast.success(txt('diaBan.toast.deleteXaSuccess', { count: ids.length }));
    },
  });
}

export function useImportTinhThanhRows(onDone?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importTinhThanhRows,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: tinhKey });
      if (result.created > 0) {
        toast.success(txt('diaBan.toast.importSuccess', { count: result.created }));
      }
      if (result.errors.length > 0) {
        toast.warning(result.errors.slice(0, 5).join('; '));
      }
      onDone?.();
    },
  });
}

export function useImportXaPhuongRows(onDone?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { rows: Record<string, unknown>[]; tinhList: TinhThanh[] }) =>
      importXaPhuongRows(args.rows, args.tinhList),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: tinhKey });
      void queryClient.invalidateQueries({ queryKey: queryKeys.xaPhuong.all });
      if (result.created > 0) {
        toast.success(txt('diaBan.toast.importSuccess', { count: result.created }));
      }
      if (result.errors.length > 0) {
        toast.warning(result.errors.slice(0, 5).join('; '));
      }
      onDone?.();
    },
  });
}
