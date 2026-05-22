import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { KhoDanhMucHangHoaFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'thu_tu', label: txt('matTranHangHoa.store.thuTu'), visible: true, minWidth: 72, maxWidth: 88, order: 0 },
  { id: 'ten_danh_muc', label: txt('matTranHangHoa.store.tenDanhMuc'), visible: true, ...P.titleShort, order: 1 },
  { id: 'mo_ta', label: txt('matTranHangHoa.store.moTa'), visible: true, minWidth: 140, maxWidth: 320, order: 2 },
  { id: 'trang_thai', label: txt('matTranHangHoa.store.trangThai'), visible: true, minWidth: 120, maxWidth: 180, order: 3 },
  { id: 'tg_tao', label: txt('matTranHangHoa.store.tgTao'), visible: false, ...P.datetime, order: 4 },
  { id: 'tg_cap_nhat', label: txt('matTranHangHoa.store.tgCapNhat'), visible: true, ...P.datetime, order: 5 },
  { id: 'actions', label: txt('common.actions'), visible: true, minWidth: 96, maxWidth: 120, order: 6 },
];

const initialFilters: KhoDanhMucHangHoaFilters = { columnSearch: {}, mo_ta_bucket: '' };

export const useKhoDanhMucHangHoaStore = createGenericStore<KhoDanhMucHangHoaFilters>(initialFilters, DEFAULT_COLUMNS);
