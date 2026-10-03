import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getViewerKhoIds,
  khoChinhCuaPhieu,
  khoTrongPhamVi,
  khoTuDienTheoXa,
  locKhoTheoPhamVi,
  type KhoPhamViViewer,
} from './pham-vi-kho';

const TINH: KhoPhamViViewer = { canViewAll: false, chucVuCapQuanLy: 'Tỉnh', viewerDonViId: null };
const QUAN_TRI: KhoPhamViViewer = { canViewAll: true, chucVuCapQuanLy: 'Xã phường', viewerDonViId: 'xa-a' };
const KHONG_CAP: KhoPhamViViewer = { canViewAll: false, chucVuCapQuanLy: null, viewerDonViId: null };
const XA_A: KhoPhamViViewer = { canViewAll: false, chucVuCapQuanLy: 'Xã phường', viewerDonViId: 'xa-a' };
const XA_CHUA_GAN: KhoPhamViViewer = { canViewAll: false, chucVuCapQuanLy: 'Xã phường', viewerDonViId: null };

const KHO = [
  { id: 'k1', don_vi_id: 'xa-a' },
  { id: 'k2', don_vi_id: 'xa-b' },
  { id: 'k3', don_vi_id: null },
];

describe('getViewerKhoIds', () => {
  it('Tỉnh / quản trị / không có cấp ⇒ không giới hạn', () => {
    expect(getViewerKhoIds(TINH, KHO)).toBeNull();
    expect(getViewerKhoIds(QUAN_TRI, KHO)).toBeNull();
    expect(getViewerKhoIds(KHONG_CAP, KHO)).toBeNull();
  });

  it('Xã ⇒ chỉ kho của xã mình', () => {
    expect(getViewerKhoIds(XA_A, KHO)).toEqual(['k1']);
  });

  it('Xã chưa gán đơn vị ⇒ rỗng, kể cả kho không có đơn vị', () => {
    expect(getViewerKhoIds(XA_CHUA_GAN, KHO)).toEqual([]);
  });
});

describe('phạm vi ghi phiếu', () => {
  it('kho chính: nhập từ ngoài ⇒ kho nhập; xuất / chuyển ⇒ kho xuất', () => {
    expect(khoChinhCuaPhieu('nhap_ngoai')).toBe('kho_nhap_id');
    expect(khoChinhCuaPhieu('xuat_ngoai')).toBe('kho_xuat_id');
    expect(khoChinhCuaPhieu('chuyen_kho')).toBe('kho_xuat_id');
  });

  it('xã chỉ ghi được kho của xã mình', () => {
    expect(khoTrongPhamVi(XA_A, KHO[0])).toBe(true);
    expect(khoTrongPhamVi(XA_A, KHO[1])).toBe(false);
    expect(khoTrongPhamVi(XA_A, KHO[2])).toBe(false);
    expect(khoTrongPhamVi(TINH, KHO[2])).toBe(true);
  });
});

describe('locKhoTheoPhamVi', () => {
  it('không giới hạn ⇒ đủ kho', () => {
    expect(locKhoTheoPhamVi(KHO, TINH).map((k) => k.id)).toEqual(['k1', 'k2', 'k3']);
  });

  it('xã ⇒ kho của xã, giữ thêm kho đang gắn trên phiếu cũ', () => {
    expect(locKhoTheoPhamVi(KHO, XA_A).map((k) => k.id)).toEqual(['k1']);
    expect(locKhoTheoPhamVi(KHO, XA_A, 'k2').map((k) => k.id)).toEqual(['k1', 'k2']);
    expect(locKhoTheoPhamVi(KHO, XA_CHUA_GAN)).toEqual([]);
  });
});

describe('khoTuDienTheoXa', () => {
  it('đúng một kho ⇒ tự điền; không có hoặc nhiều ⇒ để người dùng chọn', () => {
    expect(khoTuDienTheoXa([KHO[0]])).toBe('k1');
    expect(khoTuDienTheoXa([])).toBeNull();
    expect(khoTuDienTheoXa(KHO)).toBeNull();
  });
});

describe('khớp RLS dưới DB (supabase/schema.sql)', () => {
  const schema = readFileSync(resolve(__dirname, '../../../../supabase/schema.sql'), 'utf8');
  const fnBody = (name: string) => {
    const i = schema.indexOf(`CREATE FUNCTION public.${name}(`);
    expect(i, `thiếu hàm ${name}`).toBeGreaterThan(-1);
    return schema.slice(i, schema.indexOf('$$;', schema.indexOf('AS $', i)) + 3);
  };

  it('phiếu và dòng chi tiết không còn policy USING (true)', () => {
    const policies = schema.split('\n').filter((l) => /CREATE POLICY \S+ ON public\.kho_nhap_xuat_kho(_ct)? /.test(l));
    expect(policies.length).toBeGreaterThanOrEqual(8);
    for (const p of policies) expect(p).not.toMatch(/USING \(true\)|WITH CHECK \(true\)/);
  });

  it('chỉ cán bộ Xã phường (không kiêm Tỉnh, không quản trị) bị giới hạn', () => {
    const body = fnBody('fn_kho_xem_tat_ca');
    expect(body).toContain('fn_la_quan_tri()');
    expect(body).toContain("'Xã phường'");
    expect(body).toContain("'Tỉnh'");
  });

  it('kho chính khi ghi: nhap_ngoai → kho nhập, còn lại → kho xuất', () => {
    expect(fnBody('fn_kho_phieu_ghi_duoc')).toMatch(
      /CASE\s+WHEN\s+\(?p_loai\s*=\s*'nhap_ngoai'(::text)?\)?\s+THEN\s+p_kho_nhap\s+ELSE\s+p_kho_xuat\s+END/,
    );
  });

  it('view tồn kho chỉ trả kho trong phạm vi (không lộ dòng kho tỉnh tồn âm cho cán bộ xã)', () => {
    const i = schema.indexOf('CREATE VIEW public.kho_ton_kho_view');
    expect(schema.slice(i, schema.indexOf('GROUP BY', i))).toContain('fn_kho_xem_tat_ca()');
  });

  it.each([
    ['kho_danh_sach_kho', 'danh-sach-kho'],
    ['kho_danh_sach_hang_hoa', 'hang-hoa'],
    ['kho_danh_muc_hang_hoa', 'hang-hoa'],
    ['kho_don_vi_cuu_tro', 'don-vi-cuu-tro'],
    ['kho_dot_cuu_tro', 'dot-cuu-tro'],
  ])('danh mục %s: ghi gác bằng fn_co_quyen(%s)', (bang, moduleKey) => {
    const policies = schema.split('\n').filter((l) => l.startsWith('CREATE POLICY') && l.includes(` ON public.${bang} `));
    for (const [hau_to, hanh_dong] of [['them', 'them'], ['sua', 'sua'], ['xoa', 'xoa']]) {
      const p = policies.find((l) => l.startsWith(`CREATE POLICY ${bang}_${hau_to} `));
      expect(p, `${bang}_${hau_to}`).toContain(`fn_co_quyen('${moduleKey}'::text, '${hanh_dong}'::text)`);
    }
    for (const p of policies.filter((l) => !l.includes('FOR SELECT'))) expect(p).not.toMatch(/USING \(true\)|WITH CHECK \(true\)/);
  });

  it('hàm kiểm tồn chạy SECURITY DEFINER để thấy đủ phiếu của kho đang kiểm', () => {
    for (const fn of ['fn_kho_kiem_tra_ton_am', 'fn_kho_kiem_tra_ton_am_ct', 'fn_kho_kiem_tra_ton_am_phieu', 'fn_kho_kiem_tra_ton_kho']) {
      const i = schema.indexOf(`CREATE FUNCTION public.${fn}(`);
      expect(schema.slice(i, schema.indexOf('AS $', i)), fn).toContain('SECURITY DEFINER');
    }
  });
});
