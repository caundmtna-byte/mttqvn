import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowUp, ArrowDown, Sigma } from 'lucide-react';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';
import LoadingSpinnerWithText from './LoadingSpinnerWithText';
import TableSkeleton, { type TableSkeletonColumn } from './TableSkeleton';
import CardListSkeleton from './CardListSkeleton';
import TablePaginationFooter from './TablePaginationFooter';
import { cn } from '../../lib/utils';
import type { ColumnConfig, SortState } from '../../store/createGenericStore';
import { getColumnCellStyle } from '../../store/createGenericStore';
import {
  TABLE_CHECKBOX_WIDTH,
  TABLE_ACTION_COLUMN_WIDTH,
  DEFAULT_DATA_COLUMN_MIN_WIDTH,
  computeDataTableMinWidth,
} from '../../lib/table-layout-widths';

/** Ngưỡng kích hoạt virtual scroll tự động (số dòng trên trang) */
const VIRTUAL_THRESHOLD = 50;

interface GenericTableProps<T> {
  data: T[];
  columns: ColumnConfig[];
  isLoading: boolean;

  // Selection
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onToggleAll: (ids: string[]) => void;

  // Pagination
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;

  // Sort
  sort?: SortState;
  onSort?: (column: string | null, direction: 'asc' | 'desc' | null) => void;

  // Renders
  renderCell: (colId: string, item: T) => React.ReactNode;
  renderMobileCard: (item: T, isSelected: boolean) => React.ReactNode;

  // Actions
  onRowClick?: (item: T) => void;
  keyExtractor: (item: T) => string;

  // UX
  density?: 'compact' | 'default' | 'comfortable';
  /** Bật virtual scroll khi dòng > VIRTUAL_THRESHOLD (mặc định: true) */
  enableVirtualScroll?: boolean;

  // Column resize
  onResizeColumn?: (id: string, width: number) => void;

  /** Số cột đầu (tính từ trái) được ghim cố định khi cuộn ngang. Mặc định 1. */
  stickyLeftCount?: number;

  /** Khi isLoading: hiển thị strip icon xoay + text màu primary. Mặc định "Đang tải dữ liệu". */
  loadingText?: string;

  /** Empty state: khi data.length === 0 (không loading) */
  /**
   * Query lỗi. Không có prop này thì lỗi mạng hiển thị thành "Không có dữ liệu" —
   * sai nghĩa, và người dùng chỉ còn cách F5. Trước đây 32/41 module như vậy.
   */
  isError?: boolean;
  /** Gọi lại query khi bấm "Thử lại". Thường truyền thẳng `refetch` của useQuery. */
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;

  /** Hàng tổng/count hiển thị dưới toolbar, trên header bảng. Trả về nội dung cho từng cột (data = toàn bộ data đang hiển thị). */
  renderSummaryRow?: (colId: string, data: T[]) => React.ReactNode;

  /** Desktop: phụ kiện bên phải nhãn cột (vd. filter icon). Không kích hoạt sort; `stopPropagation` đã bọc sẵn. */
  renderColumnHeaderAccessory?: (col: ColumnConfig) => React.ReactNode | null;
  /** Khi true và có `onSort`: nhãn cột chỉ là text (không nút sort / mũi tên); sort qua accessory (vd. menu sliders). */
  hideSortOnColumnLabel?: boolean;

  /** `data` là đúng một trang server; không slice nội bộ. */
  serverSidePagination?: boolean;
  /** Tổng bản ghi chính xác (khi biết). */
  serverTotalRecords?: number | null;
  /** Còn trang sau (vd. fetch với limit = pageSize + 1). */
  serverHasNextPage?: boolean;

  /**
   * Ngưỡng hiển thị bảng desktop vs card mobile.
   * - `md` (mặc định): &lt;768px là card — giống Tailwind `md:`.
   * - `sm`: &lt;640px là card — tablet ngang thấy bảng + lọc header cột (trade-off: bảng hẹp hơn).
   */
  listBreakpoint?: 'sm' | 'md';
}

/*
 * Z-INDEX HIERARCHY (within table scroll container):
 *   z-[1]  : body sticky cells (left/right columns)
 *   z-[2]  : thead row (sticky top)
 *   z-[3]  : thead sticky corners (left+top / right+top)
 */

function GenericTable<T>({
  data, columns, isLoading, isError = false, onRetry,
  selectedIds, onToggleSelection, onToggleAll,
  page, pageSize, onPageChange, onPageSizeChange,
  sort, onSort,
  renderCell, renderMobileCard,
  onRowClick, keyExtractor,
  density = 'default',
  enableVirtualScroll = true,
  onResizeColumn,
  stickyLeftCount = 1,
  loadingText = 'Đang tải dữ liệu',
  emptyTitle,
  emptyDescription,
  emptyAction,
  renderSummaryRow,
  renderColumnHeaderAccessory,
  hideSortOnColumnLabel = false,
  listBreakpoint = 'md',
  serverSidePagination = false,
  serverTotalRecords = null,
  serverHasNextPage = false,
}: GenericTableProps<T>) {

  const bp = listBreakpoint;
  const desktopTableWrapClass = bp === 'sm' ? 'hidden sm:block' : 'hidden md:block';
  const mobileCardsWrapClass = bp === 'sm' ? 'sm:hidden' : 'md:hidden';
  const footerToneClass = bp === 'sm' ? 'bg-card sm:bg-muted/10' : 'bg-card md:bg-muted/10';

  const visibleColumns = useMemo(() =>
    [...columns].filter(c => c.visible).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [columns]
  );

  /** Cột dữ liệu (bỏ 'actions') – cột Thao tác luôn render riêng cố định bên phải */
  const dataColumns = useMemo(
    () => visibleColumns.filter(col => col.id !== 'actions'),
    [visibleColumns]
  );

  /** Tổng minWidth của bảng để luôn cuộn ngang khi nhiều cột, tránh ép cột xuống dòng */
  const tableMinWidth = useMemo(
    () =>
      computeDataTableMinWidth(dataColumns, {
        defaultColumnMin: DEFAULT_DATA_COLUMN_MIN_WIDTH,
      }),
    [dataColumns]
  );

  /** Cột cho skeleton lúc đang tải — giữ đúng bề rộng cột của bảng thật */
  const skeletonColumns = useMemo<TableSkeletonColumn[]>(
    () => dataColumns.map(col => ({ minWidth: col.minWidth, maxWidth: col.maxWidth })),
    [dataColumns]
  );

  /** Tính left offset tích lũy cho từng cột sticky (sau checkbox) */
  const stickyLeftOffsets = useMemo(() => {
    const offsets: number[] = [];
    let acc = TABLE_CHECKBOX_WIDTH - 1; // -1px overlap checkbox → cột đầu
    for (let i = 0; i < stickyLeftCount && i < dataColumns.length; i++) {
      offsets.push(acc);
      const col = dataColumns[i];
      acc += col.width ?? col.minWidth ?? DEFAULT_DATA_COLUMN_MIN_WIDTH;
    }
    return offsets;
  }, [dataColumns, stickyLeftCount]);

  const pageStats = useMemo(() => {
    const start = (page - 1) * pageSize;
    if (!serverSidePagination) {
      const totalRecords = data.length;
      return {
        paginatedData: data.slice(start, start + pageSize),
        totalRecords,
        totalPages: Math.max(1, Math.ceil(totalRecords / pageSize) || 1),
        totalRecordsLabel: null as string | null,
      };
    }
    if (serverTotalRecords != null && Number.isFinite(serverTotalRecords)) {
      const totalRecords = Math.max(0, Math.floor(serverTotalRecords));
      return {
        paginatedData: data,
        totalRecords,
        totalPages: Math.max(1, Math.ceil(totalRecords / pageSize) || 1),
        totalRecordsLabel: null as string | null,
      };
    }
    const known = start + data.length;
    return {
      paginatedData: data,
      totalRecords: known,
      totalPages: serverHasNextPage ? Math.max(1, page + 1) : Math.max(1, page),
      totalRecordsLabel: serverHasNextPage ? '—' : null,
    };
  }, [data, page, pageSize, serverSidePagination, serverTotalRecords, serverHasNextPage]);

  const { paginatedData, totalRecords, totalPages, totalRecordsLabel } = pageStats;
  const disableServerLastPage =
    serverSidePagination && (serverTotalRecords == null || !Number.isFinite(serverTotalRecords));

  const rangeStart = paginatedData.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = (page - 1) * pageSize + paginatedData.length;

  const currentPageIds = useMemo(() => {
    const extract = keyExtractor ?? ((item: T) => (item as { id?: string })?.id ?? '');
    return paginatedData.map(extract);
  }, [paginatedData, keyExtractor]);
  const isAllSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedIds.has(id));
  const isIndeterminate = currentPageIds.some(id => selectedIds.has(id)) && !isAllSelected;

  // Virtual scroll setup – chỉ kích hoạt khi có nhiều dòng
  const useVirtual = enableVirtualScroll && paginatedData.length > VIRTUAL_THRESHOLD;
  const virtualParentRef = useRef<HTMLDivElement>(null);
  const rowHeight = density === 'compact' ? 32 : density === 'comfortable' ? 48 : 38;
  // TanStack Virtual intentionally returns non-memoizable helpers; safe here.
  // eslint-disable-next-line react-hooks/incompatible-library -- useVirtualizer
  const rowVirtualizer = useVirtualizer({
    count: paginatedData.length,
    getScrollElement: () => virtualParentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  // Scroll shadow state
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollShadow, setScrollShadow] = useState({ left: false, right: false });
  /**
   * Bề rộng khung nhìn của vùng cuộn. Ô "không có dữ liệu" dùng nó để GHIM vào
   * khung nhìn: ô đó `colSpan` cả bảng, nên khi bảng rộng hơn màn (tablet) nội
   * dung bị canh giữa theo bề rộng bảng và lệch/tràn ra ngoài phần đang thấy.
   */
  const [viewportWidth, setViewportWidth] = useState<number | null>(null);

  const setTableScrollEl = useCallback((el: HTMLDivElement | null) => {
    scrollRef.current = el;
    virtualParentRef.current = el;
  }, []);

  const updateScrollShadow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setScrollShadow({
      left: el.scrollLeft > 2,
      right: el.scrollLeft < el.scrollWidth - el.clientWidth - 2,
    });
    setViewportWidth((cur) => (cur === el.clientWidth ? cur : el.clientWidth));
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollShadow();
    el.addEventListener('scroll', updateScrollShadow, { passive: true });
    const ro = new ResizeObserver(updateScrollShadow);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', updateScrollShadow); ro.disconnect(); };
  }, [updateScrollShadow, isLoading]);

  // Sort handler
  const handleHeaderClick = useCallback((colId: string) => {
    if (!onSort) return;
    if (sort?.column === colId) {
      if (sort.direction === 'asc') onSort(colId, 'desc');
      else if (sort.direction === 'desc') onSort(null, null);
      else onSort(colId, 'asc');
    } else {
      onSort(colId, 'asc');
    }
  }, [onSort, sort]);

  // Column resize handler
  const resizingRef = useRef<{ colId: string; startX: number; startW: number } | null>(null);

  const handleResizeStart = useCallback((e: React.MouseEvent, colId: string, currentWidth: number) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = { colId, startX: e.clientX, startW: currentWidth };

    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = ev.clientX - resizingRef.current.startX;
      const newW = Math.max(resizingRef.current.startW + delta, 50);
      onResizeColumn?.(resizingRef.current.colId, newW);
    };
    const onUp = () => {
      resizingRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [onResizeColumn]);

  /** Padding dọc ô (tbody) — default 38px hàng, compact 32px */
  const cellPy = density === 'compact' ? 'py-1' : density === 'comfortable' ? 'py-3' : 'py-1.5';
  /** Padding header — khớp mật độ với body */
  const headerPy = density === 'compact' ? 'py-1' : density === 'comfortable' ? 'py-2' : 'py-1.5';

  // Lỗi tải dữ liệu: phải nói rõ là LỖI và cho thử lại, không được rơi vào
  // EmptyState "Không có dữ liệu" (người dùng tưởng chưa có bản ghi nào).
  if (isError && !isLoading) {
    return (
      <div className="flex flex-col h-full bg-card overflow-hidden items-center justify-center p-6">
        <ErrorState onRetry={onRetry} />
      </div>
    );
  }

  // Skeleton loading: strip icon xoay + chữ primary (Nhân sự, ...) rồi skeleton
  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-card overflow-hidden" aria-live="polite" aria-busy="true" aria-label={loadingText}>
        <div className="shrink-0 py-3 px-3 sm:px-4 border-b border-border/50 bg-muted/20">
          <LoadingSpinnerWithText text={loadingText} centered />
        </div>
        <TableSkeleton
          className={desktopTableWrapClass}
          columns={skeletonColumns}
          tableMinWidth={tableMinWidth}
          headerPaddingClass={headerPy}
          rowCount={5}
        />
        <CardListSkeleton
          cardCount={3}
          className={cn('px-3 pt-1', mobileCardsWrapClass)}
        />
        <div className="border-t border-border bg-card px-3 py-1.5 flex items-center justify-between shrink-0">
          <div className="h-3 w-24 bg-muted rounded animate-pulse" />
          <div className="h-7 w-28 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">

      {/* 1. DESKTOP VIEW with scroll shadows */}
      <div className={cn('flex-1 min-h-0 relative', desktopTableWrapClass)}>
        {/* Scroll shadow overlays */}
        <div className={cn("absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-card/80 to-transparent z-[4] pointer-events-none transition-opacity", scrollShadow.left ? "opacity-100" : "opacity-0")} />
        <div className={cn("absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-card/80 to-transparent z-[4] pointer-events-none transition-opacity", scrollShadow.right ? "opacity-100" : "opacity-0")} />

        <div
          ref={setTableScrollEl}
          className="h-full overflow-auto custom-scrollbar [contain:layout_paint]"
          style={{ overscrollBehavior: 'contain' }}
        >
          <table className="text-sm text-left border-separate border-spacing-0" style={{ minWidth: tableMinWidth, width: '100%' }}>
            <thead className="sticky top-0 z-[2]">
              {renderSummaryRow && (
                <tr className="bg-muted/60 border-b border-border/80">
                  <th
                    className={cn(
                      "sticky left-0 z-[3] px-3 py-1.5 border-b border-r border-border/80 text-center text-xs font-medium",
                      "bg-muted border-l-2 border-l-primary/50 text-muted-foreground"
                    )}
                    style={{ width: TABLE_CHECKBOX_WIDTH, minWidth: TABLE_CHECKBOX_WIDTH, maxWidth: TABLE_CHECKBOX_WIDTH }}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <Sigma size={12} className="opacity-70 shrink-0" aria-hidden />
                      <span className="tabular-nums">{totalRecords > 0 ? totalRecords : '—'}</span>
                    </div>
                  </th>
                  {dataColumns.map((col, index) => {
                    const isSticky = index < stickyLeftCount;
                    const colStyle: React.CSSProperties = col.width
                      ? { ...getColumnCellStyle(col), width: col.width }
                      : getColumnCellStyle(col);
                    if (isSticky) {
                      colStyle.left = stickyLeftOffsets[index];
                    }
                    return (
                      <th
                        key={col.id}
                        className={cn(
                          "px-4 py-1.5 text-xs font-medium text-muted-foreground border-b border-border/80 whitespace-nowrap",
                          isSticky && "sticky z-[3] bg-muted border-r border-border/80"
                        )}
                        style={colStyle}
                      >
                        <div className="min-w-0 overflow-hidden text-ellipsis">
                          {renderSummaryRow(col.id, data)}
                        </div>
                      </th>
                    );
                  })}
                  <th
                    className="sticky right-0 z-[3] px-3 py-1.5 bg-muted border-b border-l border-border/80 text-center"
                    style={{ width: TABLE_ACTION_COLUMN_WIDTH }}
                  >
                    {renderSummaryRow ? renderSummaryRow('actions', data) : null}
                  </th>
                </tr>
              )}
              <tr className="bg-muted border-b border-border">
                <th className={cn('sticky left-0 z-[3] px-3 bg-muted border-b border-r border-border text-center', headerPy)} style={{ width: TABLE_CHECKBOX_WIDTH, minWidth: TABLE_CHECKBOX_WIDTH, maxWidth: TABLE_CHECKBOX_WIDTH }}>
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={input => { if (input) input.indeterminate = isIndeterminate; }}
                      onChange={() => onToggleAll(currentPageIds)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer accent-primary transition-colors"
                    />
                  </div>
                </th>

                {dataColumns.map((col, index) => {
                  const isSticky = index < stickyLeftCount;
                  const isSorted = sort?.column === col.id;
                  const sortable = !!onSort;
                  const showLabelSortButton = sortable && !hideSortOnColumnLabel;
                  const colStyle: React.CSSProperties = col.width
                    ? { ...getColumnCellStyle(col), width: col.width }
                    : getColumnCellStyle(col);
                  if (isSticky) {
                    colStyle.left = stickyLeftOffsets[index];
                  }
                  const accessory = renderColumnHeaderAccessory?.(col);
                  return (
                    <th
                      key={col.id}
                      className={cn(
                        "px-4 font-semibold text-foreground/80 border-b border-border text-xs whitespace-nowrap transition-colors select-none relative",
                        headerPy,
                        isSticky && "sticky z-[3] bg-muted border-r border-border",
                      )}
                      style={colStyle}
                    >
                      <div className="flex items-center justify-between gap-1 min-w-0">
                        {showLabelSortButton ? (
                          <button
                            type="button"
                            className={cn(
                              'flex items-center gap-1 min-w-0 flex-1 text-left font-semibold text-inherit bg-transparent border-0 p-0',
                              'cursor-pointer hover:text-foreground group',
                            )}
                            onClick={() => handleHeaderClick(col.id)}
                          >
                            <span className="truncate">{col.label}</span>
                            <span className={cn('shrink-0 transition-opacity', isSorted ? 'opacity-100' : 'opacity-0 group-hover:opacity-40')}>
                              {isSorted && sort?.direction === 'desc'
                                ? <ArrowDown size={12} className="text-primary" />
                                : <ArrowUp size={12} className={isSorted ? 'text-primary' : ''} />
                              }
                            </span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 min-w-0 flex-1">
                            <span className="truncate">{col.label}</span>
                          </div>
                        )}
                        {accessory ? (
                          // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- chặn bubble để không kích hoạt sort khi mở filter cột
                          <div
                            className="shrink-0"
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            {accessory}
                          </div>
                        ) : null}
                      </div>
                      {/* Column resize handle */}
                      {onResizeColumn && (
                        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- column resize drag handle
                        <div
                          role="separator"
                          aria-orientation="vertical"
                          onMouseDown={(e) => {
                            const th = e.currentTarget.parentElement;
                            handleResizeStart(e, col.id, th?.offsetWidth ?? col.minWidth ?? 100);
                          }}
                          className="absolute right-0 top-0 bottom-0 w-[5px] cursor-col-resize z-10 group/handle hover:bg-primary/30 active:bg-primary/50 transition-colors"
                        >
                          <div className="absolute right-[2px] top-1/2 -translate-y-1/2 w-[1px] h-3.5 bg-border group-hover/handle:bg-primary/60 transition-colors" />
                        </div>
                      )}
                    </th>
                  );
                })}

                <th
                  className={cn(
                    'sticky right-0 z-[3] px-3 bg-muted border-b border-l border-border text-center font-semibold text-foreground/80 text-xs',
                    headerPy,
                  )}
                  style={{ width: TABLE_ACTION_COLUMN_WIDTH }}
                >
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={dataColumns.length + 2} className="p-0 bg-card">
                    <div
                      className="sticky left-0 px-4 py-16 text-center"
                      style={viewportWidth ? { width: viewportWidth } : undefined}
                    >
                      <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
                    </div>
                  </td>
                </tr>
              ) : (
                (() => {
                  const items = useVirtual ? rowVirtualizer.getVirtualItems() : paginatedData.map((_, i) => ({ index: i, size: rowHeight, start: 0 }));
                  const totalSize = useVirtual ? rowVirtualizer.getTotalSize() : 0;

                  return (
                    <>
                      {/* Spacer top khi dùng virtual scroll */}
                      {useVirtual && items.length > 0 && items[0].start > 0 && (
                        <tr><td colSpan={dataColumns.length + 2} style={{ height: items[0].start, padding: 0, border: 'none' }} /></tr>
                      )}

                      {items.map((virtualRow) => {
                        const item = paginatedData[virtualRow.index];
                        if (!item) return null;
                        const itemId = keyExtractor(item);
                        const isSelected = selectedIds.has(itemId);

                        const rowClass = isSelected
                          ? 'bg-primary/[0.03] hover:bg-primary/[0.06]'
                          : 'bg-card even:bg-muted/15 hover:bg-accent transition-colors duration-150';

                        // Sticky cells cần nền đặc (opaque) để không bị xuyên thấu khi cuộn ngang
                        const stickyCellClass = isSelected
                          ? 'bg-accent group-hover:bg-accent'
                          : 'bg-card group-hover:bg-accent transition-colors duration-150';

                        return (
                          <tr
                            key={itemId}
                            data-index={virtualRow.index}
                            ref={useVirtual ? rowVirtualizer.measureElement : undefined}
                            onClick={() => onRowClick?.(item)}
                            className={`group cursor-pointer ${rowClass} [&>td]:border-b [&>td]:border-border`}
                          >
                            <td
                              className={`sticky left-0 z-[1] px-3 ${cellPy} border-r border-border text-center ${stickyCellClass}`}
                              style={{ width: TABLE_CHECKBOX_WIDTH, minWidth: TABLE_CHECKBOX_WIDTH, maxWidth: TABLE_CHECKBOX_WIDTH }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => onToggleSelection(itemId)}
                                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer accent-primary transition-colors"
                                />
                              </div>
                            </td>

                            {dataColumns.map((col, index) => {
                              const isSticky = index < stickyLeftCount;
                              const tdStyle: React.CSSProperties = {
                                ...getColumnCellStyle(col),
                                ...(col.width != null ? { width: col.width } : {}),
                              };
                              if (isSticky) {
                                tdStyle.left = stickyLeftOffsets[index];
                              }
                              return (
                                <td
                                  key={col.id}
                                  className={cn(
                                    `px-4 ${cellPy}`,
                                    isSticky && `sticky z-[1] border-r border-border/50 ${stickyCellClass}`
                                  )}
                                  style={tdStyle}
                                >
                                  <div className="min-w-0 max-w-full overflow-hidden">
                                    {renderCell(col.id, item)}
                                  </div>
                                </td>
                              );
                            })}

                            <td
                              className={`sticky right-0 z-[1] px-2 ${cellPy} border-l border-border/50 text-center ${stickyCellClass}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {renderCell('actions', item)}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Spacer bottom khi dùng virtual scroll */}
                      {useVirtual && items.length > 0 && (
                        <tr><td colSpan={dataColumns.length + 2} style={{ height: totalSize - (items[items.length - 1].start + items[items.length - 1].size), padding: 0, border: 'none' }} /></tr>
                      )}
                    </>
                  );
                })()
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. MOBILE VIEW */}
      <div className={cn('flex-1 min-h-0 space-y-3 overflow-y-auto pb-3 px-3 pt-1', mobileCardsWrapClass)}>
        {paginatedData.length === 0 ? (
          <div className="py-12"><EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} /></div>
        ) : (
          paginatedData.map((item) => {
            const itemId = keyExtractor(item);
            const isSelected = selectedIds.has(itemId);
            return (
              <div key={itemId} className="transition-[transform,opacity] duration-150 active:scale-[0.98]">
                {renderMobileCard(item, isSelected)}
              </div>
            );
          })
        )}
      </div>

      {/* 3. FOOTER — dùng chung TablePaginationFooter (bản duy nhất trong repo) */}
      {totalRecords > 0 && (
        <TablePaginationFooter
          totalRecords={totalRecords}
          page={page}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          selectedCount={selectedIds.size}
          totalPages={totalPages}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          totalRecordsLabel={totalRecordsLabel}
          disableAllOption={serverSidePagination}
          disableLastPage={disableServerLastPage}
          className={footerToneClass}
        />
      )}
    </div>
  );
}

export default GenericTable;
