import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, Download, FileText, Printer, Sheet } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export type DocumentListDownloadFormat = 'pdf' | 'docx' | 'xlsx';

export interface DocumentListPreviewLayoutProps {
  /** BEM prefix, e.g. `mttq-tap-huan-danh-sach-preview` → classes `{prefix}-preview-toolbar`. */
  previewClassPrefix: string;
  /** Không truyền thì không hiện tiêu đề phía trên toolbar. */
  pageTitle?: string;
  onBack: () => void;
  /** Mặc định `window.print()` — preview in nên dùng cửa sổ riêng. */
  onPrint?: () => void;
  onDownload?: (format: DocumentListDownloadFormat) => void;
  downloadDisabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Layout trang xem trước danh sách in — toolbar (ẩn khi print) + khung nội dung A4.
 * Đồng bộ `@media print` trong `index.css` theo `previewClassPrefix`.
 */
const DocumentListPreviewLayout: React.FC<DocumentListPreviewLayoutProps> = ({
  previewClassPrefix,
  pageTitle,
  onBack,
  onPrint,
  onDownload,
  downloadDisabled,
  children,
  className,
}) => {
  const toolbarClass = `${previewClassPrefix}-preview-toolbar`;
  const backdropClass = `${previewClassPrefix}-preview-backdrop`;
  const contentClass = `${previewClassPrefix}-preview-content`;
  const [downloadOpen, setDownloadOpen] = useState(false);
  const downloadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!downloadOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target as Node)) {
        setDownloadOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [downloadOpen]);

  const pickFormat = useCallback(
    (format: DocumentListDownloadFormat) => {
      onDownload?.(format);
      setDownloadOpen(false);
    },
    [onDownload],
  );

  return (
    <div className={cn('flex flex-col min-h-[calc(100vh-8rem)]', className)}>
      {pageTitle ? (
        <div className="mb-3 shrink-0 print:hidden">
          <h1 className="text-lg font-semibold text-foreground tracking-tight">{pageTitle}</h1>
        </div>
      ) : null}

      <div className={cn(backdropClass, 'flex-1 min-h-0 flex flex-col rounded-xl overflow-hidden print:rounded-none print:overflow-visible')}>
        <div
          className={cn(
            toolbarClass,
            'shrink-0 flex flex-wrap items-center gap-2 p-3 border-b border-border bg-card print:hidden',
          )}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-9 gap-1.5"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
            {txt('common.back')}
          </Button>
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {onDownload ? (
              <div className="relative shrink-0" ref={downloadRef}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={downloadDisabled}
                  onClick={() => setDownloadOpen((v) => !v)}
                  className="h-9 gap-1.5"
                  aria-expanded={downloadOpen}
                  aria-haspopup="menu"
                >
                  <Download className="w-4 h-4 shrink-0" aria-hidden />
                  {txt('matTranTapHuan.printPreview.download')}
                  <ChevronDown
                    className={cn('w-3.5 h-3.5 shrink-0 transition-transform', downloadOpen && 'rotate-180')}
                    aria-hidden
                  />
                </Button>
                {downloadOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-1.5 z-50 min-w-[168px] bg-card rounded-xl shadow-xl border border-border overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => pickFormat('pdf')}
                      className="w-full h-9 px-3 flex items-center gap-2 text-left text-sm text-foreground hover:bg-muted/60 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
                      {txt('matTranTapHuan.printPreview.downloadPdf')}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => pickFormat('docx')}
                      className="w-full h-9 px-3 flex items-center gap-2 text-left text-sm text-foreground hover:bg-muted/60 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
                      {txt('matTranTapHuan.printPreview.downloadDocx')}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => pickFormat('xlsx')}
                      className="w-full h-9 px-3 flex items-center gap-2 text-left text-sm text-foreground hover:bg-muted/60 transition-colors"
                    >
                      <Sheet className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
                      {txt('matTranTapHuan.printPreview.downloadXlsx')}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={onPrint ?? (() => window.print())}
              className="h-9 gap-1.5"
            >
              <Printer className="w-4 h-4 shrink-0" aria-hidden />
              {txt('matTranTapHuan.printPreview.print')}
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-4 sm:p-6 flex justify-center bg-muted/40 print:p-0 print:bg-white print:overflow-visible">
          <div
            className={cn(
              contentClass,
              'bg-white text-black w-full max-w-[210mm] min-h-[297mm] print:max-w-none print:min-h-0',
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentListPreviewLayout;
