import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, ShieldCheck, X } from 'lucide-react';
import Button from '../../../../components/ui/Button';
import { txt } from '../../../../lib/text';
import { DIALOG_SIZE, Z_INDEX_APP_MODAL_CLASS } from '../../../../lib/dialog-sizes';
import { cn } from '../../../../lib/utils';
import type { AuthConflictDecision } from '../services/nhan-vien-service';

interface Props {
  /** Hiện dialog khi `username` truthy. */
  username: string | null;
  isLoading?: boolean;
  onCancel: () => void;
  onChoose: (decision: AuthConflictDecision) => void;
}

/**
 * Dialog xác nhận khi tạo/đổi nhân viên mà email Auth `<ten_tai_khoan>@gmail.com`
 * đã tồn tại trên Supabase. Cho phép admin chọn:
 *  - `reset` → đặt lại mật khẩu về 123456 (sẽ override password cũ)
 *  - `keep`  → giữ nguyên mật khẩu cũ; chỉ liên kết hồ sơ nhân viên
 */
const AuthConflictDialog: React.FC<Props> = ({ username, isLoading = false, onCancel, onChoose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const isOpen = !!username;

  useEffect(() => {
    if (!isOpen) return;
    const el = dialogRef.current;
    el?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, isLoading, onCancel]);

  const email = username ? `${username}@gmail.com` : '';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={cn('fixed inset-0 flex items-center justify-center p-4', Z_INDEX_APP_MODAL_CLASS)}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!isLoading ? onCancel : undefined}
            className="absolute inset-0 bg-black/40 dark:bg-black/60"
          />
          <motion.div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="auth-conflict-title"
            tabIndex={-1}
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className={cn(
              'relative bg-card rounded-xl p-6 w-full shadow-2xl border border-border/40 outline-none',
              DIALOG_SIZE.MEDIUM,
            )}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <KeyRound size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 id="auth-conflict-title" className="text-base font-semibold text-foreground mb-1">
                  {txt('employee.authConflict.title')}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {txt('employee.authConflict.desc', { email })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => onChoose('reset')}
                className="text-left p-4 rounded-lg border border-border hover:border-primary/60 hover:bg-primary/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2 mb-1.5 text-primary">
                  <KeyRound size={16} />
                  <span className="text-sm font-semibold">{txt('employee.authConflict.optionResetTitle')}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {txt('employee.authConflict.optionResetDesc')}
                </p>
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => onChoose('keep')}
                className="text-left p-4 rounded-lg border border-border hover:border-primary/60 hover:bg-primary/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2 mb-1.5 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck size={16} />
                  <span className="text-sm font-semibold">{txt('employee.authConflict.optionKeepTitle')}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {txt('employee.authConflict.optionKeepDesc')}
                </p>
              </button>
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="min-w-[110px] h-10 rounded-lg"
              >
                {txt('common.cancel')}
              </Button>
            </div>

            {!isLoading && (
              <button
                type="button"
                onClick={onCancel}
                aria-label={txt('common.cancel')}
                className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AuthConflictDialog;
