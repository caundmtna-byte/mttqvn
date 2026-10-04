import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { HnghNhanHoTroFilters } from '../core/nhan-ho-tro';

const P = TABLE_COLUMN_PRESETS;
const L = (k: string) => txt(`hoNgheoNhanHoTro.col.${k}`);
const TIEN = { minWidth: 120, maxWidth: 160 };

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'ho_ten_dai_dien', label: L('hoTen'), visible: true, ...P.personName, order: 0 },
  { id: 'so_cccd', label: L('soCccd'), visible: false, minWidth: 120, maxWidth: 150, order: 1 },
  { id: 'ten_xa_phuong', label: L('xaPhuong'), visible: true, ...P.province, order: 2 },
  { id: 'khoi_xom', label: L('khoiXom'), visible: true, minWidth: 100, maxWidth: 160, order: 3 },
  { id: 'doi_tuong', label: L('doiTuong'), visible: true, ...P.enumBadgeShort, order: 4 },
  { id: 'vnn_tien', label: L('vnnTien'), visible: true, ...TIEN, order: 5 },
  { id: 'vnn_hien_vat', label: L('vnnHienVat'), visible: true, ...TIEN, order: 6 },
  { id: 'vnn_so_khoan', label: L('vnnSoKhoan'), visible: false, minWidth: 80, maxWidth: 100, order: 7 },
  { id: 'nddk_tien', label: L('nddkTien'), visible: true, ...TIEN, order: 8 },
  { id: 'nddk_so_can', label: L('nddkSoCan'), visible: false, minWidth: 80, maxWidth: 100, order: 9 },
  { id: 'kho_gia_tri', label: L('khoGiaTri'), visible: true, ...TIEN, order: 10 },
  { id: 'kho_so_phieu', label: L('khoSoPhieu'), visible: false, minWidth: 80, maxWidth: 100, order: 11 },
  { id: 'tong_gia_tri', label: L('tong'), visible: true, minWidth: 130, maxWidth: 170, order: 12 },
];

const initialFilters: HnghNhanHoTroFilters = {
  columnSearch: {},
  nam_filter: [],
  xa_phuong_filter: [],
  doi_tuong_filter: [],
  pham_vi: 'da_nhan',
};

export const useHnghNhanHoTroStore = createGenericStore<HnghNhanHoTroFilters>(initialFilters, DEFAULT_COLUMNS);
