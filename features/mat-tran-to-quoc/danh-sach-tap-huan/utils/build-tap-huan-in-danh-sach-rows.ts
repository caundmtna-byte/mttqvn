import { txt } from '@/lib/text';
import { formatTenDonViCongTacDisplay } from '@/lib/format-ten-don-vi-cap-quan-ly';
import type { MttqCanBo } from '@/features/mat-tran-to-quoc/danh-sach-can-bo/core/types';
import type { MttqLopTapHuan } from '../core/types';
import {
  canViewTapHuanUngVienRow,
  type MttqLopTapHuanViewer,
} from '../hooks/use-mttq-tap-huan-viewer';
import { tapHuanThreeColForChiTietRow } from './snapshot-from-can-bo';

/** Một dòng xuất in/PDF/Docx — key = nhãn cột tiếng Việt. */
export type TapHuanInDanhSachPrintRow = Record<string, string>;

export function buildTapHuanInDanhSachRows(
  lop: MttqLopTapHuan,
  viewer: MttqLopTapHuanViewer,
  canBoMap?: Map<string, MttqCanBo>,
): TapHuanInDanhSachPrintRow[] {
  const ec = txt('common.emptyCell');
  const visible = lop.chi_tiet.filter((r) => canViewTapHuanUngVienRow(viewer, r));

  return visible.map((r, index) => {
    const canBo = canBoMap?.get(String(r.can_bo_id));
    const three = tapHuanThreeColForChiTietRow(r, canBo);
    const capQl = r.chuc_vu_cap_quan_ly ?? canBo?.chuc_vu_cap_quan_ly ?? null;
    const donVi = formatTenDonViCongTacDisplay(capQl, r.ten_don_vi_can_bo);
    const tenToChuc = three.ten_to_chuc.trim() || r.ten_to_chuc?.trim() || '';
    const tenPhongBan = three.ten_phong_ban.trim() || r.ten_phong_ban?.trim() || '';
    const chucVu = three.ten_chuc_vu.trim() || r.chuc_vu?.trim() || '';

    return {
      [txt('matTranTapHuan.printPreview.colStt')]: String(index + 1),
      [txt('matTranTapHuan.form.hoVaTen')]: r.ten_can_bo?.trim() || ec,
      [txt('matTranCanBo.store.toChucCol')]: tenToChuc || ec,
      [txt('matTranCanBo.store.phongBanCol')]: tenPhongBan || ec,
      [txt('matTranTapHuan.form.chucVu')]: chucVu || ec,
      [txt('matTranTapHuan.form.donViCongTac')]: donVi === ec ? ec : donVi,
      [txt('matTranTapHuan.form.thuocDien')]: r.thuoc_dien || ec,
    };
  });
}

export function buildTapHuanInDanhSachMeta(lop: MttqLopTapHuan): Record<string, string> {
  const meta: Record<string, string> = {
    [txt('matTranTapHuan.printPreview.metaLop')]: lop.ten_lop_tap_huan,
    [txt('matTranTapHuan.printPreview.metaNam')]: String(lop.nam_tap_huan ?? ''),
    [txt('matTranTapHuan.printPreview.metaCap')]: lop.cap_tap_huan,
  };
  if (lop.cap_tap_huan === 'Cấp xã' && lop.ten_don_vi?.trim()) {
    meta[txt('matTranTapHuan.printPreview.metaDonVi')] = lop.ten_don_vi.trim();
  }
  return meta;
}
