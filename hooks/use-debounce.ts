import { useState, useEffect } from 'react';

/**
 * Trả về giá trị debounced — chỉ cập nhật sau khi `value` ngừng thay đổi
 * trong `delayMs` milliseconds. Dùng để giảm số lần query / re-render khi
 * user đang gõ nhanh.
 *
 * @example
 * const debouncedSearch = useDebounce(searchTerm, 300);
 * // Chỉ fetch khi debouncedSearch thay đổi, không fetch sau mỗi ký tự.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
