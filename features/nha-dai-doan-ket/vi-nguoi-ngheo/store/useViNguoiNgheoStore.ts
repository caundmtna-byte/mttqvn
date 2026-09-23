import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { ViNguoiNgheoFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'nam', label: txt('viNguoiNgheo.store.namCol'), visible: true, minWidth: 72, maxWidth: 96, order: 0 },
  { id: 'ho_ten_nguoi_nhan', label: txt('viNguoiNgheo.store.nguoiNhanCol'), visible: true, ...P.personName, order: 1 },
  { id: 'ten_xa_phuong', label: txt('viNguoiNgheo.store.xaPhuongCol'), visible: true, ...P.province, order: 2 },
  { id: 'linh_vuc_ho_tro', label: txt('viNguoiNgheo.store.linhVucCol'), visible: true, ...P.enumBadgeMedium, order: 3 },
  { id: 'hinh_thuc_ho_tro', label: txt('viNguoiNgheo.store.hinhThucCol'), visible: true, ...P.enumBadgeMedium, order: 4 },
  { id: 'so_tien', label: txt('viNguoiNgheo.store.soTienCol'), visible: true, minWidth: 120, maxWidth: 160, order: 5 },
  { id: 'trang_thai', label: txt('viNguoiNgheo.store.trangThaiCol'), visible: true, ...P.enumBadge, order: 6 },
  { id: 'ten_don_vi_ho_tro', label: txt('viNguoiNgheo.store.donViHoTroCol'), visible: true, minWidth: 160, maxWidth: 260, order: 7 },
  { id: 'noi_dung_ho_tro', label: txt('viNguoiNgheo.store.noiDungCol'), visible: false, minWidth: 200, maxWidth: 320, order: 8 },
  { id: 'khoi_xom', label: txt('viNguoiNgheo.store.khoiXomCol'), visible: false, minWidth: 110, maxWidth: 170, order: 9 },
  { id: 'doi_tuong', label: txt('viNguoiNgheo.store.doiTuongCol'), visible: false, ...P.enumBadgeShort, order: 10 },
  { id: 'nguon', label: txt('viNguoiNgheo.store.nguonCol'), visible: false, ...P.enumBadgeMedium, order: 11 },
  { id: 'nguon_ho_tro', label: txt('viNguoiNgheo.store.nguonHoTroCol'), visible: false, ...P.enumBadgeMedium, order: 12 },
  { id: 'ngay_cap_nhat_trang_thai', label: txt('viNguoiNgheo.store.ngayTrangThaiCol'), visible: false, ...P.date, order: 13 },
  { id: 'ghi_chu', label: txt('viNguoiNgheo.store.ghiChuCol'), visible: false, minWidth: 160, maxWidth: 280, order: 14 },
  { id: 'ho_va_ten_nguoi_tao', label: txt('viNguoiNgheo.store.nguoiTaoCol'), visible: false, ...P.personName, order: 15 },
  { id: 'tg_cap_nhat', label: txt('viNguoiNgheo.store.tgCapNhatCol'), visible: false, ...P.datetime, order: 16 },
  { id: 'actions', label: txt('common.actions'), visible: true, minWidth: 96, maxWidth: 120, order: 17 },
];

const initialFilters: ViNguoiNgheoFilters = {
  columnSearch: {},
  nam_filter: [],
  linh_vuc_filter: [],
  nguon_filter: [],
  nguon_ho_tro_filter: [],
  doi_tuong_filter: [],
  hinh_thuc_filter: [],
  trang_thai_filter: [],
  xa_phuong_filter: [],
};

export const useViNguoiNgheoStore = createGenericStore<ViNguoiNgheoFilters>(
  initialFilters,
  DEFAULT_COLUMNS,
);
