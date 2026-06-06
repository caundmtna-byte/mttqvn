import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { BaiVietDanhSachFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'ten_bai', label: txt('articleList.store.nameCol'), visible: true, ...P.titleShort, order: 0 },
  { id: 'ten_the_loai', label: txt('articleList.store.theLoaiCol'), visible: true, minWidth: 120, maxWidth: 200, order: 1 },
  { id: 'don_gia', label: txt('articleList.store.donGiaCol'), visible: true, minWidth: 100, maxWidth: 140, order: 2 },
  { id: 'ngay_dang', label: txt('articleList.store.ngayDangCol'), visible: true, minWidth: 108, maxWidth: 120, order: 3 },
  { id: 'ten_nguon_dang', label: txt('articleList.store.nguonDangCol'), visible: true, minWidth: 120, maxWidth: 200, order: 4 },
  { id: 'ten_trang_dang', label: txt('articleList.store.trangDangCol'), visible: true, minWidth: 120, maxWidth: 200, order: 5 },
  { id: 'link', label: txt('articleList.store.linkCol'), visible: true, minWidth: 160, maxWidth: 320, order: 6 },
  { id: 'ho_va_ten_nguoi_tao', label: txt('articleList.store.nguoiTaoCol'), visible: true, minWidth: 120, maxWidth: 200, order: 7 },
  { id: 'tg_cap_nhat', label: txt('articleList.store.tgCapNhatCol'), visible: true, ...P.datetime, order: 8 },
];

const initialFilters: BaiVietDanhSachFilters = {
  columnSearch: {},
  id_the_loai: [],
  id_nguon_dang: [],
  id_trang_dang: [],
  id_nguoi_tao: [],
};

export const useBaiVietDanhSachStore = createGenericStore<BaiVietDanhSachFilters>(initialFilters, DEFAULT_COLUMNS);
