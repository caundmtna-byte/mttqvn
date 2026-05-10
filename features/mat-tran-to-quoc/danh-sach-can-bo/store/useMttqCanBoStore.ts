import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { MttqCanBoFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'ho_ten', label: txt('matTranCanBo.store.hoTenCol'), visible: true, ...P.titleShort, order: 0 },
  { id: 'ngay_sinh', label: txt('matTranCanBo.store.ngaySinhCol'), visible: true, minWidth: 118, maxWidth: 132, order: 1 },
  { id: 'tuoi', label: txt('matTranCanBo.store.tuoiCol'), visible: true, minWidth: 96, maxWidth: 120, order: 2 },
  { id: 'gioi_tinh', label: txt('matTranCanBo.store.gioiTinhCol'), visible: true, minWidth: 80, maxWidth: 100, order: 3 },
  { id: 'ten_trang_thai', label: txt('matTranCanBo.store.trangThaiCol'), visible: true, minWidth: 100, maxWidth: 140, order: 4 },
  { id: 'ten_to_chuc', label: txt('matTranCanBo.store.toChucCol'), visible: true, minWidth: 120, maxWidth: 200, order: 5 },
  { id: 'ten_phong_ban', label: txt('matTranCanBo.store.phongBanCol'), visible: true, minWidth: 120, maxWidth: 200, order: 6 },
  { id: 'ten_chuc_vu', label: txt('matTranCanBo.store.chucVuCol'), visible: true, minWidth: 100, maxWidth: 160, order: 7 },
  {
    id: 'chuc_vu_cap_quan_ly',
    label: txt('matTranCanBo.store.capQuanLyCol'),
    visible: true,
    minWidth: 96,
    maxWidth: 120,
    order: 8,
  },
  { id: 'ten_don_vi', label: txt('matTranCanBo.store.donViCol'), visible: true, minWidth: 140, maxWidth: 220, order: 9 },
  { id: 'dien_thoai', label: txt('matTranCanBo.store.dienThoaiCol'), visible: true, minWidth: 108, maxWidth: 132, order: 10 },
  { id: 'dang_vien', label: txt('matTranCanBo.store.dangVienCol'), visible: false, minWidth: 88, maxWidth: 108, order: 11 },
  { id: 'ten_dan_toc', label: txt('matTranCanBo.form.danToc'), visible: false, minWidth: 100, maxWidth: 140, order: 12 },
  { id: 'ten_trinh_do', label: txt('matTranCanBo.form.trinhDo'), visible: false, minWidth: 100, maxWidth: 160, order: 13 },
  { id: 'ten_ly_luan_chinh_tri', label: txt('matTranCanBo.form.lyLuanChinhTri'), visible: false, minWidth: 120, maxWidth: 200, order: 14 },
  { id: 'tg_cap_nhat', label: txt('matTranCanBo.store.tgCapNhatCol'), visible: false, ...P.datetime, order: 15 },
];

const initialFilters: MttqCanBoFilters = {
  columnSearch: {},
  trang_thai_id: [],
  gioi_tinh: [],
  to_chuc_id: [],
  phong_ban_id: [],
  chuc_vu_id: [],
  chuc_vu_cap_quan_ly: [],
  don_vi_id: [],
  dan_toc_id: [],
  dang_vien: [],
  trinh_do_id: [],
  ly_luan_chinh_tri_id: [],
};

export const useMttqCanBoStore = createGenericStore<MttqCanBoFilters>(initialFilters, DEFAULT_COLUMNS);
