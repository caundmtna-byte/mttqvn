import { describe, expect, it } from 'vitest';
import {
  DON_VI_GIOI_THIEU_TINH,
  donViGioiThieuLabel,
  donViGioiThieuScope,
  donViGioiThieuToFormValue,
  donViGioiThieuToPayload,
  parseDonViGioiThieuLoai,
  resolveDonViGioiThieuImport,
  timDonViTrungTen,
} from './don-vi-gioi-thieu';

describe('donViGioiThieuToPayload', () => {
  it('ô để trống ⇒ MTTQ tỉnh (trường bắt buộc, không có trạng thái "chưa nhập")', () => {
    expect(donViGioiThieuToPayload('')).toEqual({
      don_vi_gioi_thieu_loai: 'tinh',
      don_vi_gioi_thieu_id: null,
    });
    expect(donViGioiThieuToPayload(null)).toEqual({
      don_vi_gioi_thieu_loai: 'tinh',
      don_vi_gioi_thieu_id: null,
    });
  });

  it('cấp tỉnh ⇒ loai = tinh, id NULL', () => {
    expect(donViGioiThieuToPayload(DON_VI_GIOI_THIEU_TINH)).toEqual({
      don_vi_gioi_thieu_loai: 'tinh',
      don_vi_gioi_thieu_id: null,
    });
  });

  it('id xã/phường ⇒ loai = xa_phuong kèm id số', () => {
    expect(donViGioiThieuToPayload('245')).toEqual({
      don_vi_gioi_thieu_loai: 'xa_phuong',
      don_vi_gioi_thieu_id: 245,
    });
  });

  // Trả nửa vời ('xa_phuong' mà id NULL) sẽ bị CHECK dưới DB từ chối, người dùng
  // nhận một toast khó hiểu thay vì ô trống.
  it('id không đọc được ⇒ về MTTQ tỉnh, không trả trạng thái lai', () => {
    for (const bad of ['abc', '0', '-3', ' ']) {
      expect(donViGioiThieuToPayload(bad)).toEqual({
        don_vi_gioi_thieu_loai: 'tinh',
        don_vi_gioi_thieu_id: null,
      });
    }
  });
});

describe('donViGioiThieuToFormValue', () => {
  it('khứ hồi hai trạng thái; NULL cũ ⇒ MTTQ tỉnh', () => {
    expect(donViGioiThieuToFormValue(null, null)).toBe(DON_VI_GIOI_THIEU_TINH);
    expect(donViGioiThieuToFormValue('tinh', null)).toBe(DON_VI_GIOI_THIEU_TINH);
    expect(donViGioiThieuToFormValue('xa_phuong', 245)).toBe('245');
    expect(donViGioiThieuToFormValue('xa_phuong', '245')).toBe('245');
  });

  it('xa_phuong mà thiếu id ⇒ về MTTQ tỉnh', () => {
    expect(donViGioiThieuToFormValue('xa_phuong', null)).toBe(DON_VI_GIOI_THIEU_TINH);
    expect(donViGioiThieuToFormValue('xa_phuong', '')).toBe(DON_VI_GIOI_THIEU_TINH);
  });
});

describe('parseDonViGioiThieuLoai', () => {
  it('chỉ nhận hai giá trị hợp lệ', () => {
    expect(parseDonViGioiThieuLoai('tinh')).toBe('tinh');
    expect(parseDonViGioiThieuLoai('xa_phuong')).toBe('xa_phuong');
    expect(parseDonViGioiThieuLoai('huyen')).toBeNull();
    expect(parseDonViGioiThieuLoai(undefined)).toBeNull();
  });
});

describe('donViGioiThieuLabel', () => {
  it('NULL (dữ liệu cũ) ⇒ MTTQ tỉnh', () => {
    expect(donViGioiThieuLabel(null, null)).toBe('MTTQ tỉnh');
  });

  it('cấp tỉnh ⇒ MTTQ tỉnh', () => {
    expect(donViGioiThieuLabel('tinh', null)).toBe('MTTQ tỉnh');
  });

  it('xã/phường ⇒ tên từ join', () => {
    expect(donViGioiThieuLabel('xa_phuong', 'xã Tam Quang')).toBe('xã Tam Quang');
  });

  it('thiếu tên join ⇒ rỗng, không in ra chữ "null"', () => {
    expect(donViGioiThieuLabel('xa_phuong', null)).toBe('');
  });
});

describe('resolveDonViGioiThieuImport', () => {
  const xa = [
    { id: '245', ten: 'Xã Tam Quang' },
    { id: '209', ten: 'Phường Tây Hiếu' },
    { id: '300', ten: 'Xã Hưng Lộc' },
    { id: '301', ten: 'Xã Hưng Lộc' },
  ];

  it('ô trống ⇒ MTTQ tỉnh', () => {
    expect(resolveDonViGioiThieuImport('', xa)).toEqual({ ok: true, value: DON_VI_GIOI_THIEU_TINH });
  });

  it('nhận nhiều cách gõ cấp tỉnh', () => {
    for (const s of ['MTTQ tỉnh', 'mttq tinh', 'Cấp tỉnh', '  Tỉnh  ']) {
      expect(resolveDonViGioiThieuImport(s, xa)).toEqual({
        ok: true,
        value: DON_VI_GIOI_THIEU_TINH,
      });
    }
  });

  it('khớp tên xã bất kể hoa thường, dấu và dấu cách thừa; nhận cả id', () => {
    expect(resolveDonViGioiThieuImport('Xã  Tam   Quang', xa)).toEqual({ ok: true, value: '245' });
    expect(resolveDonViGioiThieuImport('phuong tay hieu', xa)).toEqual({ ok: true, value: '209' });
    expect(resolveDonViGioiThieuImport('245', xa)).toEqual({ ok: true, value: '245' });
  });

  it('tên không khớp / trùng tên ⇒ báo lỗi dòng, không im lặng bỏ trống hay lấy bừa', () => {
    expect(resolveDonViGioiThieuImport('Xã Không Có Thật', xa)).toEqual({
      ok: false,
      ten: 'Xã Không Có Thật',
      reason: 'missing',
    });
    expect(resolveDonViGioiThieuImport('xã hưng lộc', xa)).toMatchObject({ ok: false, reason: 'ambiguous' });
  });
});

describe('donViGioiThieuScope', () => {
  it('cán bộ cấp xã ⇒ khoá ô, điền sẵn xã của mình', () => {
    expect(donViGioiThieuScope({ canViewAll: false, chucVuCapQuanLy: 'Xã phường', viewerDonViId: ' 12 ' })).toEqual({
      khoa: true,
      xaPhuongId: '12',
    });
  });

  it('cấp xã nhưng tài khoản chưa gán xã ⇒ vẫn khoá, không có giá trị (form chặn lưu)', () => {
    expect(donViGioiThieuScope({ canViewAll: false, chucVuCapQuanLy: 'Xã phường', viewerDonViId: null })).toEqual({
      khoa: true,
      xaPhuongId: null,
    });
  });

  it('cấp tỉnh, chức vụ chưa phân cấp, hoặc quyền xem hết ⇒ chọn tự do', () => {
    const tuDo = { khoa: false, xaPhuongId: null };
    expect(donViGioiThieuScope({ canViewAll: false, chucVuCapQuanLy: 'Tỉnh', viewerDonViId: '12' })).toEqual(tuDo);
    expect(donViGioiThieuScope({ canViewAll: false, chucVuCapQuanLy: null, viewerDonViId: '12' })).toEqual(tuDo);
    expect(donViGioiThieuScope({ canViewAll: true, chucVuCapQuanLy: 'Xã phường', viewerDonViId: '12' })).toEqual(tuDo);
  });
});

describe('timDonViTrungTen', () => {
  const rows = [
    { id: '1', ten: 'Nguyễn Thị Mai (Đông Thành)' },
    { id: '2', ten: 'CLB TN Quỳnh Phương Xanh' },
  ];

  it('khớp không phân biệt hoa thường và khoảng trắng thừa — như unique index dưới DB', () => {
    expect(timDonViTrungTen('  clb tn   quỳnh PHƯƠNG xanh ', rows)?.id).toBe('2');
  });

  it('bỏ qua chính bản ghi đang sửa', () => {
    expect(timDonViTrungTen('CLB TN Quỳnh Phương Xanh', rows, '2')).toBeUndefined();
  });

  it('khác dấu là tên khác; ô trống không báo trùng', () => {
    expect(timDonViTrungTen('CLB TN Quynh Phuong Xanh', rows)).toBeUndefined();
    expect(timDonViTrungTen('   ', rows)).toBeUndefined();
  });
});
