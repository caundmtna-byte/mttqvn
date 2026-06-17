import { describe, expect, it } from 'vitest';
import {
  canLoadArticleList,
  resolveBaiVietListRpcScope,
  rowVisibleOnArticleList,
  type ArticleListViewer,
} from '../use-article-all-tab-viewer';
import type { BaiVietDanhSach } from '../../bai-viet/core/types';

function row(nguoi_tao: string | null, don_vi?: string | null): BaiVietDanhSach {
  return {
    id_nguoi_tao: nguoi_tao ?? '',
    id_don_vi_nguoi_tao: don_vi ?? null,
  } as BaiVietDanhSach;
}

const restricted: ArticleListViewer = {
  viewAll: false,
  viewerNhanVienId: '10',
};

describe('rowVisibleOnArticleList', () => {
  it('viewAll sees all rows', () => {
    const v: ArticleListViewer = { viewAll: true, viewerNhanVienId: null };
    expect(rowVisibleOnArticleList(v, row('99', '5'))).toBe(true);
    expect(rowVisibleOnArticleList(v, row('11', '6'))).toBe(true);
  });

  it('restricted user sees only own articles', () => {
    expect(rowVisibleOnArticleList(restricted, row('10', '5'))).toBe(true);
    expect(rowVisibleOnArticleList(restricted, row('11', '5'))).toBe(false);
  });

  it('Xã phường does not bypass via don_vi — only id_nguoi_tao', () => {
    expect(rowVisibleOnArticleList(restricted, row('10', '99'))).toBe(true);
    expect(rowVisibleOnArticleList(restricted, row('11', '5'))).toBe(false);
  });

  it('Tỉnh without viewAll sees only own articles', () => {
    expect(rowVisibleOnArticleList(restricted, row('10'))).toBe(true);
    expect(rowVisibleOnArticleList(restricted, row('99'))).toBe(false);
  });

  it('without nhan_vien_id sees nothing', () => {
    const v: ArticleListViewer = { viewAll: false, viewerNhanVienId: null };
    expect(rowVisibleOnArticleList(v, row('10'))).toBe(false);
  });
});

describe('resolveBaiVietListRpcScope', () => {
  it('viewAll uses all', () => {
    expect(resolveBaiVietListRpcScope({ viewAll: true, viewerNhanVienId: null })).toBe('all');
  });

  it('restricted uses mine', () => {
    expect(resolveBaiVietListRpcScope(restricted)).toBe('mine');
  });
});

describe('canLoadArticleList', () => {
  it('viewAll always loads', () => {
    expect(canLoadArticleList({ viewAll: true, viewerNhanVienId: null })).toBe(true);
  });

  it('requires nhan_vien_id when not viewAll', () => {
    expect(canLoadArticleList({ viewAll: false, viewerNhanVienId: null })).toBe(false);
    expect(canLoadArticleList(restricted)).toBe(true);
  });
});
