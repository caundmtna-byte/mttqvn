import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { MttqKhenThuongChiTietListFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: 'so_qd',
    label: txt('matTranKhenThuong.store.soQdCol'),
    visible: true,
    ...P.titleShort,
    minWidth: 160,
    maxWidth: 280,
    order: 0,
  },
  {
    id: 'ngay_khen_thuong',
    label: txt('matTranKhenThuong.store.ngayCol'),
    visible: true,
    minWidth: 108,
    maxWidth: 120,
    order: 1,
  },
  {
    id: 'trang_thai',
    label: txt('matTranKhenThuong.store.trangThaiCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 160,
    order: 2,
  },
  {
    id: 'don_vi_de_xuat',
    label: txt('matTranKhenThuong.store.donViCol'),
    visible: true,
    minWidth: 140,
    maxWidth: 220,
    order: 3,
  },
  {
    id: 'ten_can_bo',
    label: txt('matTranKhenThuong.chiTietList.cols.tenCanBo'),
    visible: true,
    minWidth: 140,
    maxWidth: 220,
    order: 4,
  },
  {
    id: 'cap_khen_thuong',
    label: txt('matTranKhenThuong.form.capKhenThuong'),
    visible: true,
    minWidth: 112,
    maxWidth: 140,
    order: 5,
  },
  {
    id: 'hinh_thuc_khen',
    label: txt('matTranKhenThuong.form.hinhThuc'),
    visible: true,
    minWidth: 120,
    maxWidth: 160,
    order: 6,
  },
  {
    id: 'danh_hieu',
    label: txt('matTranKhenThuong.form.danhHieu'),
    visible: true,
    minWidth: 120,
    maxWidth: 160,
    order: 7,
  },
  {
    id: 'noi_dung_khen',
    label: txt('matTranKhenThuong.form.noiDung'),
    visible: true,
    minWidth: 160,
    maxWidth: 280,
    order: 8,
  },
  {
    id: 'ho_so_khen',
    label: txt('matTranKhenThuong.form.hoSo'),
    visible: false,
    minWidth: 120,
    maxWidth: 200,
    order: 9,
  },
  {
    id: 'tg_cap_nhat_qd',
    label: txt('matTranKhenThuong.chiTietList.cols.tgCapNhatQd'),
    visible: false,
    ...P.datetime,
    order: 10,
  },
];

const initialFilters: MttqKhenThuongChiTietListFilters = {
  columnSearch: {},
  trang_thai: [],
  nam_khen_thuong: [],
  don_vi_de_xuat: [],
  hinh_thuc_khen: [],
  danh_hieu: [],
  id_phong_ban_nguoi_tao: [],
};

export const useMttqKhenThuongChiTietListStore = createGenericStore<MttqKhenThuongChiTietListFilters>(
  initialFilters,
  DEFAULT_COLUMNS,
);
