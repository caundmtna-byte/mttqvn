import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { ThucHienPhanBienFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'loai_hinh', label: txt('pbxhThucHien.store.loaiHinhCol'), visible: true, minWidth: 110, maxWidth: 150, order: 0 },
  { id: 'don_vi_thuc_hien', label: txt('pbxhThucHien.store.donViThucHienCol'), visible: true, minWidth: 120, maxWidth: 200, order: 1 },
  { id: 'noi_dung', label: txt('pbxhThucHien.store.noiDungCol'), visible: true, ...P.titleShort, minWidth: 200, maxWidth: 320, order: 2 },
  { id: 'tien_do', label: txt('pbxhThucHien.store.tienDoCol'), visible: true, minWidth: 120, maxWidth: 160, order: 3 },
  { id: 'tinh_trang', label: txt('pbxhThucHien.store.tinhTrangCol'), visible: true, minWidth: 120, maxWidth: 160, order: 4 },
  { id: 'ten_don_vi_chu_tri', label: txt('pbxhThucHien.store.donViChuTriCol'), visible: true, minWidth: 140, maxWidth: 220, order: 5 },
  { id: 'so_lan_hoan_thanh', label: txt('pbxhThucHien.store.soLanHoanThanhCol'), visible: true, minWidth: 88, maxWidth: 120, order: 6 },
  { id: 'so_lan_khao_sat', label: txt('pbxhThucHien.store.soLanKhaoSatCol'), visible: true, minWidth: 88, maxWidth: 120, order: 7 },
  { id: 'phan_tram_hoan_thanh', label: txt('pbxhThucHien.store.phanTramCol'), visible: true, minWidth: 80, maxWidth: 100, order: 8 },
  { id: 'cap_thuc_hien', label: txt('pbxhThucHien.store.capThucHienCol'), visible: false, minWidth: 100, maxWidth: 120, order: 9 },
  { id: 'ten_doi_tuong', label: txt('pbxhThucHien.store.doiTuongCol'), visible: false, minWidth: 140, maxWidth: 220, order: 10 },
  { id: 'ten_hinh_thuc', label: txt('pbxhThucHien.store.hinhThucCol'), visible: false, minWidth: 140, maxWidth: 220, order: 11 },
  { id: 'ngay_bat_dau', label: txt('pbxhThucHien.store.ngayBatDauCol'), visible: false, minWidth: 100, maxWidth: 120, order: 12 },
  { id: 'ngay_ket_thuc', label: txt('pbxhThucHien.store.ngayKetThucCol'), visible: false, minWidth: 100, maxWidth: 120, order: 13 },
  { id: 'mo_ta_thoi_gian', label: txt('pbxhThucHien.store.moTaThoiGianCol'), visible: false, minWidth: 120, maxWidth: 180, order: 14 },
  { id: 'ten_phong_ban', label: txt('pbxhThucHien.store.phongBanCol'), visible: false, minWidth: 140, maxWidth: 220, order: 15 },
  { id: 'ket_qua_kien_nghi', label: txt('pbxhThucHien.store.ketQuaCol'), visible: false, minWidth: 160, maxWidth: 280, order: 16 },
  { id: 'link_ket_qua', label: txt('pbxhThucHien.store.linkKetQuaCol'), visible: false, minWidth: 88, maxWidth: 120, order: 17 },
  { id: 'ho_va_ten_nguoi_tao', label: txt('pbxhThucHien.store.nguoiTaoCol'), visible: false, minWidth: 120, maxWidth: 200, order: 18 },
  { id: 'tg_cap_nhat', label: txt('pbxhThucHien.store.tgCapNhatCol'), visible: false, ...P.datetime, order: 19 },
  { id: 'actions', label: txt('common.actions'), visible: true, minWidth: 96, maxWidth: 120, order: 20 },
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
