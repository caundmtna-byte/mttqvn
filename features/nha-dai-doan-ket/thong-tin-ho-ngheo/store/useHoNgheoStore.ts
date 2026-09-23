import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { HoNgheoFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'ho_ten_dai_dien', label: txt('hoNgheo.store.hoTenCol'), visible: true, ...P.personName, order: 0 },
  { id: 'so_cccd', label: txt('hoNgheo.store.soCccdCol'), visible: true, ...P.idCard, order: 1 },
  { id: 'ten_xa_phuong', label: txt('hoNgheo.store.xaPhuongCol'), visible: true, ...P.province, order: 2 },
  { id: 'khoi_xom', label: txt('hoNgheo.store.khoiXomCol'), visible: true, minWidth: 110, maxWidth: 170, order: 3 },
  { id: 'doi_tuong', label: txt('hoNgheo.store.doiTuongCol'), visible: true, ...P.enumBadgeShort, order: 4 },
  { id: 'dien_thoai', label: txt('hoNgheo.store.dienThoaiCol'), visible: true, ...P.phone, order: 5 },
  { id: 'ten_dan_toc', label: txt('hoNgheo.store.danTocCol'), visible: true, minWidth: 100, maxWidth: 140, order: 6 },
  { id: 'ton_giao', label: txt('hoNgheo.store.tonGiaoCol'), visible: false, ...P.enumBadgeShort, order: 7 },
  { id: 'so_tai_khoan', label: txt('hoNgheo.store.soTaiKhoanCol'), visible: false, minWidth: 130, maxWidth: 180, order: 8 },
  { id: 'ngan_hang', label: txt('hoNgheo.store.nganHangCol'), visible: false, minWidth: 120, maxWidth: 180, order: 9 },
  { id: 'trang_thai', label: txt('hoNgheo.store.trangThaiCol'), visible: true, ...P.enumBadge, order: 10 },
  { id: 'ngay_cap_nhat_trang_thai', label: txt('hoNgheo.store.ngayTrangThaiCol'), visible: true, ...P.date, order: 11 },
  { id: 'ghi_chu', label: txt('hoNgheo.store.ghiChuCol'), visible: false, minWidth: 160, maxWidth: 280, order: 12 },
  { id: 'ho_va_ten_nguoi_tao', label: txt('hoNgheo.store.nguoiTaoCol'), visible: false, ...P.personName, order: 13 },
  { id: 'tg_cap_nhat', label: txt('hoNgheo.store.tgCapNhatCol'), visible: false, ...P.datetime, order: 14 },
  { id: 'actions', label: txt('common.actions'), visible: true, minWidth: 96, maxWidth: 120, order: 15 },
];

const initialFilters: HoNgheoFilters = {
  columnSearch: {},
  doi_tuong_filter: [],
  ton_giao_filter: [],
  trang_thai_filter: [],
  dan_toc_filter: [],
  xa_phuong_filter: [],
};

export const useHoNgheoStore = createGenericStore<HoNgheoFilters>(initialFilters, DEFAULT_COLUMNS);
