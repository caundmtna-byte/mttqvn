import { describe, expect, it } from 'vitest';
import { txt } from '@/lib/text';
import type { MttqLopTapHuan } from '../../core/types';
import type { MttqLopTapHuanViewer } from '../../hooks/use-mttq-tap-huan-viewer';
import { buildTapHuanInDanhSachRows, buildTapHuanInDanhSachMeta } from '../build-tap-huan-in-danh-sach-rows';

const viewerAll: MttqLopTapHuanViewer = {
  canViewAll: true,
  chucVuCapQuanLy: null,
  viewerDonViId: null,
};

const viewerXa: MttqLopTapHuanViewer = {
  canViewAll: false,
  chucVuCapQuanLy: 'Xã phường',
  viewerDonViId: '5',
};

function lop(partial: Partial<MttqLopTapHuan>): MttqLopTapHuan {
  return {
    id: '1',
    ten_lop_tap_huan: 'Lớp A',
    nam_tap_huan: 2025,
    cap_tap_huan: 'Cấp xã',
    don_vi_id: '10',
    ten_don_vi: 'Xã Test',
    ghi_chu: null,
    id_nguoi_tao: 'nv1',
    tg_tao: '',
    tg_cap_nhat: '',
    chi_tiet: [],
    ...partial,
  };
}

describe('build-tap-huan-in-danh-sach-rows', () => {
  it('filters by Xã phường don_vi', () => {
    const rows = buildTapHuanInDanhSachRows(
      lop({
        chi_tiet: [
          {
            id: '1',
            id_lop_tap_huan: '1',
            can_bo_id: 'cb1',
            chuc_vu: 'CV',
            don_vi_cong_tac: null,
            thuoc_dien: 'Ủy viên',
            ten_can_bo: 'Nguyễn A',
            can_bo_don_vi_id: '5',
          },
          {
            id: '2',
            id_lop_tap_huan: '1',
            can_bo_id: 'cb2',
            chuc_vu: 'CV',
            don_vi_cong_tac: null,
            thuoc_dien: 'Ủy viên',
            ten_can_bo: 'Trần B',
            can_bo_don_vi_id: '6',
          },
        ],
      }),
      viewerXa,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0][txt('matTranTapHuan.form.hoVaTen')]).toBe('Nguyễn A');
  });

  it('buildTapHuanInDanhSachMeta includes don_vi for Cấp xã', () => {
    const meta = buildTapHuanInDanhSachMeta(lop({}));
    expect(meta[txt('matTranTapHuan.printPreview.metaDonVi')]).toBe('Xã Test');
  });
});
