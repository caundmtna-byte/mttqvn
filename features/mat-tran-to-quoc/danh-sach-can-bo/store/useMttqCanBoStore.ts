import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { MttqCanBoFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'ho_ten', label: txt('matTranCanBo.store.hoTenCol'), visible: true, ...P.titleShort, order: 0 },
  { id: 'ngay_sinh', label: txt('matTranCanBo.store.ngaySinhCol'), visible: true, minWidth: 108, maxWidth: 120, order: 1 },
  { id: 'tuoi', label: txt('matTranCanBo.store.tuoiCol'), visible: true, minWidth: 56, maxWidth: 72, order: 2 },
  { id: 'gioi_tinh', label: txt('matTranCanBo.store.gioiTinhCol'), visible: true, minWidth: 80, maxWidth: 100, order: 3 },
  { id: 'ten_trang_thai', label: txt('matTranCanBo.store.trangThaiCol'), visible: true, minWidth: 100, maxWidth: 140, order: 4 },
  { id: 'ten_chuc_vu', label: txt('matTranCanBo.store.chucVuCol'), visible: true, minWidth: 100, maxWidth: 160, order: 5 },
  { id: 'ten_to_chuc', label: txt('matTranCanBo.store.toChucCol'), visible: true, minWidth: 120, maxWidth: 200, order: 6 },
  { id: 'dien_thoai', label: txt('matTranCanBo.store.dienThoaiCol'), visible: true, minWidth: 108, maxWidth: 132, order: 7 },
  { id: 'dang_vien', label: txt('matTranCanBo.store.dangVienCol'), visible: false, minWidth: 88, maxWidth: 108, order: 8 },
  { id: 'ten_cap_quan_ly', label: txt('matTranCanBo.store.capQuanLyCol'), visible: false, minWidth: 120, maxWidth: 180, order: 9 },
  { id: 'tg_cap_nhat', label: txt('matTranCanBo.store.tgCapNhatCol'), visible: false, ...P.datetime, order: 10 },
];

const initialFilters: MttqCanBoFilters = {
  columnSearch: {},
  trang_thai_id: [],
  gioi_tinh: [],
};

export const useMttqCanBoStore = createGenericStore<MttqCanBoFilters>(initialFilters, DEFAULT_COLUMNS);
