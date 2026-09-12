import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { NhaDaiDoanKetFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'nam', label: txt('nhaDaiDoanKet.store.namCol'), visible: true, minWidth: 72, maxWidth: 96, order: 0 },
  { id: 'ho_ten_chu_ho', label: txt('nhaDaiDoanKet.store.chuHoCol'), visible: true, ...P.personName, order: 1 },
  { id: 'ten_xa_phuong', label: txt('nhaDaiDoanKet.store.xaPhuongCol'), visible: true, ...P.province, order: 2 },
  { id: 'khoi_xom', label: txt('nhaDaiDoanKet.store.khoiXomCol'), visible: true, minWidth: 110, maxWidth: 170, order: 3 },
  { id: 'loai_hinh_ho_tro', label: txt('nhaDaiDoanKet.store.loaiHinhCol'), visible: true, ...P.enumBadgeMedium, order: 4 },
  { id: 'so_tien', label: txt('nhaDaiDoanKet.store.soTienCol'), visible: true, minWidth: 120, maxWidth: 160, order: 5 },
  { id: 'trang_thai', label: txt('nhaDaiDoanKet.store.trangThaiCol'), visible: true, ...P.enumBadge, order: 6 },
  { id: 'ngay_cap_nhat_trang_thai', label: txt('nhaDaiDoanKet.store.ngayTrangThaiCol'), visible: true, ...P.date, order: 7 },
  { id: 'noi_dung_ho_tro', label: txt('nhaDaiDoanKet.store.noiDungCol'), visible: false, minWidth: 200, maxWidth: 320, order: 8 },
  { id: 'nguon', label: txt('nhaDaiDoanKet.store.nguonCol'), visible: false, ...P.enumBadgeMedium, order: 9 },
  { id: 'nguon_ho_tro', label: txt('nhaDaiDoanKet.store.nguonHoTroCol'), visible: false, ...P.enumBadgeMedium, order: 10 },
  { id: 'doi_tuong', label: txt('nhaDaiDoanKet.store.doiTuongCol'), visible: false, ...P.enumBadgeShort, order: 11 },
  { id: 'ghi_chu', label: txt('nhaDaiDoanKet.store.ghiChuCol'), visible: false, minWidth: 160, maxWidth: 280, order: 12 },
  { id: 'ho_va_ten_nguoi_tao', label: txt('nhaDaiDoanKet.store.nguoiTaoCol'), visible: false, ...P.personName, order: 13 },
  { id: 'tg_cap_nhat', label: txt('nhaDaiDoanKet.store.tgCapNhatCol'), visible: false, ...P.datetime, order: 14 },
  { id: 'actions', label: txt('common.actions'), visible: true, minWidth: 96, maxWidth: 120, order: 15 },
];

const initialFilters: NhaDaiDoanKetFilters = {
  columnSearch: {},
  nam_filter: [],
  nguon_filter: [],
  nguon_ho_tro_filter: [],
  doi_tuong_filter: [],
  loai_hinh_filter: [],
  trang_thai_filter: [],
  xa_phuong_filter: [],
};

export const useNhaDaiDoanKetStore = createGenericStore<NhaDaiDoanKetFilters>(
  initialFilters,
  DEFAULT_COLUMNS,
);
