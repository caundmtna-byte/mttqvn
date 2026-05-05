/**
 * Mock Data - Hệ thống (Phòng ban, Chức vụ, Cấp bậc, Nhân viên)
 * Dữ liệu có liên kết chặt chẽ với nhau
 */

import { Department } from '../features/he-thong/phong-ban/core/types';
import type { Branch } from '../features/he-thong/chi-nhanh/core/types';
import { Employee } from '../features/he-thong/nhan-vien/core/types';

// ==================== PHÒNG BAN ====================
export const MOCK_DEPARTMENTS: Department[] = [
  {
    id: 'dep-0',
    ten_phong_ban: 'Phòng Ban Giám đốc',
    cha_id: null,
    cap_do: 1,
    duong_dan: '/dep-0',
    trang_thai: 'Đang hoạt động',
    thu_tu: 0,
    tg_tao: '2023-01-01T00:00:00Z',
    tg_cap_nhat: '2024-01-15T10:30:00Z'
  },
  // Nhóm con thuộc Phòng Ban Giám đốc
  { id: 'dep-0-1', ten_phong_ban: 'Nhóm điều hành', cha_id: 'dep-0', cap_do: 2, duong_dan: '/dep-0/dep-0-1', trang_thai: 'Đang hoạt động', thu_tu: 1, tg_tao: '2023-01-01T00:00:00Z', tg_cap_nhat: '2024-01-15T10:30:00Z' },
  { id: 'dep-0-2', ten_phong_ban: 'Nhóm trợ lý', cha_id: 'dep-0', cap_do: 2, duong_dan: '/dep-0/dep-0-2', trang_thai: 'Đang hoạt động', thu_tu: 2, tg_tao: '2023-01-01T00:00:00Z', tg_cap_nhat: '2024-01-15T10:30:00Z' },
  {
    id: 'dep-1',
    ten_phong_ban: 'Phòng Kỹ thuật',
    cha_id: null,
    cap_do: 1,
    duong_dan: '/dep-1',
    trang_thai: 'Đang hoạt động',
    thu_tu: 1,
    tg_tao: '2023-01-01T00:00:00Z',
    tg_cap_nhat: '2024-01-15T10:30:00Z'
  },
  {
    id: 'dep-2',
    ten_phong_ban: 'Phòng Nhân sự',
    cha_id: null,
    cap_do: 1,
    duong_dan: '/dep-2',
    trang_thai: 'Đang hoạt động',
    thu_tu: 2,
    tg_tao: '2023-01-01T00:00:00Z',
    tg_cap_nhat: '2024-01-15T10:30:00Z'
  },
  {
    id: 'dep-3',
    ten_phong_ban: 'Phòng Tài chính - Kế toán',
    cha_id: null,
    cap_do: 1,
    duong_dan: '/dep-3',
    trang_thai: 'Đang hoạt động',
    thu_tu: 3,
    tg_tao: '2023-01-01T00:00:00Z',
    tg_cap_nhat: '2024-01-15T10:30:00Z'
  },
  {
    id: 'dep-4',
    ten_phong_ban: 'Phòng Kinh doanh',
    cha_id: null,
    cap_do: 1,
    duong_dan: '/dep-4',
    trang_thai: 'Đang hoạt động',
    thu_tu: 4,
    tg_tao: '2023-01-01T00:00:00Z',
    tg_cap_nhat: '2024-01-15T10:30:00Z'
  },
  {
    id: 'dep-5',
    ten_phong_ban: 'Phòng Kho vận',
    cha_id: null,
    cap_do: 1,
    duong_dan: '/dep-5',
    trang_thai: 'Đang hoạt động',
    thu_tu: 5,
    tg_tao: '2023-01-01T00:00:00Z',
    tg_cap_nhat: '2024-01-15T10:30:00Z'
  },
  {
    id: 'dep-6',
    ten_phong_ban: 'Phòng Marketing',
    cha_id: null,
    cap_do: 1,
    duong_dan: '/dep-6',
    trang_thai: 'Đang hoạt động',
    thu_tu: 6,
    tg_tao: '2023-01-01T00:00:00Z',
    tg_cap_nhat: '2024-01-15T10:30:00Z'
  },
  {
    id: 'dep-7',
    ten_phong_ban: 'Phòng Hành chính',
    cha_id: null,
    cap_do: 1,
    duong_dan: '/dep-7',
    trang_thai: 'Đang hoạt động',
    thu_tu: 7,
    tg_tao: '2023-01-01T00:00:00Z',
    tg_cap_nhat: '2024-01-15T10:30:00Z'
  },
  // Phòng con thuộc Phòng Kỹ thuật
  {
    id: 'dep-1-1',
    ten_phong_ban: 'Nhóm Phát triển phần mềm',
    cha_id: 'dep-1',
    cap_do: 2,
    duong_dan: '/dep-1/dep-1-1',
    trang_thai: 'Đang hoạt động',
    thu_tu: 1,
    tg_tao: '2023-03-01T00:00:00Z',
    tg_cap_nhat: '2024-01-15T10:30:00Z'
  },
  {
    id: 'dep-1-2',
    ten_phong_ban: 'Nhóm Hạ tầng IT',
    cha_id: 'dep-1',
    cap_do: 2,
    duong_dan: '/dep-1/dep-1-2',
    trang_thai: 'Đang hoạt động',
    thu_tu: 2,
    tg_tao: '2023-03-01T00:00:00Z',
    tg_cap_nhat: '2024-01-15T10:30:00Z'
  },
  // Phòng con thuộc Phòng Nhân sự
  { id: 'dep-2-1', ten_phong_ban: 'Nhóm Tuyển dụng', cha_id: 'dep-2', cap_do: 2, duong_dan: '/dep-2/dep-2-1', trang_thai: 'Đang hoạt động', thu_tu: 1, tg_tao: '2023-02-01T00:00:00Z', tg_cap_nhat: '2024-01-15T10:30:00Z' },
  { id: 'dep-2-2', ten_phong_ban: 'Nhóm Đào tạo', cha_id: 'dep-2', cap_do: 2, duong_dan: '/dep-2/dep-2-2', trang_thai: 'Đang hoạt động', thu_tu: 2, tg_tao: '2023-02-01T00:00:00Z', tg_cap_nhat: '2024-01-15T10:30:00Z' },
  // Phòng con thuộc Phòng Tài chính - Kế toán
  { id: 'dep-3-1', ten_phong_ban: 'Nhóm Kế toán', cha_id: 'dep-3', cap_do: 2, duong_dan: '/dep-3/dep-3-1', trang_thai: 'Đang hoạt động', thu_tu: 1, tg_tao: '2023-02-01T00:00:00Z', tg_cap_nhat: '2024-01-15T10:30:00Z' },
  { id: 'dep-3-2', ten_phong_ban: 'Nhóm Tài chính', cha_id: 'dep-3', cap_do: 2, duong_dan: '/dep-3/dep-3-2', trang_thai: 'Đang hoạt động', thu_tu: 2, tg_tao: '2023-02-01T00:00:00Z', tg_cap_nhat: '2024-01-15T10:30:00Z' },
  // Phòng con thuộc Phòng Kinh doanh
  { id: 'dep-4-1', ten_phong_ban: 'Nhóm Kinh doanh B2B', cha_id: 'dep-4', cap_do: 2, duong_dan: '/dep-4/dep-4-1', trang_thai: 'Đang hoạt động', thu_tu: 1, tg_tao: '2023-02-01T00:00:00Z', tg_cap_nhat: '2024-01-15T10:30:00Z' },
  { id: 'dep-4-2', ten_phong_ban: 'Nhóm Kinh doanh B2C', cha_id: 'dep-4', cap_do: 2, duong_dan: '/dep-4/dep-4-2', trang_thai: 'Đang hoạt động', thu_tu: 2, tg_tao: '2023-02-01T00:00:00Z', tg_cap_nhat: '2024-01-15T10:30:00Z' },
  // Phòng con thuộc Phòng Kho vận
  { id: 'dep-5-1', ten_phong_ban: 'Nhóm Nhập kho', cha_id: 'dep-5', cap_do: 2, duong_dan: '/dep-5/dep-5-1', trang_thai: 'Đang hoạt động', thu_tu: 1, tg_tao: '2023-02-01T00:00:00Z', tg_cap_nhat: '2024-01-15T10:30:00Z' },
  { id: 'dep-5-2', ten_phong_ban: 'Nhóm Xuất kho', cha_id: 'dep-5', cap_do: 2, duong_dan: '/dep-5/dep-5-2', trang_thai: 'Đang hoạt động', thu_tu: 2, tg_tao: '2023-02-01T00:00:00Z', tg_cap_nhat: '2024-01-15T10:30:00Z' },
  // Phòng con thuộc Phòng Marketing
  { id: 'dep-6-1', ten_phong_ban: 'Nhóm Digital Marketing', cha_id: 'dep-6', cap_do: 2, duong_dan: '/dep-6/dep-6-1', trang_thai: 'Đang hoạt động', thu_tu: 1, tg_tao: '2023-02-01T00:00:00Z', tg_cap_nhat: '2024-01-15T10:30:00Z' },
  { id: 'dep-6-2', ten_phong_ban: 'Nhóm Thương hiệu', cha_id: 'dep-6', cap_do: 2, duong_dan: '/dep-6/dep-6-2', trang_thai: 'Đang hoạt động', thu_tu: 2, tg_tao: '2023-02-01T00:00:00Z', tg_cap_nhat: '2024-01-15T10:30:00Z' },
  // Phòng con thuộc Phòng Hành chính
  { id: 'dep-7-1', ten_phong_ban: 'Nhóm Văn phòng', cha_id: 'dep-7', cap_do: 2, duong_dan: '/dep-7/dep-7-1', trang_thai: 'Đang hoạt động', thu_tu: 1, tg_tao: '2023-02-01T00:00:00Z', tg_cap_nhat: '2024-01-15T10:30:00Z' },
  { id: 'dep-7-2', ten_phong_ban: 'Nhóm Tổ chức sự kiện', cha_id: 'dep-7', cap_do: 2, duong_dan: '/dep-7/dep-7-2', trang_thai: 'Đang hoạt động', thu_tu: 2, tg_tao: '2023-02-01T00:00:00Z', tg_cap_nhat: '2024-01-15T10:30:00Z' },
];

// ==================== CHI NHÁNH ====================
export const MOCK_BRANCHES: Branch[] = [
  {
    id: 'branch-1',
    ma_chi_nhanh: 'CN-HCM',
    ten_chi_nhanh: 'Chi nhánh TP. Hồ Chí Minh',
    dia_chi: 'Số 12 Nguyễn Huệ, Quận 1',
    tinh_thanh: 'TP. Hồ Chí Minh',
    quan_huyen: 'Quận 1',
    vi_do: 10.773256,
    kinh_do: 106.704321,
    duong_dan_map: 'https://maps.app.goo.gl/1d4QJwqJgTQw5nUj7',
    gio_vao_sang: '08:00',
    gio_ra_sang: '12:00',
    gio_vao_chieu: '13:00',
    gio_ra_chieu: '17:30',
    trang_thai: 'Đang hoạt động',
    tg_tao: '2024-01-15T08:00:00Z',
    tg_cap_nhat: '2025-01-10T09:30:00Z',
  },
  {
    id: 'branch-2',
    ma_chi_nhanh: 'CN-HN',
    ten_chi_nhanh: 'Chi nhánh Hà Nội',
    dia_chi: 'Số 88 Trần Duy Hưng, Cầu Giấy',
    tinh_thanh: 'Hà Nội',
    quan_huyen: 'Cầu Giấy',
    vi_do: 21.016897,
    kinh_do: 105.798233,
    duong_dan_map: 'https://maps.app.goo.gl/2G6X7Gm9mXJqf8Qm8',
    gio_vao_sang: '08:00',
    gio_ra_sang: '12:00',
    gio_vao_chieu: '13:30',
    gio_ra_chieu: '17:30',
    trang_thai: 'Đang hoạt động',
    tg_tao: '2024-02-20T08:00:00Z',
    tg_cap_nhat: '2025-01-20T10:15:00Z',
  },
  {
    id: 'branch-3',
    ma_chi_nhanh: 'CN-DN',
    ten_chi_nhanh: 'Chi nhánh Đà Nẵng',
    dia_chi: 'Số 22 Bạch Đằng, Hải Châu',
    tinh_thanh: 'Đà Nẵng',
    quan_huyen: 'Hải Châu',
    vi_do: 16.06778,
    kinh_do: 108.22083,
    duong_dan_map: 'https://maps.app.goo.gl/9vZWm1vUz4vw1q5a6',
    gio_vao_sang: '08:00',
    gio_ra_sang: '12:00',
    gio_vao_chieu: '13:00',
    gio_ra_chieu: '17:00',
    trang_thai: 'Ngừng hoạt động',
    tg_tao: '2024-03-12T08:00:00Z',
    tg_cap_nhat: '2025-01-05T14:20:00Z',
  },
];

// ==================== CHỨC VỤ ====================
export interface Position {
  id: string;
  ten_chuc_vu: string;
  mo_ta?: string;
  /** Text: "Đang hoạt động" | "Ngừng hoạt động" */
  trang_thai: 'Đang hoạt động' | 'Ngừng hoạt động';
  tg_tao: string;
  tg_cap_nhat: string;
}

export const MOCK_POSITIONS: Position[] = [
  { id: 'pos-1', ten_chuc_vu: 'Giám đốc', mo_ta: 'Điều hành toàn bộ công ty', trang_thai: 'Đang hoạt động', tg_tao: '2023-01-01T00:00:00Z', tg_cap_nhat: '2024-01-01T00:00:00Z' },
  { id: 'pos-2', ten_chuc_vu: 'Phó Giám đốc', mo_ta: 'Hỗ trợ giám đốc điều hành', trang_thai: 'Đang hoạt động', tg_tao: '2023-01-01T00:00:00Z', tg_cap_nhat: '2024-01-01T00:00:00Z' },
  { id: 'pos-3', ten_chuc_vu: 'Trưởng phòng', mo_ta: 'Quản lý phòng ban', trang_thai: 'Đang hoạt động', tg_tao: '2023-01-01T00:00:00Z', tg_cap_nhat: '2024-01-01T00:00:00Z' },
  { id: 'pos-4', ten_chuc_vu: 'Phó phòng', mo_ta: 'Hỗ trợ trưởng phòng', trang_thai: 'Đang hoạt động', tg_tao: '2023-01-01T00:00:00Z', tg_cap_nhat: '2024-01-01T00:00:00Z' },
  { id: 'pos-5', ten_chuc_vu: 'Trưởng nhóm', mo_ta: 'Quản lý nhóm làm việc', trang_thai: 'Đang hoạt động', tg_tao: '2023-01-01T00:00:00Z', tg_cap_nhat: '2024-01-01T00:00:00Z' },
  { id: 'pos-6', ten_chuc_vu: 'Nhân viên', mo_ta: 'Nhân viên chính thức', trang_thai: 'Đang hoạt động', tg_tao: '2023-01-01T00:00:00Z', tg_cap_nhat: '2024-01-01T00:00:00Z' },
  { id: 'pos-7', ten_chuc_vu: 'Thực tập sinh', mo_ta: 'Nhân viên thực tập', trang_thai: 'Đang hoạt động', tg_tao: '2023-01-01T00:00:00Z', tg_cap_nhat: '2024-01-01T00:00:00Z' },
];

// ==================== CẤP BẬC ====================
export interface JobLevel {
  id: string;
  ma_cap_bac: string;
  ten_cap_bac: string;
  he_so_luong: number;
  mo_ta?: string;
  /** Text: "Đang hoạt động" | "Ngừng hoạt động" */
  trang_thai: 'Đang hoạt động' | 'Ngừng hoạt động';
  tg_tao: string;
  tg_cap_nhat: string;
}

/** Id chuỗi số khớp cột `cap_bac` SMALLINT khi đồng bộ Supabase (xem cap-bac-service). */
export const MOCK_JOB_LEVELS: JobLevel[] = [
  { id: '1', ma_cap_bac: 'GD', ten_cap_bac: 'Giám đốc', he_so_luong: 1.0, trang_thai: 'Đang hoạt động', tg_tao: '2023-01-01T00:00:00Z', tg_cap_nhat: '2024-01-01T00:00:00Z' },
  { id: '2', ma_cap_bac: 'PGD', ten_cap_bac: 'Phó giám đốc', he_so_luong: 1.3, trang_thai: 'Đang hoạt động', tg_tao: '2023-01-01T00:00:00Z', tg_cap_nhat: '2024-01-01T00:00:00Z' },
  { id: '3', ma_cap_bac: 'TP', ten_cap_bac: 'Trưởng phòng', he_so_luong: 1.8, trang_thai: 'Đang hoạt động', tg_tao: '2023-01-01T00:00:00Z', tg_cap_nhat: '2024-01-01T00:00:00Z' },
  { id: '4', ma_cap_bac: 'NV', ten_cap_bac: 'Nhân viên', he_so_luong: 2.5, trang_thai: 'Đang hoạt động', tg_tao: '2023-01-01T00:00:00Z', tg_cap_nhat: '2024-01-01T00:00:00Z' },
];

// ==================== NHÂN VIÊN ====================
export const MOCK_EMPLOYEES: Employee[] = [];

// Helper để lấy tên nhân viên theo ID
export const getEmployeeName = (id: string): string => {
  return MOCK_EMPLOYEES.find(e => e.id === id)?.ho_va_ten || 'Không xác định';
};

// Helper để lấy tên phòng ban theo ID
export const getDepartmentName = (id: string): string => {
  return MOCK_DEPARTMENTS.find(d => d.id === id)?.ten_phong_ban || 'Không xác định';
};
