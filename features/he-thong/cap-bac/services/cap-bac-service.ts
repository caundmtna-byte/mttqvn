import type { JobLevel } from '../core/types';

const ts = () => new Date().toISOString();

/** Id dạng chuỗi số khớp cột `cap_bac` SMALLINT trên Supabase (không bảng var_cap_bac). */
const MOCK_LEVELS: JobLevel[] = [
  {
    id: '1',
    ma_cap_bac: 'GD',
    ten_cap_bac: 'Giám đốc',
    mo_ta: 'Placeholder — module cấp bậc đã gỡ',
    thu_tu: 1,
    trang_thai: 'Đang hoạt động',
    tg_tao: ts(),
    tg_cap_nhat: ts(),
  },
  {
    id: '2',
    ma_cap_bac: 'PGD',
    ten_cap_bac: 'Phó giám đốc',
    mo_ta: null,
    thu_tu: 2,
    trang_thai: 'Đang hoạt động',
    tg_tao: ts(),
    tg_cap_nhat: ts(),
  },
  {
    id: '3',
    ma_cap_bac: 'TP',
    ten_cap_bac: 'Trưởng phòng',
    mo_ta: null,
    thu_tu: 3,
    trang_thai: 'Đang hoạt động',
    tg_tao: ts(),
    tg_cap_nhat: ts(),
  },
  {
    id: '4',
    ma_cap_bac: 'NV',
    ten_cap_bac: 'Nhân viên',
    mo_ta: null,
    thu_tu: 4,
    trang_thai: 'Đang hoạt động',
    tg_tao: ts(),
    tg_cap_nhat: ts(),
  },
];

export async function getJobLevels(): Promise<JobLevel[]> {
  return MOCK_LEVELS;
}
