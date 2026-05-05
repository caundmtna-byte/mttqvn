import type { User } from '../types';

/**
 * User can edit own profile if admin.
 * Later: extend with permissions from module "employees" or "profile" (e.g. update action).
 */
export function canEditProfile(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'admin';
}
