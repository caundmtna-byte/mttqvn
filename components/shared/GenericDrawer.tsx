import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useIsMaxWidth, useMediaQuery } from '../../lib/use-media-query';
import { txt } from '../../lib/text';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useConfirmStore } from '../../store/useConfirmStore';
import {
  getDrawerWidthClass,
  DRAWER_WIDTH_FORM,
  DRAWER_WIDTH_DETAIL,
  DRAWER_Z_BASE,
  DRAWER_Z_CONTENT_BASE,
} from '../../lib/dialog-sizes';

export { DRAWER_WIDTH_FORM, DRAWER_WIDTH_DETAIL };

/**
 * Đóng form có kiểm tra "đang sửa dở": `isDirty` false thì đóng ngay (hành vi cũ),
 * true thì hỏi xác nhận qua `useConfirmStore` rồi mới đóng.
 *
 * Dùng chung cho `GenericDrawer` (Esc / click nền / nút X) và `FormDrawerFooter` (nút Hủy)
 * để một biểu mẫu chỉ có đúng một cách hỏi.
 */
export function closeWithDirtyGuard(isDirty: boolean, onClose: () => void): void {
  if (!isDirty) {
    onClose();
    return;
  }
  useConfirmStore.getState().confirm({
    title: txt('common.unsavedTitle'),
    message: txt('common.unsavedMessage'),
    variant: 'warning',
    confirmText: txt('common.unsavedConfirm'),
    cancelText: txt('common.unsavedCancel'),
    onConfirm: onClose,
  });
}

interface GenericDrawerProps {
  title: string;
  /** Chuỗi hoặc ReactNode (vd. badge màu) */
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Class width (mặc định theo stackLevel). Truyền khi cần override. */
  maxWidthClass?: string;
  variant?: 'drawer' | 'modal';
  /** 0 = drawer nền (48rem), >= 1 = drawer chồng (44rem) + z-index tăng */
  stackLevel?: number;
  /** Footer gọn hơn (padding dọc nhỏ) — dùng khi nút dùng size sm/h-8 */
  footerCompact?: boolean;
  /**
   * Biểu mẫu bên trong đang sửa dở (React Hook Form: `formState.isDirty`).
   * Khi true, Esc / click nền / nút X sẽ hỏi xác nhận trước khi đóng.
   * Không truyền = hành vi cũ (đóng ngay).
   */
  isDirty?: boolean;
}

const GenericDrawer: React.FC<GenericDrawerProps> = ({
  title,
  subtitle,
  icon,
  onClose,
  children,
  footer,
  maxWidthClass: maxWidthClassProp,
  variant = 'drawer',
  stackLevel = 0,
  footerCompact = false,
  isDirty = false,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [drawerPanelWillChange, setDrawerPanelWillChange] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const isDirtyRef = useRef(isDirty);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);
  /** Mọi lối đóng drawer đều đi qua đây để dùng chung một lần hỏi xác nhận. */
  const requestClose = useCallback(() => {
    closeWithDirtyGuard(isDirtyRef.current, () => onCloseRef.current());
  }, []);
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const isMobile = useIsMaxWidth(768);
  const isModal = variant === 'modal';
  /** Trên mobile, modal hiển thị full-screen thay vì hộp giữa màn hình */
  const modalFullScreen = isModal && isMobile;
  const widthClass = maxWidthClassProp ?? getDrawerWidthClass(stackLevel);
  const zOffset = isModal ? 5 : stackLevel * 2;
  const zIndexBackdrop = DRAWER_Z_BASE + zOffset;
  const zIndexContent = DRAWER_Z_CONTENT_BASE + zOffset;

  // Save opener for focus restore on close
  useEffect(() => {
    openerRef.current = document.activeElement as HTMLElement | null;
    return () => {
      if (openerRef.current && typeof openerRef.current.focus === 'function') {
        openerRef.current.focus({ preventScroll: true });
      }
    };
  }, []);

  // Escape key to close + focus trap (onClose via ref — tránh re-bind khi parent render)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Hộp xác nhận "chưa lưu" đang mở: Esc là để trả lời hộp đó, không phải mở lại.
        if (useConfirmStore.getState().isOpen) return;
        requestClose();
        return;
      }
      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    setTimeout(() => drawerRef.current?.focus(), prefersReducedMotion ? 0 : 100);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [prefersReducedMotion, requestClose]);

  const Content = (
    <>
      <div
        className={`flex items-center justify-between gap-4 border-b border-border/60 bg-card shrink-0 ${!modalFullScreen && isModal ? 'rounded-t-2xl' : ''}`}
        style={{
          paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))',
          paddingBottom: '0.5rem',
          paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-foreground leading-tight truncate">
              {title}
            </h3>
            {subtitle != null && subtitle !== '' && (
              typeof subtitle === 'string' ? (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 break-words">{subtitle}</p>
              ) : (
                // `flex-wrap` là bắt buộc: subtitle dạng ReactNode thường là Fragment
                // gồm nhiều đoạn chữ; không cho xuống dòng thì mỗi đoạn là một flex
                // item bị bóp lại trên CÙNG một hàng và chữ đè lên nhau.
                <div className="mt-0.5 flex flex-wrap items-center gap-x-1 min-w-0 text-xs leading-snug text-muted-foreground break-words">
                  {subtitle}
                </div>
              )
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={requestClose}
          aria-label={txt('common.close')}
          className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-90 shrink-0"
        >
          <X size={20} className="stroke-[2.5px]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-muted/50 p-4 sm:p-5 custom-scrollbar">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </div>

      {footer && (
        <div
          className={`bg-card border-t border-border/60 flex flex-col-reverse sm:flex-row items-center shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.05)] dark:shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.3)] shrink-0 w-full ${footerCompact ? 'gap-2' : 'gap-3'} ${!modalFullScreen && isModal ? 'rounded-b-2xl' : ''}`}
          style={{
            paddingTop: footerCompact ? '0.25rem' : '0.5rem',
            paddingBottom: footerCompact
              ? 'max(0.5rem, env(safe-area-inset-bottom, 0px))'
              : 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
            paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
            paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
          }}
        >
          {footer}
        </div>
      )}
    </>
  );

  const reduceMotion = prefersReducedMotion;
  const backdropMotion = reduceMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } }
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
  const drawerSlideMotion = reduceMotion
    ? { initial: { x: 0 }, animate: { x: 0 }, exit: { x: 0 } }
    : { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } };
  const modalEnterMotion = modalFullScreen
    ? (reduceMotion
        ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 1, y: 0 } }
        : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 20 } })
    : (reduceMotion
        ? { initial: { opacity: 1, scale: 1, y: 0 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 1, scale: 1, y: 0 } }
        : { initial: { opacity: 0, scale: 0.9, y: 30 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.9, y: 30 } });
  const springTransition = reduceMotion
    ? { type: 'tween' as const, duration: 0 }
    : { type: 'spring' as const, damping: 30, stiffness: 300 };
  const fadeTransition = reduceMotion
    ? { type: 'tween' as const, duration: 0 }
    : { type: 'tween' as const, duration: 0.2 };

  return (
    <>
      <motion.div
        {...backdropMotion}
        transition={fadeTransition}
        onClick={requestClose}
        className="fixed inset-0 bg-black/45"
        style={{ zIndex: zIndexBackdrop }}
      />

      {isModal ? (
        <div className={`fixed inset-0 pointer-events-none ${modalFullScreen ? 'flex flex-col' : 'flex items-center justify-center p-4'}`} style={{ zIndex: zIndexContent }}>
          <motion.div
            initial={modalEnterMotion.initial}
            animate={modalEnterMotion.animate}
            exit={modalEnterMotion.exit}
            transition={springTransition}
            className={`w-full bg-card shadow-ultra flex flex-col pointer-events-auto border border-border/40 outline-none ${modalFullScreen ? 'h-full min-h-[100dvh] max-h-none rounded-none' : `${widthClass} max-h-[90vh] rounded-2xl`}`}
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
          >
            {Content}
          </motion.div>
        </div>
      ) : (
        <motion.div
          initial={drawerSlideMotion.initial}
          animate={drawerSlideMotion.animate}
          exit={drawerSlideMotion.exit}
          transition={springTransition}
          onAnimationStart={() => { if (!reduceMotion) setDrawerPanelWillChange(true); }}
          onAnimationComplete={() => setDrawerPanelWillChange(false)}
          className={`fixed inset-y-0 right-0 w-full ${widthClass} bg-card shadow-ultra flex flex-col h-[100dvh] border-l border-border/40 outline-none transform-gpu`}
          style={{
            zIndex: zIndexContent,
            willChange: drawerPanelWillChange ? 'transform' : undefined,
          }}
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          tabIndex={-1}
        >
          {Content}
        </motion.div>
      )}
    </>
  );
};

export default GenericDrawer;
