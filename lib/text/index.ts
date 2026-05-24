/**
 * Chuỗi giao diện (một ngôn ngữ): gộp bảng phẳng từ `ui` + các module để tra key động (`txt`).
 * Chuỗi tĩnh nên import trực tiếp từ `./ui` hoặc `features/.../text`.
 */
import { fmt } from '../fmt';
import { ui } from './ui';
import { tenure } from './tenure';
import { taiLieu } from './tai-lieu';
import { employee } from '../../features/he-thong/nhan-vien/text';
import { department } from '../../features/he-thong/phong-ban/text';
import { position } from '../../features/he-thong/chuc-vu/text';
import { permission } from '../../features/he-thong/phan-quyen/text';
import { company } from '../../features/he-thong/thong-tin-to-chuc/text';
import { articleList } from '../../features/quan-ly-viet-bai/bai-viet/text';
import { articleStats } from '../../features/quan-ly-viet-bai/bc-thong-ke-bai-viet/text';
import { articleCommission } from '../../features/quan-ly-viet-bai/hoa-hong-viet-bai/text';
import { chuongTrinhNam } from '../../features/quan-ly-giao-viec/chuong-trinh-nam/text';
import { taskList } from '../../features/quan-ly-giao-viec/cong-viec/text';
import { taskReport } from '../../features/quan-ly-giao-viec/bao-cao-cong-viec/text';
import { matTranCanBo } from '../../features/mat-tran-to-quoc/danh-sach-can-bo/text';
import { matTranOfficerStats } from '../../features/mat-tran-to-quoc/bao-cao-can-bo/text';
import { matTranCommitteeMemberStats } from '../../features/mat-tran-to-quoc/bao-cao-uy-vien/text';
import { matTranKhenThuong } from '../../features/mat-tran-to-quoc/danh-sach-khen-thuong/text';
import { matTranTapHuan } from '../../features/mat-tran-to-quoc/danh-sach-tap-huan/text';
import { matTranNhiemKy } from '../../features/mat-tran-to-quoc/nhiem-ky/text';
import { matTranKyHop } from '../../features/mat-tran-to-quoc/ky-hop/text';
import { matTranUyVienUyBan } from '../../features/mat-tran-to-quoc/uy-vien-uy-ban/text';
import { matTranKhoDanhSach } from '../../features/mat-tran-to-quoc/danh-sach-kho/text';
import { matTranDonViCuuTro } from '../../features/mat-tran-to-quoc/don-vi-cuu-tro/text';
import { matTranDotCuuTro } from '../../features/mat-tran-to-quoc/dot-cuu-tro/text';
import { matTranHangHoa } from '../../features/mat-tran-to-quoc/hang-hoa/text';
import { matTranNhapXuatKho } from '../../features/mat-tran-to-quoc/nhap-xuat-kho/text';
import { matTranTonKho } from '../../features/mat-tran-to-quoc/ton-kho/text';
import { matTranReliefSupportReport } from '../../features/mat-tran-to-quoc/bao-cao-ho-tro/text';
import { matTranThietLapLuong } from '../../features/mat-tran-to-quoc/thiet-lap-luong/text';
import { matTranTangLuong } from '../../features/mat-tran-to-quoc/danh-sach-tang-luong/text';
import { diaBan } from '../../features/he-thong/danh-sach-tinh-thanh/text';

function flatten(prefix: string, obj: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  function walk(p: string, o: unknown) {
    if (typeof o === 'string') {
      out[p] = o;
      return;
    }
    if (o && typeof o === 'object' && !Array.isArray(o)) {
      for (const [k, v] of Object.entries(o)) {
        walk(p ? `${p}.${k}` : k, v);
      }
    }
  }
  walk(prefix, obj);
  return out;
}

/** Tất cả key dạng `nav.home`, `employee.detail.fullName`, … */
export const STRINGS: Readonly<Record<string, string>> = Object.freeze({
  ...flatten('', ui),
  ...flatten('employee', employee),
  ...flatten('department', department),
  ...flatten('position', position),
  ...flatten('permission', permission),
  ...flatten('company', company),
  ...flatten('articleList', articleList),
  ...flatten('articleStats', articleStats),
  ...flatten('articleCommission', articleCommission),
  ...flatten('chuongTrinhNam', chuongTrinhNam),
  ...flatten('taskList', taskList),
  ...flatten('taskReport', taskReport),
  ...flatten('matTranCanBo', matTranCanBo),
  ...flatten('matTranOfficerStats', matTranOfficerStats),
  ...flatten('matTranCommitteeMemberStats', matTranCommitteeMemberStats),
  ...flatten('matTranKhenThuong', matTranKhenThuong),
  ...flatten('matTranTapHuan', matTranTapHuan),
  ...flatten('matTranNhiemKy', matTranNhiemKy),
  ...flatten('matTranKyHop', matTranKyHop),
  ...flatten('matTranUyVienUyBan', matTranUyVienUyBan),
  ...flatten('matTranKhoDanhSach', matTranKhoDanhSach),
  ...flatten('matTranDonViCuuTro', matTranDonViCuuTro),
  ...flatten('matTranDotCuuTro', matTranDotCuuTro),
  ...flatten('matTranHangHoa', matTranHangHoa),
  ...flatten('matTranNhapXuatKho', matTranNhapXuatKho),
  ...flatten('matTranTonKho', matTranTonKho),
  ...flatten('matTranReliefSupportReport', matTranReliefSupportReport),
  ...flatten('matTranThietLapLuong', matTranThietLapLuong),
  ...flatten('matTranTangLuong', matTranTangLuong),
  ...flatten('tenure', tenure),
  ...flatten('taiLieu', taiLieu),
  ...flatten('diaBan', diaBan),
});

export type TFunction = typeof txt;

/**
 * Tra chuỗi theo key (breadcrumb, phân quyền động, …).
 * Hỗ trợ thay `{{var}}` qua object options (bỏ qua `lng`, `ns`, `defaultValue`).
 */
export function txt(key: string, options?: Record<string, unknown> | string): string {
  if (typeof options === 'string') {
    const fallback = options;
    const raw = STRINGS[key];
    return raw !== undefined ? raw : fallback;
  }

  const raw = STRINGS[key];
  if (raw === undefined) return key;

  if (!options || typeof options !== 'object') return raw;

  const vars: Record<string, string | number | undefined> = {};
  for (const [k, v] of Object.entries(options)) {
    if (k === 'lng' || k === 'ns' || k === 'defaultValue') continue;
    vars[k] = v as string | number | undefined;
  }
  return fmt(raw, vars);
}

export {
  ui,
  tenure,
  taiLieu,
  employee,
  department,
  position,
  permission,
  company,
  articleList,
  articleStats,
  articleCommission,
  chuongTrinhNam,
  taskList,
  taskReport,
  matTranCanBo,
  matTranOfficerStats,
  matTranCommitteeMemberStats,
  matTranKhenThuong,
  matTranTapHuan,
  matTranNhiemKy,
  matTranKyHop,
  matTranUyVienUyBan,
  matTranKhoDanhSach,
  matTranDonViCuuTro,
  matTranDotCuuTro,
  matTranHangHoa,
  matTranNhapXuatKho,
  matTranTonKho,
  matTranReliefSupportReport,
  matTranThietLapLuong,
  diaBan,
};
export { fmt };
