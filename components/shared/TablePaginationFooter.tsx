import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import Button from '../ui/Button';
import Tooltip from '../ui/Tooltip';
import PageSizeSelect from './PageSizeSelect';
import { cn } from '../../lib/utils';

export interface TablePaginationFooterProps {
  /** Tổng số bản ghi khớp bộ lọc. */
  totalRecords: number;
  /** Trang hiện tại (1-based). */
  page: number;
  /** Số bản ghi mỗi trang. */
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  /** Số bản ghi đang được chọn (hiện kèm dấu ·). */
  selectedCount?: number;
  /** Các lựa chọn số dòng mỗi trang. */
  pageSizeOptions?: number[];
  className?: string;

  // --- Ghi đè cho bảng phân trang phía máy chủ ---
  /** Tổng số trang; mặc định tính từ totalRecords/pageSize. */
  totalPages?: number;
  /** Chỉ số dòng đầu/cuối đang hiển thị; mặc định tính từ page/pageSize. */
  rangeStart?: number;
  rangeEnd?: number;
  /** Chuỗi thay cho con số tổng (ví dụ '—' khi chưa biết tổng). */
  totalRecordsLabel?: string | null;
  /** Ẩn lựa chọn "Tất cả" trong ô số dòng mỗi trang. */
  disableAllOption?: boolean;
  /** Vô hiệu nút "trang cuối" (khi chưa biết trang cuối nằm ở đâu). */
  disableLastPage?: boolean;
}

/**
 * Footer phân trang dùng chung: khoảng đang xem · tổng · số đã chọn · số dòng
 * mỗi trang · nút đầu/trước/số trang/sau/cuối (nhấn đúp số trang để nhập).
 *
 * Đây là bản duy nhất trong repo — `GenericTable` và các bảng không dùng
 * `GenericTable` (chức vụ, phòng ban, tồn kho) đều render component này, để
 * phân trang ở mọi màn hình trông và hoạt động giống hệt nhau.
 */
export const TablePaginationFooter: React.FC<TablePaginationFooterProps> = ({
  totalRecords,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  selectedCount = 0,
  pageSizeOptions,
  className,
  totalPages: totalPagesProp,
  rangeStart: rangeStartProp,
  rangeEnd: rangeEndProp,
  totalRecordsLabel,
  disableAllOption = false,
  disableLastPage = false,
}) => {
  const [editingPage, setEditingPage] = useState(false);
  const [pageInput, setPageInput] = useState('');
  const pageInputRef = useRef<HTMLInputElement>(null);

  const totalPages = totalPagesProp ?? Math.max(1, Math.ceil(totalRecords / Math.max(1, pageSize)));
  const rangeStart =
    rangeStartProp ?? (totalRecords === 0 ? 0 : Math.min((page - 1) * pageSize + 1, totalRecords));
  const rangeEnd = rangeEndProp ?? Math.min(page * pageSize, totalRecords);

  const handleGoToPage = () => {
    const num = Number.parseInt(pageInput, 10);
    if (!Number.isNaN(num) && num >= 1 && num <= totalPages) onPageChange(num);
    setEditingPage(false);
    setPageInput('');
  };

  const startEditingPage = () => {
    setEditingPage(true);
    setPageInput(String(page));
    setTimeout(() => pageInputRef.current?.select(), 50);
  };

  return (
    <div
      className={cn(
        'border-t border-border px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2 shrink-0',
        className,
      )}
    >
      {/* Trái: khoảng đang xem + số đã chọn + số dòng mỗi trang */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
        <span className="tabular-nums">
          <span className="font-medium text-foreground">
            {rangeStart}–{rangeEnd}
          </span>
          <span className="text-muted-foreground/60">/Tổng:</span>
          <span className="font-semibold text-foreground">{totalRecordsLabel ?? totalRecords}</span>
        </span>

        {selectedCount > 0 && (
          <>
            <span className="text-primary font-medium hidden sm:inline">· {selectedCount} đã chọn</span>
            <span className="sm:hidden inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-primary/15 text-primary text-xs font-bold tabular-nums">
              {selectedCount}✓
            </span>
          </>
        )}

        <div className="flex items-center border-l border-border pl-2">
          <PageSizeSelect
            value={pageSize}
            onChange={onPageSizeChange}
            totalRecords={totalRecords}
            options={pageSizeOptions}
            compact={false}
            disableAllOption={disableAllOption}
            className="hidden sm:inline-flex"
          />
          <PageSizeSelect
            value={pageSize}
            onChange={onPageSizeChange}
            totalRecords={totalRecords}
            options={pageSizeOptions}
            perPageLabel=""
            compact
            disableAllOption={disableAllOption}
            className="sm:hidden"
            aria-label="Số bản ghi mỗi trang"
          />
        </div>
      </div>

      {/* Phải: điều hướng trang */}
      <div className="flex items-center gap-0.5">
        <Tooltip content="Trang đầu" placement="top">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => onPageChange(1)}
            className="h-6 w-6 p-0 border-border rounded hover:bg-primary hover:text-white hover:border-primary transition-colors"
          >
            <ChevronsLeft size={13} />
          </Button>
        </Tooltip>
        <Tooltip content="Trang trước" placement="top">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
            className="h-6 w-6 p-0 border-border rounded hover:bg-primary hover:text-white hover:border-primary transition-colors"
          >
            <ChevronLeft size={13} />
          </Button>
        </Tooltip>

        <Tooltip content="Nhấn đúp để nhập trang" placement="top">
          <div className="flex items-center gap-0.5 px-1">
            {editingPage ? (
              <input
                ref={pageInputRef}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ''))}
                onBlur={handleGoToPage}
                onKeyDown={(e) => e.key === 'Enter' && handleGoToPage()}
                aria-label="Nhập số trang"
                className="h-6 w-10 text-center text-xs font-bold border border-primary rounded bg-background text-foreground outline-none tabular-nums"
              />
            ) : (
              <span
                role="button"
                tabIndex={0}
                onDoubleClick={startEditingPage}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    startEditingPage();
                  }
                }}
                className="h-6 min-w-[24px] flex items-center justify-center rounded bg-primary text-white text-xs font-bold px-1 tabular-nums cursor-default"
              >
                {page}
              </span>
            )}
            <span className="text-muted-foreground/40 text-xs">/</span>
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {totalPages || 1}
            </span>
          </div>
        </Tooltip>

        <Tooltip content="Trang sau" placement="top">
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="h-6 w-6 p-0 border-border rounded hover:bg-primary hover:text-white hover:border-primary transition-colors"
          >
            <ChevronRight size={13} />
          </Button>
        </Tooltip>
        <Tooltip content="Trang cuối" placement="top">
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || disableLastPage}
            onClick={() => onPageChange(totalPages)}
            className="h-6 w-6 p-0 border-border rounded hover:bg-primary hover:text-white hover:border-primary transition-colors"
          >
            <ChevronsRight size={13} />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
};

export default TablePaginationFooter;
