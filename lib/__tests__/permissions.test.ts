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

  it('matrix: member with view on bc-thong-ke-bai-viet can view articleStats', () => {
    usePermissionGrantStore.getState().setMatrixGrants({
      'quan-ly-viet-bai/bc-thong-ke-bai-viet': ['view'],
    });
    expect(can(member, 'view', 'articleStats')).toBe(true);
    expect(can(member, 'edit', 'articleStats')).toBe(false);
  });

  it('matrix: departments — no grant and cap_bac≠1 cannot view', () => {
    usePermissionGrantStore.getState().setMatrixGrants(
      { 'he-thong/nhan-vien': ['view'] },
      2
    );
    expect(can(member, 'view', 'departments')).toBe(false);
    expect(can(member, 'edit', 'departments')).toBe(false);
  });

  it('matrix: departments — cap_bac=1 bypasses matrix for view/create/edit/delete', () => {
    usePermissionGrantStore.getState().setMatrixGrants({ 'he-thong/nhan-vien': ['view'] }, 1);
    expect(can(member, 'view', 'departments')).toBe(true);
    expect(can(member, 'create', 'departments')).toBe(true);
    expect(can(member, 'edit', 'departments')).toBe(true);
    expect(can(member, 'delete', 'departments')).toBe(true);
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
