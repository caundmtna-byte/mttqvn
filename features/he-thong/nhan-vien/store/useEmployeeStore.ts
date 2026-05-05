import { createGenericStore, ColumnConfig } from '../../../../store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '../../../../lib/table-column-presets';
import { EmployeeFilters } from '../core/types';
import { txt } from '../../../../lib/text';

const P = TABLE_COLUMN_PRESETS;

/**
 * Cột bảng nhân viên (8 trường nghiệp vụ — gộp ảnh + họ tên vào cột `ho_va_ten`).
 */
const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'ten_tai_khoan', label: txt('employee.store.usernameCol'), visible: true, ...P.code, order: 0 },
  { id: 'ho_va_ten', label: txt('employee.store.nameCol'), visible: true, ...P.personName, order: 1 },
  { id: 'ten_phong_ban', label: txt('employee.store.departmentCol'), visible: true, ...P.branch, order: 2 },
  { id: 'ten_bo_phan', label: txt('employee.store.unitCol'), visible: true, ...P.branch, order: 3 },
  { id: 'ten_chuc_vu', label: txt('employee.store.positionCol'), visible: true, ...P.titleShort, order: 4 },
  { id: 'trang_thai', label: txt('employee.store.statusCol'), visible: true, ...P.enumBadge, order: 5 },
];

const initialFilters: EmployeeFilters = {
  columnSearch: {},
  trang_thai: [],
  id_phong_ban: [],
  id_chuc_vu: [],
};

export const useEmployeeStore = createGenericStore<EmployeeFilters>(initialFilters, DEFAULT_COLUMNS);
