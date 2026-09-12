import React, { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { toast } from 'sonner';
import { WifiOff } from 'lucide-react';

/**
 * Đăng ký Service Worker (PWA) + chỉ báo mất mạng.
 *
 * `onOfflineReady` trước đây hiện "Ứng dụng sẵn sàng dùng offline." — **nói sai
 * sự thật**: Service Worker chỉ cache giao diện, còn mọi dữ liệu nghiệp vụ vẫn
 * phải gọi Supabase. Cán bộ xã vùng sóng yếu đọc câu đó rồi mở app khi mất mạng
 * sẽ chỉ thấy màn hình trống và không hiểu tại sao. Nay nói đúng phạm vi: giao
 * diện mở được, dữ liệu thì cần mạng.
 *
 * Bổ sung chỉ báo mất mạng thật (trước đây `navigator.onLine` không được dùng ở
 * đâu): một dải nhỏ cố định để người dùng biết ngay vì sao thao tác không chạy,
 * thay vì nghĩ là ứng dụng hỏng.
 */
const PwaRegister: React.FC = () => {
  const [offline, setOffline] = useState(() =>
    typeof navigator === 'undefined' ? false : !navigator.onLine,
  );

  useEffect(() => {
    const updateSW = registerSW({
      onNeedRefresh() {
        toast.info('Đã có bản cập nhật mới.', {
          description: 'Nhấn "Tải lại" để cập nhật ứng dụng.',
          action: {
            label: 'Tải lại',
            onClick: () => updateSW(true),
          },
          duration: Infinity,
        });
      },
      onOfflineReady() {
        toast.success('Đã lưu giao diện để mở nhanh hơn.', {
          description: 'Mất mạng vẫn mở được ứng dụng, nhưng dữ liệu thì cần có mạng.',
        });
      },
    });
  }, []);

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[300] flex items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-xs font-medium text-amber-950 shadow-lg"
    >
      <WifiOff size={14} aria-hidden />
      <span>Đang mất kết nối mạng — dữ liệu chưa được lưu lên hệ thống.</span>
    </div>
  );
};

export default PwaRegister;
