import { describe, expect, it } from 'vitest';
import {
  canLoadArticleAllTab,
  resolveBaiVietAllTabRpcScope,
  rowVisibleOnArticleAllTab,
  type ArticleAllTabViewer,
} from '../use-article-all-tab-viewer';
import type { BaiVietDanhSach } from '../../bai-viet/core/types';

function row(don_vi: string | null, nguoi_tao?: string | null): BaiVietDanhSach {
  return { id_don_vi_nguoi_tao: don_vi, id_nguoi_tao: nguoi_tao ?? null } as BaiVietDanhSach;
}

const xaViewer: ArticleAllTabViewer = {
  viewAll: false,
  chucVuCapQuanLy: 'Xã phường',
  viewerDonViId: '5',
  viewerNhanVienId: '10',
};

describe('rowVisibleOnArticleAllTab', () => {
  it('viewAll sees all', () => {
    const v: ArticleAllTabViewer = { ...xaViewer, viewAll: true };
    expect(rowVisibleOnArticleAllTab(v, row('99'))).toBe(true);
  });

  it('Tỉnh via viewAll', () => {
    const v: ArticleAllTabViewer = {
      viewAll: true,
      chucVuCapQuanLy: 'Tỉnh',
      viewerDonViId: null,
      viewerNhanVienId: null,
    };
    expect(rowVisibleOnArticleAllTab(v, row('5'))).toBe(true);
  });

  it('Xã phường matches don_vi only', () => {
    expect(rowVisibleOnArticleAllTab(xaViewer, row('5'))).toBe(true);
    expect(rowVisibleOnArticleAllTab(xaViewer, row('6'))).toBe(false);
    expect(rowVisibleOnArticleAllTab(xaViewer, row(null))).toBe(false);
  });

  it('Xã without viewer don_vi sees nothing', () => {
    const v: ArticleAllTabViewer = { ...xaViewer, viewerDonViId: null };
    expect(rowVisibleOnArticleAllTab(v, row('5'))).toBe(false);
  });

  it('null cap sees own articles only', () => {
    const v: ArticleAllTabViewer = {
      viewAll: false,
      chucVuCapQuanLy: null,
      viewerDonViId: '5',
      viewerNhanVienId: '10',
    };
    expect(rowVisibleOnArticleAllTab(v, row('99', '10'))).toBe(true);
    expect(rowVisibleOnArticleAllTab(v, row('99', '11'))).toBe(false);
    expect(rowVisibleOnArticleAllTab(v, row('99', null))).toBe(false);
  });

  it('null cap without nhan_vien_id sees nothing', () => {
    const v: ArticleAllTabViewer = {
      viewAll: false,
      chucVuCapQuanLy: null,
      viewerDonViId: '5',
      viewerNhanVienId: null,
    };
    expect(rowVisibleOnArticleAllTab(v, row('99', '10'))).toBe(false);
  });
});

describe('resolveBaiVietAllTabRpcScope', () => {
  it('Xã uses all_don_vi', () => {
    expect(resolveBaiVietAllTabRpcScope(xaViewer)).toBe('all_don_vi');
  });

  it('Tỉnh uses all', () => {
    expect(
      resolveBaiVietAllTabRpcScope({
        viewAll: true,
        chucVuCapQuanLy: 'Tỉnh',
        viewerDonViId: null,
        viewerNhanVienId: null,
      }),
    ).toBe('all');
  });

  it('null cap uses mine', () => {
    expect(
      resolveBaiVietAllTabRpcScope({
        viewAll: false,
        chucVuCapQuanLy: null,
        viewerDonViId: '5',
        viewerNhanVienId: '10',
      }),
    ).toBe('mine');
  });
});

describe('canLoadArticleAllTab', () => {
  it('blocks Xã without don_vi', () => {
    expect(canLoadArticleAllTab({ ...xaViewer, viewerDonViId: null })).toBe(false);
  });

  it('allows Xã with don_vi', () => {
    expect(canLoadArticleAllTab(xaViewer)).toBe(true);
  });

  it('blocks null cap without nhan_vien_id', () => {
    expect(
      canLoadArticleAllTab({
        viewAll: false,
        chucVuCapQuanLy: null,
        viewerDonViId: '5',
        viewerNhanVienId: null,
      }),
    ).toBe(false);
  });

  it('allows null cap with nhan_vien_id', () => {
    expect(
      canLoadArticleAllTab({
        viewAll: false,
        chucVuCapQuanLy: null,
        viewerDonViId: '5',
        viewerNhanVienId: '10',
      }),
    ).toBe(true);
  });
});
