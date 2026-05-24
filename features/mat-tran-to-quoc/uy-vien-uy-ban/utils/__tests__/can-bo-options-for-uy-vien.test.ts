import { describe, expect, it } from 'vitest';
import type { MttqCanBo } from '@/features/mat-tran-to-quoc/danh-sach-can-bo/core/types';
import type { MttqUyVienUyBanViewer } from '../../hooks/use-mttq-uy-vien-uy-ban-viewer';
import {
  buildUyVienCanBoOptions,
  filterCanBoForUyVienForm,
} from '../can-bo-options-for-uy-vien';

function canBo(id: string, don_vi_id: string | null): MttqCanBo {
  return {
    id,
    ho_ten: `CB ${id}`,
    don_vi_id,
  } as MttqCanBo;
}

const xaViewer: MttqUyVienUyBanViewer = {
  canViewAll: false,
  chucVuCapQuanLy: 'Xã phường',
  viewerNhanVienId: '10',
  viewerDonViId: '5',
};

describe('filterCanBoForUyVienForm', () => {
  const list = [canBo('1', '5'), canBo('2', '6'), canBo('3', null)];

  it('Xã phường keeps same don_vi_id only', () => {
    const out = filterCanBoForUyVienForm(xaViewer, list);
    expect(out.map((c) => c.id)).toEqual(['1']);
  });

  it('Xã phường without viewer don_vi returns empty', () => {
    const out = filterCanBoForUyVienForm(
      { ...xaViewer, viewerDonViId: null },
      list,
    );
    expect(out).toEqual([]);
  });

  it('Tỉnh returns all', () => {
    const out = filterCanBoForUyVienForm(
      { ...xaViewer, chucVuCapQuanLy: 'Tỉnh' },
      list,
    );
    expect(out).toHaveLength(3);
  });

  it('canViewAll returns all', () => {
    const out = filterCanBoForUyVienForm({ ...xaViewer, canViewAll: true }, list);
    expect(out).toHaveLength(3);
  });
});

describe('buildUyVienCanBoOptions', () => {
  const list = [canBo('1', '5'), canBo('2', '6')];

  it('ensures current can_bo on edit when outside filtered list', () => {
    const opts = buildUyVienCanBoOptions({
      viewer: xaViewer,
      canBoList: list,
      ensureCanBoId: '2',
      ensureCanBoLabel: 'Nguyen Van B',
    });
    expect(opts.some((o) => o.value === '2')).toBe(true);
    expect(opts.some((o) => o.value === '1')).toBe(true);
    expect(opts.find((o) => o.value === '2')?.label).toBe('CB 2');
  });

  it('ensures label fallback when can_bo not in list', () => {
    const opts = buildUyVienCanBoOptions({
      viewer: xaViewer,
      canBoList: [canBo('1', '5')],
      ensureCanBoId: '99',
      ensureCanBoLabel: 'Nguyen Van B',
    });
    expect(opts.some((o) => o.value === '99' && o.label.includes('Nguyen'))).toBe(true);
  });
});
