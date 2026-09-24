import { describe, expect, it } from 'vitest';
import {
  DON_VI_GIOI_THIEU_TINH,
  donViGioiThieuLabel,
  donViGioiThieuToFormValue,
  donViGioiThieuToPayload,
  parseDonViGioiThieuLoai,
  resolveDonViGioiThieuImport,
} from './don-vi-gioi-thieu';

describe('donViGioiThieuToPayload', () => {
  it('ô để trống ⇒ cả hai cột NULL (chưa nhập)', () => {
    expect(donViGioiThieuToPayload('')).toEqual({
      don_vi_gioi_thieu_loai: null,
      don_vi_gioi_thieu_id: null,
    });
    expect(donViGioiThieuToPayload(null)).toEqual({
      don_vi_gioi_thieu_loai: null,
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
  it('id không đọc được ⇒ trả về chưa nhập, không trả trạng thái lai', () => {
    for (const bad of ['abc', '0', '-3', ' ']) {
      expect(donViGioiThieuToPayload(bad)).toEqual({
        don_vi_gioi_thieu_loai: null,
        don_vi_gioi_thieu_id: null,
      });
    }
  });
});

describe('donViGioiThieuToFormValue', () => {
  it('khứ hồi đủ ba trạng thái', () => {
    expect(donViGioiThieuToFormValue(null, null)).toBe('');
    expect(donViGioiThieuToFormValue('tinh', null)).toBe(DON_VI_GIOI_THIEU_TINH);
    expect(donViGioiThieuToFormValue('xa_phuong', 245)).toBe('245');
    expect(donViGioiThieuToFormValue('xa_phuong', '245')).toBe('245');
  });

  it('xa_phuong mà thiếu id ⇒ coi như chưa nhập', () => {
    expect(donViGioiThieuToFormValue('xa_phuong', null)).toBe('');
    expect(donViGioiThieuToFormValue('xa_phuong', '')).toBe('');
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
  it('chưa nhập ⇒ chuỗi rỗng', () => {
    expect(donViGioiThieuLabel(null, null)).toBe('');
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

  it('ô trống ⇒ chưa nhập', () => {
    expect(resolveDonViGioiThieuImport('', xa)).toEqual({ ok: true, value: '' });
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
