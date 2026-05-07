import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';

const P = TABLE_COLUMN_PRESETS;

/** '' = tất cả; `has` = đã có ít nhất 1 xã; `none` = chưa có xã (0 hoặc chưa gắn). */
export type SoXaPhuongFilterMode = '' | 'has' | 'none';

export interface TinhThanhListFilters {
  columnSearch: Record<string, string>;
  so_xa_bucket: SoXaPhuongFilterMode;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'thu_tu', label: txt('diaBan.store.orderCol'), visible: true, ...P.enumBadgeShort, order: 0 },
  { id: 'ten', label: txt('diaBan.store.nameCol'), visible: true, ...P.titleShort, order: 1 },
  { id: 'so_xa_phuong', label: txt('diaBan.store.soXaPhuongCol'), visible: true, ...P.code, order: 2 },
  { id: 'tg_tao', label: txt('diaBan.store.createdCol'), visible: true, ...P.datetime, order: 3 },
  { id: 'tg_cap_nhat', label: txt('diaBan.store.updatedCol'), visible: true, ...P.datetime, order: 4 },
];

const initialFilters: TinhThanhListFilters = {
  columnSearch: {},
  so_xa_bucket: '',
};

export const useTinhThanhStore = createGenericStore<TinhThanhListFilters>(
  initialFilters,
  DEFAULT_COLUMNS,
);
