import React, { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import DocumentListPreviewLayout, {
  type DocumentListDownloadFormat,
} from '@/components/shared/DocumentListPreviewLayout';
import { downloadVanBanPdf } from '@/features/mat-tran-to-quoc/danh-sach-khen-thuong/utils/download-van-ban-pdf';
import type { BienBanModel } from '@/lib/bien-ban/bien-ban-model';
import { BIEN_BAN_SCREEN_STYLES } from '@/lib/bien-ban/bien-ban-styles';
import { printBienBanDocument } from '@/lib/bien-ban/print-bien-ban';
import { downloadBienBanDocx } from '@/lib/bien-ban/download-bien-ban-docx';
import { downloadBienBanXlsx } from '@/lib/bien-ban/download-bien-ban-xlsx';
import BienBanDocument from './BienBanDocument';

/** Dùng lại CSS Ctrl+P sẵn có của văn bản MTTQ trong `index.css`. */
const PREVIEW_PREFIX = 'mttq-van-ban-preview';
const PRINT_ROOT_ID = 'bien-ban-print-root';

interface Props {
  model: BienBanModel;
  /** Tên file không đuôi, đã qua `fileSlug`. */
  fileBase: string;
  onBack: () => void;
}

/**
 * Trang xem trước một biên bản / phiếu: In (cửa sổ riêng), tải PDF / Word / Excel.
 * Trang gọi chỉ lo tải dữ liệu, chặn quyền và dựng `model`.
 */
const BienBanPreview: React.FC<Props> = ({ model, fileBase, onBack }) => {
  const pdfBusy = useRef(false);
  const landscape = model.khoGiay === 'ngang';

  const handlePrint = useCallback(() => {
    const el = document.getElementById(PRINT_ROOT_ID);
    if (!el) {
      toast.error(txt('common.error'));
      return;
    }
    if (!printBienBanDocument(el, model.tieuDe, model.khoGiay)) {
      toast.error(txt('common.printPopupBlocked'));
    }
  }, [model]);

  const handleDownload = useCallback(
    async (format: DocumentListDownloadFormat) => {
      try {
        if (format === 'pdf') {
          if (pdfBusy.current) return;
          pdfBusy.current = true;
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          const el = document.getElementById(PRINT_ROOT_ID);
          if (!el) {
            toast.error(txt('common.error'));
            return;
          }
          await downloadVanBanPdf(el, fileBase, { orientation: landscape ? 'landscape' : 'portrait' });
        } else if (format === 'docx') {
          await downloadBienBanDocx(model, fileBase);
        } else {
          await downloadBienBanXlsx(model, fileBase);
        }
      } catch {
        toast.error(txt('common.error'));
      } finally {
        pdfBusy.current = false;
      }
    },
    [model, fileBase, landscape],
  );

  return (
    <DocumentListPreviewLayout
      previewClassPrefix={PREVIEW_PREFIX}
      onBack={onBack}
      onPrint={handlePrint}
      onDownload={handleDownload}
      downloadDisabled={false}
      orientation={landscape ? 'landscape' : 'portrait'}
    >
      <style>{BIEN_BAN_SCREEN_STYLES}</style>
      <BienBanDocument model={model} rootId={PRINT_ROOT_ID} />
    </DocumentListPreviewLayout>
  );
};

export default BienBanPreview;
