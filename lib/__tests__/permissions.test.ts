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
});
