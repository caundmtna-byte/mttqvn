import React from 'react';
import { txt } from '../../lib/text';
import EmbeddedChildDataGrid from './EmbeddedChildDataGrid';
import { FileText } from 'lucide-react';

/** Một dòng phiên bản tài liệu (API chi tiết sẽ bổ sung sau). */
export interface DocumentVersionRow {
  id: string;
  /** Nhãn hiển thị: ví dụ v1.2, tên file */
  label: string;
  /** ISO hoặc chuỗi ngày đã format */
  createdAt?: string;
  /** Người tải lên / cập nhật */
  authorLabel?: string;
}

export interface EmbeddedDocumentVersionGridProps {
  rows: DocumentVersionRow[];
  /** Mở chi tiết phiên bản (drawer phụ) */
  onRowClick?: (row: DocumentVersionRow) => void;
}

/**
 * Bảng phiên bản tệp trong chi tiết tài liệu — dùng chung `EmbeddedChildDataGrid`.
 * Gắn vào màn chi tiết tài liệu khi API cột đã chốt.
 */
export function EmbeddedDocumentVersionGrid({ rows, onRowClick }: EmbeddedDocumentVersionGridProps) {
  return (
    <EmbeddedChildDataGrid<DocumentVersionRow>
      rows={rows}
      getRowKey={(r) => r.id}
      labelColumn={{
        header: txt('taiLieu.detail.versionColLabel'),
        minWidthClass: 'min-w-[180px]',
        renderCell: (r) => (
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            {r.label}
          </span>
        ),
      }}
      columns={[
        {
          id: 'date',
          header: txt('taiLieu.detail.versionColDate'),
          renderCell: (r) => (
            <span className="text-xs text-muted-foreground tabular-nums">{r.createdAt ?? '—'}</span>
          ),
        },
        {
          id: 'author',
          header: txt('taiLieu.detail.versionColAuthor'),
          renderCell: (r) => <span className="text-xs text-muted-foreground">{r.authorLabel ?? '—'}</span>,
        },
      ]}
      actionsColumn={{
        header: txt('common.actions'),
        widthClass: 'w-20 min-w-[5rem]',
        renderCell: () => <span className="text-xs text-muted-foreground">—</span>,
      }}
      onRowClick={onRowClick}
    />
  );
}

export default EmbeddedDocumentVersionGrid;
