import { describe, expect, it } from 'vitest';
import { txt } from '@/lib/text';
import type { MttqLopTapHuan } from '../../core/types';
import type { MttqLopTapHuanViewer } from '../../hooks/use-mttq-tap-huan-viewer';
import {
  buildTapHuanInDanhSachDocumentModel,
  layoutTapHuanMetaPairs,
} from '../build-tap-huan-in-danh-sach-document';

const viewerAll: MttqLopTapHuanViewer = {
  canViewAll: true,
  chucVuCapQuanLy: null,
  viewerDonViId: null,
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

describe('build-tap-huan-in-danh-sach-document', () => {
  it('includes signed date and meta don_vi for Cấp xã', () => {
    const model = buildTapHuanInDanhSachDocumentModel(
      lop({}),
      { companyName: 'UB MTTQ', address: 'Số 1', phone: '090', appLogo: null },
      viewerAll,
    );
    expect(model.companyName).toBe('UB MTTQ');
    expect(model.metaItems.some((m) => m.label === txt('matTranTapHuan.printPreview.metaDonVi'))).toBe(
      true,
    );
    expect(model.signedDateLabel).toBe(txt('matTranTapHuan.printPreview.signedDate'));
    expect(model.signedDateValue.length).toBeGreaterThan(0);
    expect(model.footer.nguoiTaoLabel).toBe(txt('matTranTapHuan.printPreview.footerNguoiTao'));
    expect(model.footer.nguoiTaoValue).toBeTruthy();
  });

  it('layoutTapHuanMetaPairs groups two columns per row', () => {
    const pairs = layoutTapHuanMetaPairs(
      [
        { label: 'Lớp', value: 'A' },
        { label: 'Năm', value: '2025' },
        { label: 'Cấp', value: 'Cấp xã' },
      ],
      { label: 'Ngày in', value: '01/01/2025' },
    );
    expect(pairs).toHaveLength(2);
    expect(pairs[0]).toHaveLength(2);
    expect(pairs[1]).toHaveLength(2);
  });
});
