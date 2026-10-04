import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { TiepNhanFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;
const L = (k: string) => txt(`matTranTiepNhan.store.${k}`);

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'so_phieu', label: L('soPhieuCol'), visible: true, minWidth: 120, maxWidth: 150, order: 0 },
  { id: 'ngay_tiep_nhan', label: L('ngayCol'), visible: true, ...P.date, order: 1 },
  { id: 'ten_nha_tai_tro', label: L('nhaTaiTroCol'), visible: true, minWidth: 180, maxWidth: 300, order: 2 },
  { id: 'ten_chuong_trinh', label: L('chuongTrinhCol'), visible: true, minWidth: 180, maxWidth: 300, order: 3 },
  { id: 'ten_don_vi_tiep_nhan', label: L('donViTiepNhanCol'), visible: false, minWidth: 140, maxWidth: 220, order: 4 },
  { id: 'hinh_thuc', label: L('hinhThucCol'), visible: true, ...P.enumBadgeMedium, order: 5 },
  { id: 'so_tien', label: L('soTienCol'), visible: true, minWidth: 120, maxWidth: 160, order: 6 },
  { id: 'gia_tri_phieu_kho', label: L('phieuKhoCol'), visible: true, minWidth: 120, maxWidth: 160, order: 7 },
  { id: 'tong_gia_tri', label: L('tongGiaTriCol'), visible: true, minWidth: 130, maxWidth: 170, order: 8 },
  { id: 'trang_thai', label: L('trangThaiCol'), visible: true, ...P.enumBadge, order: 9 },
  { id: 'ghi_chu', label: L('ghiChuCol'), visible: false, minWidth: 160, maxWidth: 280, order: 10 },
  { id: 'ho_va_ten_nguoi_tao', label: L('nguoiTaoCol'), visible: false, ...P.personName, order: 11 },
  { id: 'tg_cap_nhat', label: L('tgCapNhatCol'), visible: false, ...P.datetime, order: 12 },
  { id: 'actions', label: txt('common.actions'), visible: true, minWidth: 96, maxWidth: 120, order: 13 },
];

const initialFilters: TiepNhanFilters = {
  columnSearch: {},
  trang_thai_filter: [],
  hinh_thuc_filter: [],
  chuong_trinh_filter: [],
  nha_tai_tro_filter: [],
};

export const useTiepNhanStore = createGenericStore<TiepNhanFilters>(initialFilters, DEFAULT_COLUMNS);
