import { createGenericStore, ColumnConfig } from '../../../../store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '../../../../lib/table-column-presets';
import type { PositionFilters } from '../core/types';
import { txt } from '../../../../lib/text';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'thu_tu', label: txt('position.store.orderCol'), visible: true, minWidth: 72, maxWidth: 96, order: 0 },
  { id: 'ten_chuc_vu', label: txt('position.store.nameCol'), visible: true, ...P.titleShort, order: 1 },
  { id: 'ten_cap_bac', label: txt('position.store.levelCol'), visible: true, minWidth: 100, maxWidth: 160, order: 2 },
  /** Ẩn mặc định: tên phòng hiển thị trong cột chức vụ (nhóm + dòng phụ). */
  { id: 'ten_phong_ban', label: txt('position.store.deptCol'), visible: false, ...P.branch, order: 3 },
  { id: 'mo_ta', label: txt('position.store.descCol'), visible: true, minWidth: 160, maxWidth: 400, order: 4 },
  { id: 'trang_thai', label: txt('position.store.statusCol'), visible: true, ...P.enumBadge, order: 5 },
  { id: 'tg_cap_nhat', label: txt('position.store.updatedCol'), visible: true, ...P.datetime, order: 6 },
];

const initialFilters: PositionFilters = {
  status: [],
  phong_ban_id: [],
  columnSearch: {},
};

export const usePositionStore = createGenericStore<PositionFilters>(
  initialFilters,
  DEFAULT_COLUMNS
);
