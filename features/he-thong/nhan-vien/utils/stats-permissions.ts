/**
 * Permission helpers for Stats / Dashboard.
 * Backend API should enforce the same rules.
 */

import { MAX_DATE_RANGE_MONTHS_NON_ADMIN } from '../core/stats-constants';
import type { StatsDateRange } from '../core/stats-types';
import { formatDate } from '../../../../lib/utils';

export type UserRole = 'admin' | 'user';

/**
 * Whether the current user can export stats report (Excel/PDF).
 * Default: allow both; set to admin-only if your policy requires.
 */
export function canExportStats(_role: UserRole | undefined): boolean {
  return true; // or: role === 'admin';
}

/**
 * Clamp date range for non-admin: end date cannot be older than N months.
 * Returns a new range if clamped, or the same range.
 */
export function clampDateRangeForRole(
  dateRange: StatsDateRange,
  role: UserRole | undefined
): StatsDateRange {
  if (role === 'admin') return dateRange;
  const now = new Date();
  const limit = new Date(now.getFullYear(), now.getMonth() - MAX_DATE_RANGE_MONTHS_NON_ADMIN, now.getDate());
  if (dateRange.end >= limit) return dateRange;
  const newEnd = new Date(limit);
  const newStart = new Date(dateRange.start);
  if (newStart > newEnd) newStart.setTime(newEnd.getTime());
  return {
    ...dateRange,
    start: newStart,
    end: newEnd,
    label: dateRange.preset === 'custom' ? `${formatDate(newStart)} – ${formatDate(newEnd)}` : dateRange.label,
  };
}
