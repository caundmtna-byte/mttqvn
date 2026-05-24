import { describe, expect, it } from 'vitest';
import {
  canLoadArticleAllTab,
  resolveBaiVietAllTabRpcScope,
  rowVisibleOnArticleAllTab,
  type ArticleAllTabViewer,
} from '../use-article-all-tab-viewer';
import type { BaiVietDanhSach } from '../../bai-viet/core/types';

function row(don_vi: string | null): BaiVietDanhSach {
  return { id_don_vi_nguoi_tao: don_vi } as BaiVietDanhSach;
}

const xaViewer: ArticleAllTabViewer = {
  viewAll: false,
  chucVuCapQuanLy: 'Xã phường',
  viewerDonViId: '5',
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

  it('null cap sees all', () => {
    const v: ArticleAllTabViewer = {
      viewAll: false,
      chucVuCapQuanLy: null,
      viewerDonViId: '5',
    };
    expect(rowVisibleOnArticleAllTab(v, row('99'))).toBe(true);
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
      }),
    ).toBe('all');
  });
});

describe('canLoadArticleAllTab', () => {
  it('blocks Xã without don_vi', () => {
    expect(canLoadArticleAllTab({ ...xaViewer, viewerDonViId: null })).toBe(false);
  });

  it('allows Xã with don_vi', () => {
    expect(canLoadArticleAllTab(xaViewer)).toBe(true);
  });
});
