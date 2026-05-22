import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { KhoDanhSachHangHoaFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'ten_danh_muc_nhom', label: txt('matTranHangHoa.store.tenNhom'), visible: true, minWidth: 120, maxWidth: 200, order: 0 },
  { id: 'ten_hang_hoa', label: txt('matTranHangHoa.store.tenHangHoa'), visible: true, ...P.titleShort, order: 1 },
  { id: 'don_vi_tinh', label: txt('matTranHangHoa.store.donViTinh'), visible: true, minWidth: 88, maxWidth: 120, order: 2 },
  { id: 'quy_cach', label: txt('matTranHangHoa.store.quyCach'), visible: true, minWidth: 100, maxWidth: 200, order: 3 },
  { id: 'mo_ta', label: txt('matTranHangHoa.store.moTa'), visible: true, minWidth: 120, maxWidth: 280, order: 4 },
  { id: 'thu_tu', label: txt('matTranHangHoa.store.thuTu'), visible: true, minWidth: 72, maxWidth: 88, order: 5 },
  { id: 'trang_thai', label: txt('matTranHangHoa.store.trangThai'), visible: true, minWidth: 120, maxWidth: 180, order: 6 },
  { id: 'tg_cap_nhat', label: txt('matTranHangHoa.store.tgCapNhat'), visible: false, ...P.datetime, order: 7 },
  { id: 'actions', label: txt('common.actions'), visible: true, minWidth: 96, maxWidth: 120, order: 8 },
];

const initialFilters: KhoDanhSachHangHoaFilters = { columnSearch: {}, mo_ta_bucket: '', id_danh_muc: '' };

export const useKhoDanhSachHangHoaStore = createGenericStore<KhoDanhSachHangHoaFilters>(initialFilters, DEFAULT_COLUMNS);
