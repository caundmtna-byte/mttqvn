import React from 'react';
import { create } from 'zustand';

type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmOptions {
  title: string;
  message: React.ReactNode;
  variant?: ConfirmVariant;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  /**
   * Mặc định `false`: hộp thoại KHÔNG tự báo lỗi, chỉ giữ nguyên màn hình để thử lại.
   *
   * Lý do: mọi thao tác trong `onConfirm` đều đi qua React Query, mà `index.tsx` đã
   * gắn sẵn `queryCache.onError` và `defaultOptions.mutations.onError` để hiện thông báo
   * lỗi. Nếu hộp thoại báo thêm một lần nữa thì người dùng thấy **hai thông báo trùng nhau**.
   * Chỉ bật `true` khi `onConfirm` làm việc gì đó ngoài React Query.
   */
  showErrorToast?: boolean;
}

interface ConfirmState {
  isOpen: boolean;
  isLoading: boolean;
  options: ConfirmOptions;
  confirm: (options: ConfirmOptions) => void;
  close: () => void;
  setLoading: (loading: boolean) => void;
}

const defaultOptions: ConfirmOptions = {
  title: 'Xác nhận',
  message: 'Bạn có chắc chắn muốn thực hiện hành động này?',
  variant: 'warning',
  confirmText: 'Xác nhận',
  cancelText: 'Hủy bỏ',
  onConfirm: () => {},
};

export const useConfirmStore = create<ConfirmState>((set) => ({
  isOpen: false,
  isLoading: false,
  options: defaultOptions,
  confirm: (options) => set({ 
    isOpen: true, 
    options: { ...defaultOptions, ...options } 
  }),
  close: () => set({ isOpen: false, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
}));