
import { createGenericStore, ColumnConfig } from '../../../../store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '../../../../lib/table-column-presets';
import { EmployeeFilters } from '../core/types';
import { txt } from '../../../../lib/text';

const P = TABLE_COLUMN_PRESETS;

/**
 * Cột bảng nhân viên — min/max theo preset (`lib/table-column-presets.ts`).
 */
const DEFAULT_COLUMNS: ColumnConfig[] = [
  // ── Hiện mặc định ──
  { id: 'ma_nhan_vien', label: txt('employee.store.codeCol'), visible: true, ...P.code, order: 0 },
  { id: 'ho_ten', label: txt('employee.store.nameCol'), visible: true, ...P.personName, order: 1 },
  { id: 'so_dien_thoai', label: txt('employee.store.phoneCol'), visible: true, ...P.phone, order: 2 },
  { id: 'ten_chuc_vu', label: txt('employee.store.positionCol'), visible: true, ...P.titleShort, order: 3 },
  { id: 'ten_phong_ban', label: txt('employee.store.departmentCol'), visible: true, ...P.branch, order: 4 },
  { id: 'email', label: txt('employee.store.emailCol'), visible: true, ...P.email, order: 5 },
  { id: 'ngay_vao_lam', label: txt('employee.store.hireDateCol'), visible: true, ...P.date, order: 6 },
  { id: 'gioi_tinh', label: txt('employee.store.genderCol'), visible: true, ...P.enumBadgeShort, order: 7 },
  { id: 'trang_thai', label: txt('employee.store.statusCol'), visible: true, ...P.enumBadge, order: 8 },
  // ── Ẩn mặc định – chọn trong column chooser ──
  { id: 'ngay_sinh', label: txt('employee.store.birthDateCol'), visible: false, ...P.date, order: 9 },
  { id: 'ten_cap_bac', label: txt('employee.store.levelCol'), visible: false, minWidth: 100, maxWidth: 140, order: 10 },
  { id: 'loai_hop_dong', label: txt('employee.store.contractCol'), visible: false, ...P.enumBadgeMedium, order: 11 },
  { id: 'ten_chi_nhanh', label: txt('employee.store.branchCol'), visible: false, ...P.branch, order: 12 },
  { id: 'noi_lam_viec', label: txt('employee.store.workplaceCol'), visible: false, ...P.addressLine, order: 13 },
  { id: 'tinh_thanh', label: txt('employee.store.provinceCol'), visible: false, ...P.province, order: 14 },
  { id: 'trinh_do_hoc_van', label: txt('employee.store.educationCol'), visible: false, ...P.enumBadgeMedium, order: 15 },
  { id: 'cmnd_cccd', label: txt('employee.store.idCardCol'), visible: false, ...P.idCard, order: 16 },
  { id: 'created_at', label: txt('employee.store.createdCol'), visible: false, ...P.date, order: 17 },
];

const initialFilters: EmployeeFilters = {
  columnSearch: {},
  trang_thai: [],
  phong_ban_id: [],
  gender: [],
  position: [],
};

export const useEmployeeStore = createGenericStore<EmployeeFilters>(
  initialFilters,
  DEFAULT_COLUMNS
);
