import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { KhenThuongNhaTaiTroFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;
const L = (k: string) => txt(`khenThuongNhaTaiTro.store.${k}`);

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'ngay_khen', label: L('ngayKhenCol'), visible: true, ...P.date, order: 0 },
  { id: 'ten_nha_tai_tro', label: L('nhaTaiTroCol'), visible: true, minWidth: 180, maxWidth: 280, order: 1 },
  { id: 'noi_dung_khen', label: L('noiDungCol'), visible: true, minWidth: 220, maxWidth: 360, order: 2 },
  { id: 'cap_khen', label: L('capKhenCol'), visible: true, ...P.enumBadgeShort, order: 3 },
  { id: 'don_vi_khen', label: L('donViKhenCol'), visible: true, minWidth: 160, maxWidth: 260, order: 4 },
  { id: 'so_nguoi_duoc_ho_tro', label: L('soNguoiCol'), visible: true, minWidth: 100, maxWidth: 140, order: 5 },
  { id: 'tong_gia_tri', label: L('tongGiaTriCol'), visible: true, minWidth: 130, maxWidth: 170, order: 6 },
  { id: 'trang_thai', label: L('trangThaiCol'), visible: true, ...P.enumBadge, order: 7 },
  { id: 'so_quyet_dinh', label: L('soQuyetDinhCol'), visible: false, minWidth: 110, maxWidth: 170, order: 8 },
  { id: 'ten_xa_phuong', label: L('xaPhuongCol'), visible: false, ...P.province, order: 9 },
  { id: 'loai_nha_tai_tro', label: L('loaiNhaTaiTroCol'), visible: false, ...P.enumBadgeMedium, order: 10 },
  { id: 'so_khoan_ho_tro', label: L('soKhoanCol'), visible: false, minWidth: 100, maxWidth: 140, order: 11 },
  { id: 'tong_tien_ho_tro', label: L('tongTienHoTroCol'), visible: false, minWidth: 130, maxWidth: 170, order: 12 },
  { id: 'ngay_cap_nhat_trang_thai', label: L('ngayTrangThaiCol'), visible: false, ...P.date, order: 13 },
  { id: 'ho_va_ten_nguoi_duyet', label: L('nguoiDuyetCol'), visible: false, ...P.personName, order: 14 },
  { id: 'ghi_chu', label: L('ghiChuCol'), visible: false, minWidth: 160, maxWidth: 280, order: 15 },
  { id: 'ho_va_ten_nguoi_tao', label: L('nguoiTaoCol'), visible: false, ...P.personName, order: 16 },
  { id: 'tg_cap_nhat', label: L('tgCapNhatCol'), visible: false, ...P.datetime, order: 17 },
  { id: 'actions', label: txt('common.actions'), visible: true, minWidth: 96, maxWidth: 120, order: 18 },
];

const initialFilters: KhenThuongNhaTaiTroFilters = {
  columnSearch: {},
  nam_filter: [],
  cap_khen_filter: [],
  trang_thai_filter: [],
  xa_phuong_filter: [],
  loai_nha_tai_tro_filter: [],
  nha_tai_tro_filter: [],
};

export const useKhenThuongNhaTaiTroStore = createGenericStore<KhenThuongNhaTaiTroFilters>(
  initialFilters,
  DEFAULT_COLUMNS,
);
