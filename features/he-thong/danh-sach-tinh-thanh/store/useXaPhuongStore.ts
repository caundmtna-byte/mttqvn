import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';

const P = TABLE_COLUMN_PRESETS;

export interface XaPhuongListFilters {
  columnSearch: Record<string, string>;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'thu_tu', label: txt('diaBan.store.orderCol'), visible: true, ...P.enumBadgeShort, order: 0 },
  { id: 'ten', label: txt('diaBan.store.nameCol'), visible: true, ...P.titleShort, order: 1 },
  { id: 'tg_tao', label: txt('diaBan.store.createdCol'), visible: true, ...P.datetime, order: 2 },
  { id: 'tg_cap_nhat', label: txt('diaBan.store.updatedCol'), visible: true, ...P.datetime, order: 3 },
];

const initialFilters: XaPhuongListFilters = {
  columnSearch: {},
};

export const useXaPhuongStore = createGenericStore<XaPhuongListFilters>(
  initialFilters,
  DEFAULT_COLUMNS,
);
