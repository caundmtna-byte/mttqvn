import { describe, expect, it } from 'vitest';
import { scrubEvent } from './sentry';

describe('scrubEvent — lọc dữ liệu cá nhân trước khi gửi đi', () => {
  it('bỏ query string khỏi URL, giữ lại đường dẫn để biết màn hình nào lỗi', () => {
    const e = scrubEvent({
      request: { url: 'https://app.example/mat-tran-to-quoc/danh-sach-can-bo?q=Nguy%E1%BB%85n&id=42' },
    });
    expect(e.request?.url).toBe('https://app.example/mat-tran-to-quoc/danh-sach-can-bo');
  });

  it('URL hỏng thì bỏ hẳn còn hơn gửi nguyên', () => {
    const e = scrubEvent({ request: { url: 'khong-phai-url ?q=bang-luong' } });
    expect(e.request?.url).toBeUndefined();
  });

  it('bỏ email, IP, họ tên khỏi thông tin người dùng', () => {
    const e = scrubEvent({
      user: { id: '42', username: 'xa.monson', email: 'a@b.c', ip_address: '1.2.3.4', full_name: 'Nguyễn Văn A' },
    });
    expect(e.user).toEqual({ id: '42', username: 'xa.monson' });
  });

  it('sự kiện không có request/user thì giữ nguyên', () => {
    const input = { level: 'error' } as { level: string; request?: { url?: string } };
    expect(scrubEvent(input)).toBe(input);
  });
});
