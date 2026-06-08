import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { ThucHienPhanBienFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'loai_hinh', label: txt('pbxhThucHien.store.loaiHinhCol'), visible: true, minWidth: 110, maxWidth: 150, order: 0 },
  { id: 'noi_dung', label: txt('pbxhThucHien.store.noiDungCol'), visible: true, ...P.titleShort, minWidth: 200, maxWidth: 320, order: 1 },
  { id: 'tien_do', label: txt('pbxhThucHien.store.tienDoCol'), visible: true, minWidth: 120, maxWidth: 160, order: 2 },
  { id: 'tinh_trang', label: txt('pbxhThucHien.store.tinhTrangCol'), visible: true, minWidth: 120, maxWidth: 160, order: 3 },
  { id: 'ten_don_vi_chu_tri', label: txt('pbxhThucHien.store.donViChuTriCol'), visible: true, minWidth: 140, maxWidth: 220, order: 4 },
  { id: 'phan_tram_hoan_thanh', label: txt('pbxhThucHien.store.phanTramCol'), visible: true, minWidth: 80, maxWidth: 100, order: 5 },
  { id: 'cap_thuc_hien', label: txt('pbxhThucHien.store.capThucHienCol'), visible: false, minWidth: 100, maxWidth: 120, order: 6 },
  { id: 'ten_doi_tuong', label: txt('pbxhThucHien.store.doiTuongCol'), visible: false, minWidth: 140, maxWidth: 220, order: 7 },
  { id: 'tg_cap_nhat', label: txt('pbxhThucHien.store.tgCapNhatCol'), visible: false, ...P.datetime, order: 8 },
  { id: 'actions', label: txt('common.actions'), visible: true, minWidth: 96, maxWidth: 120, order: 9 },
];

const initialFilters: ThucHienPhanBienFilters = {
  columnSearch: {},
  cap_thuc_hien_filter: [],
  loai_hinh_filter: [],
  tinh_trang_filter: [],
  don_vi_chu_tri_filter: [],
};

export const useThucHienPhanBienStore = createGenericStore<ThucHienPhanBienFilters>(
  initialFilters,
  DEFAULT_COLUMNS,
);
