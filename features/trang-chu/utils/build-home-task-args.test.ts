import { describe, expect, it } from 'vitest';
import { TASK_REPORT_ALL_RANGE_START } from '@/features/quan-ly-giao-viec/bao-cao-cong-viec/utils/build-rpc-args';
import {
  buildMyAssignedOpenKpiArgs,
  buildMyTasksKpiArgs,
  homeTodayIso,
  resolveHomeViewerId,
  HOME_TRANG_THAI_CHUA_XONG,
} from './build-home-task-args';

const NOW = new Date(2026, 8, 11, 15, 30); // 11/09/2026 giờ địa phương

describe('homeTodayIso', () => {
  it('dùng lịch địa phương, không lệch ngày vì UTC', () => {
    expect(homeTodayIso(new Date(2026, 0, 1, 0, 30))).toBe('2026-01-01');
    expect(homeTodayIso(new Date(2026, 11, 31, 23, 30))).toBe('2026-12-31');
  });
});

describe('resolveHomeViewerId', () => {
  it('nhận cả chuỗi lẫn số', () => {
    expect(resolveHomeViewerId('42')).toBe(42);
    expect(resolveHomeViewerId(42)).toBe(42);
  });

  it('tài khoản chưa gắn hồ sơ nhân viên ⇒ null', () => {
    expect(resolveHomeViewerId(null)).toBeNull();
    expect(resolveHomeViewerId(undefined)).toBeNull();
    expect(resolveHomeViewerId('   ')).toBeNull();
    expect(resolveHomeViewerId('abc')).toBeNull();
  });
});

describe('buildMyTasksKpiArgs — việc tôi phụ trách', () => {
  const args = buildMyTasksKpiArgs(42, NOW);

  it('lọc đúng người phụ trách là chính mình', () => {
    expect(args.p_id_trach_nhiem).toEqual([42]);
    expect(args.p_id_nguoi_tao).toBeNull();
  });

  it('quét toàn bộ thời gian đến hôm nay', () => {
    expect(args.p_start).toBe(TASK_REPORT_ALL_RANGE_START);
    expect(args.p_end).toBe('2026-09-11');
  });

  it('KHÔNG BAO GIỜ bật p_view_all và chỉ gửi đúng một tiêu chí phạm vi', () => {
    expect(args.p_view_all).toBe(false);
    expect(args.p_viewer_id).toBe(42);
    expect(args.p_viewer_don_vi_id).toBeNull();
    expect(args.p_viewer_phong_ban_id).toBeNull();
  });
});

describe('buildMyAssignedOpenKpiArgs — việc tôi giao chưa xong', () => {
  const args = buildMyAssignedOpenKpiArgs(42, NOW);

  it('lọc theo người tạo là chính mình', () => {
    expect(args.p_id_nguoi_tao).toEqual([42]);
    expect(args.p_id_trach_nhiem).toBeNull();
  });

  it('chỉ đếm trạng thái chưa xong — không gồm Hoàn thành và Hủy', () => {
    expect(args.p_trang_thai).toEqual(HOME_TRANG_THAI_CHUA_XONG);
    expect(args.p_trang_thai).not.toContain('Hoàn thành');
    expect(args.p_trang_thai).not.toContain('Hủy');
  });

  it('phạm vi vẫn khoá chặt ở chính mình', () => {
    expect(args.p_view_all).toBe(false);
    expect(args.p_viewer_don_vi_id).toBeNull();
    expect(args.p_viewer_phong_ban_id).toBeNull();
  });
});
