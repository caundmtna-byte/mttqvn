import { describe, expect, it, beforeEach } from 'vitest';
import { can, type AppResource } from '../permissions';
import type { User } from '@/types';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';

const admin: User = {
  id: '1',
  email: 'a@test.com',
  role: 'admin',
  created_at: '',
};

const member: User = {
  id: '2',
  email: 'u@test.com',
  role: 'user',
  created_at: '',
  /** Không có chức vụ thì `can()` deny toàn bộ module nghiệp vụ. */
  id_chuc_vu: '1',
};

beforeEach(() => {
  usePermissionGrantStore.getState().clearMatrix();
});

describe('can', () => {
  it('returns false when user is null', () => {
    expect(can(null, 'view', 'employees')).toBe(false);
  });

  it('admin can delete employees', () => {
    expect(can(admin, 'delete', 'employees')).toBe(true);
  });

  it('member without id_chuc_vu cannot access business modules', () => {
    const noChucVu: User = { ...member, id_chuc_vu: undefined };
    expect(can(noChucVu, 'view', 'employees')).toBe(false);
    expect(can(noChucVu, 'edit', 'profile')).toBe(false);
  });

  it('member can view but not delete employees before matrix hydrate', () => {
    expect(can(member, 'view', 'employees')).toBe(true);
    expect(can(member, 'delete', 'employees')).toBe(false);
  });

  it('member can edit profile', () => {
    expect(can(member, 'edit', 'profile')).toBe(true);
  });

  it('matrix: member with only view on nhan-vien cannot delete', () => {
    usePermissionGrantStore.getState().setMatrixGrants({
      'he-thong/nhan-vien': ['view'],
    });
    expect(can(member, 'view', 'employees')).toBe(true);
    expect(can(member, 'export', 'employees')).toBe(true);
    expect(can(member, 'import', 'employees')).toBe(true);
    expect(can(member, 'edit', 'employees')).toBe(false);
    expect(can(member, 'delete', 'employees')).toBe(false);
  });

  it('matrix: member with update on nhan-vien can edit', () => {
    usePermissionGrantStore.getState().setMatrixGrants({
      'he-thong/nhan-vien': ['view', 'update'],
    });
    expect(can(member, 'edit', 'employees')).toBe(true);
  });

  it('matrix: all grants full actions on module', () => {
    usePermissionGrantStore.getState().setMatrixGrants({
      'he-thong/nhan-vien': ['all'],
    });
    expect(can(member, 'delete', 'employees')).toBe(true);
  });

  it('matrix: member with view on thiet-lap-bai-viet can view articleSettings only', () => {
    usePermissionGrantStore.getState().setMatrixGrants({
      'quan-ly-viet-bai/thiet-lap-bai-viet': ['view'],
    });
    expect(can(member, 'view', 'articleSettings')).toBe(true);
    expect(can(member, 'edit', 'articleSettings')).toBe(false);
  });

  it('matrix: member with view on bai-viet can view articles only', () => {
    usePermissionGrantStore.getState().setMatrixGrants({
      'quan-ly-viet-bai/bai-viet': ['view'],
    });
    expect(can(member, 'view', 'articles')).toBe(true);
    expect(can(member, 'create', 'articles')).toBe(false);
  });

  it('matrix: member with view on bc-thong-ke-bai-viet can view and export articleStats', () => {
    usePermissionGrantStore.getState().setMatrixGrants({
      'quan-ly-viet-bai/bc-thong-ke-bai-viet': ['view'],
    });
    expect(can(member, 'view', 'articleStats')).toBe(true);
    expect(can(member, 'export', 'articleStats')).toBe(true);
    expect(can(member, 'import', 'articleStats')).toBe(true);
    expect(can(member, 'edit', 'articleStats')).toBe(false);
  });

  it('matrix: member with view on bao-cao-can-bo can view matTranOfficerStats', () => {
    usePermissionGrantStore.getState().setMatrixGrants({
      'mat-tran-to-quoc/thiet-lap-khac/bao-cao-can-bo': ['view'],
    });
    expect(can(member, 'view', 'matTranOfficerStats')).toBe(true);
    expect(can(member, 'edit', 'matTranOfficerStats')).toBe(false);
  });

  it('matrix: member with export on bao-cao-can-bo can export matTranOfficerStats', () => {
    usePermissionGrantStore.getState().setMatrixGrants({
      'mat-tran-to-quoc/thiet-lap-khac/bao-cao-can-bo': ['view', 'export'],
    });
    expect(can(member, 'export', 'matTranOfficerStats')).toBe(true);
  });

  it('matrix: member with view on bao-cao-uy-vien can view matTranCommitteeMemberStats', () => {
    usePermissionGrantStore.getState().setMatrixGrants({
      'mat-tran-to-quoc/uy-vien-uy-ban/bao-cao-uy-vien': ['view'],
    });
    expect(can(member, 'view', 'matTranCommitteeMemberStats')).toBe(true);
    expect(can(member, 'edit', 'matTranCommitteeMemberStats')).toBe(false);
  });

  it('matrix: member with export on bao-cao-uy-vien can export matTranCommitteeMemberStats', () => {
    usePermissionGrantStore.getState().setMatrixGrants({
      'mat-tran-to-quoc/uy-vien-uy-ban/bao-cao-uy-vien': ['view', 'export'],
    });
    expect(can(member, 'export', 'matTranCommitteeMemberStats')).toBe(true);
  });

  it('matrix: departments — no grant and cap_bac≠1 cannot view', () => {
    usePermissionGrantStore.getState().setMatrixGrants(
      { 'he-thong/nhan-vien': ['view'] },
      2
    );
    expect(can(member, 'view', 'departments')).toBe(false);
    expect(can(member, 'edit', 'departments')).toBe(false);
  });

  it('matrix: departments — cap_bac=1 bypasses matrix for view/create/edit/delete/export/import', () => {
    usePermissionGrantStore.getState().setMatrixGrants({ 'he-thong/nhan-vien': ['view'] }, 1);
    expect(can(member, 'view', 'departments')).toBe(true);
    expect(can(member, 'create', 'departments')).toBe(true);
    expect(can(member, 'edit', 'departments')).toBe(true);
    expect(can(member, 'delete', 'departments')).toBe(true);
    expect(can(member, 'export', 'departments')).toBe(true);
    expect(can(member, 'import', 'departments')).toBe(true);
  });

  it('matrix: departments — view on phong-ban module grants view only', () => {
    usePermissionGrantStore.getState().setMatrixGrants({ 'he-thong/phong-ban': ['view'] }, 2);
    expect(can(member, 'view', 'departments')).toBe(true);
    expect(can(member, 'delete', 'departments')).toBe(false);
  });

  it('matrix: departments — admin token in matrix grants full CRUD', () => {
    usePermissionGrantStore.getState().setMatrixGrants({ 'he-thong/phong-ban': ['admin'] }, 9);
    expect(can(member, 'delete', 'departments')).toBe(true);
  });

  it('matrix: annualPrograms — view on chuong-trinh-nam module grants view only', () => {
    usePermissionGrantStore.getState().setMatrixGrants({ 'quan-ly-giao-viec/chuong-trinh-nam': ['view'] }, 2);
    expect(can(member, 'view', 'annualPrograms')).toBe(true);
    expect(can(member, 'create', 'annualPrograms')).toBe(false);
    expect(can(member, 'delete', 'annualPrograms')).toBe(false);
  });

  it('matrix: annualPrograms — update grants edit', () => {
    usePermissionGrantStore.getState().setMatrixGrants(
      { 'quan-ly-giao-viec/chuong-trinh-nam': ['view', 'update'] },
      2
    );
    expect(can(member, 'edit', 'annualPrograms')).toBe(true);
  });
});

const RELIEF_WAREHOUSE_MODULES: {
  resource: AppResource;
  moduleId: string;
  label: string;
}[] = [
  {
    resource: 'matTranReliefCampaign',
    moduleId: 'mat-tran-to-quoc/kho-cuu-tro/dot-cuu-tro',
    label: 'dot-cuu-tro',
  },
  {
    resource: 'matTranReliefGoods',
    moduleId: 'mat-tran-to-quoc/kho-cuu-tro/hang-hoa',
    label: 'hang-hoa',
  },
  {
    resource: 'matTranReliefStockTransactions',
    moduleId: 'mat-tran-to-quoc/kho-cuu-tro/nhap-xuat-kho',
    label: 'nhap-xuat-kho',
  },
  {
    resource: 'matTranReliefInventory',
    moduleId: 'mat-tran-to-quoc/kho-cuu-tro/ton-kho',
    label: 'ton-kho',
  },
  {
    resource: 'matTranReliefWarehouseList',
    moduleId: 'mat-tran-to-quoc/kho-cuu-tro/danh-sach-kho',
    label: 'danh-sach-kho',
  },
  {
    resource: 'matTranReliefSupportUnits',
    moduleId: 'mat-tran-to-quoc/kho-cuu-tro/don-vi-cuu-tro',
    label: 'don-vi-cuu-tro',
  },
  {
    resource: 'matTranReliefSupportReport',
    moduleId: 'mat-tran-to-quoc/kho-cuu-tro/bao-cao-ho-tro',
    label: 'bao-cao-ho-tro',
  },
];

describe.each(RELIEF_WAREHOUSE_MODULES)(
  'matrix: Kho cứu trợ — $label',
  ({ resource, moduleId }) => {
    beforeEach(() => {
      usePermissionGrantStore.getState().clearMatrix();
    });

    it('view token grants view/export only', () => {
      usePermissionGrantStore.getState().setMatrixGrants({ [moduleId]: ['view'] }, 2);
      expect(can(member, 'view', resource)).toBe(true);
      expect(can(member, 'export', resource)).toBe(true);
      expect(can(member, 'create', resource)).toBe(false);
      expect(can(member, 'edit', resource)).toBe(false);
      expect(can(member, 'delete', resource)).toBe(false);
    });

    it('quan_tri (admin token) grants full CRUD', () => {
      usePermissionGrantStore.getState().setMatrixGrants({ [moduleId]: ['admin'] }, 4);
      expect(can(member, 'create', resource)).toBe(true);
      expect(can(member, 'delete', resource)).toBe(true);
    });

    it('cap_bac=1 bypasses matrix', () => {
      usePermissionGrantStore.getState().setMatrixGrants({}, 1);
      expect(can(member, 'delete', resource)).toBe(true);
      expect(can(member, 'import', resource)).toBe(true);
    });
  },
);
