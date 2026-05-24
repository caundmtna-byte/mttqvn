import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { CongViecDanhSachFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'ten_cong_viec', label: txt('taskList.store.tenCol'), visible: true, ...P.titleShort, order: 0 },
  { id: 'ten_chuong_trinh', label: txt('taskList.store.chuongTrinhCol'), visible: true, minWidth: 120, maxWidth: 200, order: 1 },
  { id: 'muc_do', label: txt('taskList.store.mucDoCol'), visible: true, minWidth: 96, maxWidth: 120, order: 2 },
  { id: 'thoi_han', label: txt('taskList.store.thoiHanCol'), visible: true, minWidth: 108, maxWidth: 120, order: 3 },
  { id: 'tien_do', label: txt('taskList.store.tienDoCol'), visible: true, minWidth: 132, maxWidth: 220, order: 4 },
  { id: 'trang_thai', label: txt('taskList.store.trangThaiCol'), visible: true, minWidth: 120, maxWidth: 160, order: 5 },
  { id: 'ho_va_ten_trach_nhiem', label: txt('taskList.store.trachNhiemCol'), visible: true, minWidth: 120, maxWidth: 200, order: 6 },
  { id: 'ho_tro_display', label: txt('taskList.store.hoTroCol'), visible: true, minWidth: 120, maxWidth: 220, order: 7 },
  { id: 'ho_va_ten_nguoi_tao', label: txt('taskList.store.nguoiTaoCol'), visible: true, minWidth: 120, maxWidth: 200, order: 8 },
  { id: 'tg_cap_nhat', label: txt('taskList.store.tgCapNhatCol'), visible: true, ...P.datetime, order: 9 },
];

const initialFilters: CongViecDanhSachFilters = {
  columnSearch: {},
  trang_thai: [],
  muc_do: [],
  id_chuong_trinh: [],
};

export const useCongViecDanhSachStore = createGenericStore<CongViecDanhSachFilters>(initialFilters, DEFAULT_COLUMNS);
