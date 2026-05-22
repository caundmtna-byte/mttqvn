import { describe, expect, it, beforeEach } from 'vitest';
import { can } from '../permissions';
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
  /** Ma trận bật (`VITE_USE_PERMISSION_MATRIX`) — không có chức vụ thì `can()` deny toàn bộ. */
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

  it('member can view but not delete employees (legacy matrix off)', () => {
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

  it('matrix: matTranReliefGoods — view on hang-hoa module only', () => {
    usePermissionGrantStore.getState().setMatrixGrants(
      { 'mat-tran-to-quoc/kho-cuu-tro/hang-hoa': ['view'] },
      2
    );
    expect(can(member, 'view', 'matTranReliefGoods')).toBe(true);
    expect(can(member, 'export', 'matTranReliefGoods')).toBe(true);
    expect(can(member, 'create', 'matTranReliefGoods')).toBe(false);
    expect(can(member, 'edit', 'matTranReliefGoods')).toBe(false);
    expect(can(member, 'delete', 'matTranReliefGoods')).toBe(false);
  });

  it('matrix: matTranReliefGoods — quan_tri (admin token) grants full CRUD', () => {
    usePermissionGrantStore.getState().setMatrixGrants(
      { 'mat-tran-to-quoc/kho-cuu-tro/hang-hoa': ['admin'] },
      4
    );
    expect(can(member, 'create', 'matTranReliefGoods')).toBe(true);
    expect(can(member, 'delete', 'matTranReliefGoods')).toBe(true);
  });

  it('matrix: matTranReliefGoods — cap_bac=1 bypasses matrix', () => {
    usePermissionGrantStore.getState().setMatrixGrants({}, 1);
    expect(can(member, 'delete', 'matTranReliefGoods')).toBe(true);
    expect(can(member, 'import', 'matTranReliefGoods')).toBe(true);
  });
});
