import type { NddkLoaiPhieuIn } from '../../core/constants';
import type { BienBanModel } from './bien-ban-model';
import { buildBienBanBanGiao } from './build-bien-ban-ban-giao';
import { buildBienBanHoanThanh } from './build-bien-ban-hoan-thanh';
import { buildBienBanKhaoSat, type BienBanNguon } from './build-bien-ban-khao-sat';

export type { BienBanNguon };

const BUILDERS: Record<NddkLoaiPhieuIn, (n: BienBanNguon) => BienBanModel> = {
  'khao-sat': buildBienBanKhaoSat,
  'hoan-thanh': buildBienBanHoanThanh,
  'ban-giao': buildBienBanBanGiao,
};

export function buildBienBan(loai: NddkLoaiPhieuIn, nguon: BienBanNguon): BienBanModel {
  return BUILDERS[loai](nguon);
}
