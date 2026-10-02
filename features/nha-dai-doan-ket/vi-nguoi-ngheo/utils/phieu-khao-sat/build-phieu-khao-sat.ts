import type { BienBanModel } from '@/lib/bien-ban/bien-ban-model';
import { vnnLoaiPhieu, type VnnLoaiPhieu } from '../../core/phieu-khao-sat';
import { buildPhieuBenhTat } from './build-phieu-benh-tat';
import { buildPhieuHocSinh } from './build-phieu-hoc-sinh';
import { buildPhieuSinhKe } from './build-phieu-sinh-ke';
import { buildPhieuThienTai } from './build-phieu-thien-tai';
import type { PhieuKhaoSatNguon } from './phan-chung';

export type { PhieuKhaoSatNguon } from './phan-chung';

const BUILDERS: Record<VnnLoaiPhieu, (n: PhieuKhaoSatNguon) => BienBanModel> = {
  'thien-tai': buildPhieuThienTai,
  'benh-tat': buildPhieuBenhTat,
  'sinh-ke': buildPhieuSinhKe,
  'hoc-sinh': buildPhieuHocSinh,
};

/** Phiếu đúng theo lĩnh vực của khoản hỗ trợ; `null` khi lĩnh vực không có phiếu. */
export function buildPhieuKhaoSat(nguon: PhieuKhaoSatNguon): BienBanModel | null {
  const loai = vnnLoaiPhieu(nguon.vnn.linh_vuc_ho_tro);
  return loai ? BUILDERS[loai](nguon) : null;
}
