import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import { getTodayISODate } from '@/lib/utils';
import {
  layoutNhapXuatKhoPhieuMetaPairs,
  type NhapXuatKhoPhieuDocumentModel,
} from './build-nhap-xuat-kho-phieu-document';

const FONT = 'Times New Roman';
const BODY_SIZE = 22;
const TITLE_SIZE = 28;
const SUB_SIZE = 20;

const PAGE_MARGIN = {
  top: 850,
  right: 850,
  bottom: 850,
  left: 1134,
};

const thinBorder = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: '333333',
};

const noBorder = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
};

function run(text: string, opts?: { bold?: boolean; size?: number; italics?: boolean }) {
  return new TextRun({
    text,
    font: FONT,
    bold: opts?.bold,
    italics: opts?.italics,
    size: opts?.size ?? BODY_SIZE,
  });
}

function cellParagraph(
  text: string,
  bold = false,
  align?: (typeof AlignmentType)[keyof typeof AlignmentType],
) {
  return new Paragraph({
    alignment: align,
    children: [run(text, { bold })],
    spacing: { before: 40, after: 40 },
  });
}

export async function downloadNhapXuatKhoPhieuDocx(
  model: NhapXuatKhoPhieuDocumentModel,
  fileName: string,
): Promise<void> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [run(model.orgNameLine1, { bold: true, size: TITLE_SIZE })],
      spacing: { after: model.orgNameLine2 ? 0 : 40 },
    }),
    ...(model.orgNameLine2
      ? [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [run(model.orgNameLine2, { bold: true, size: TITLE_SIZE })],
            spacing: { after: 40 },
          }),
        ]
      : []),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [run(model.orgSubTitle.toUpperCase(), { bold: true, size: BODY_SIZE })],
      spacing: { after: 80 },
    }),
  ];

  if (model.address) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [run(model.address, { size: SUB_SIZE })],
        spacing: { after: 40 },
      }),
    );
  }
  if (model.phone) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [run(`ĐT: ${model.phone}`, { size: SUB_SIZE })],
        spacing: { after: 120 },
      }),
    );
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        run(`Mẫu số: 01-KCT · Số: ${model.soPhieu} · ${model.signedDateLabel}: ${model.signedDateValue}`, {
          size: SUB_SIZE,
        }),
      ],
      spacing: { after: 160 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [run(model.docTitle, { bold: true, size: TITLE_SIZE })],
      spacing: { after: 80 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [run(`Ngày lập phiếu: ${model.ngayPhieu}`)],
      spacing: { after: 160 },
    }),
  );

  const metaPairs = layoutNhapXuatKhoPhieuMetaPairs(model.metaItems, {
    label: model.signedDateLabel,
    value: model.signedDateValue,
  });

  for (const pair of metaPairs) {
    const cells = pair.map(
      (item) =>
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [
            new Paragraph({
              children: [run(`${item.label}: `, { bold: true }), run(item.value)],
            }),
          ],
        }),
    );
    while (cells.length < 2) {
      cells.push(
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [run(' ')] })],
        }),
      );
    }
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { ...noBorder, insideHorizontal: noBorder.top, insideVertical: noBorder.left },
        rows: [new TableRow({ children: cells })],
      }),
    );
  }

  if (model.rows.length > 0) {
    const headers = Object.keys(model.rows[0]);
    const headerRow = new TableRow({
      tableHeader: true,
      children: headers.map(
        (h) =>
          new TableCell({
            shading: { fill: 'F5F5F5' },
            verticalAlign: VerticalAlign.CENTER,
            borders: {
              top: thinBorder,
              bottom: thinBorder,
              left: thinBorder,
              right: thinBorder,
            },
            children: [cellParagraph(h, true, AlignmentType.CENTER)],
          }),
      ),
    });
    const bodyRows = model.rows.map(
      (row) =>
        new TableRow({
          children: headers.map((h) => {
            const isStt = h === model.sttColumnKey;
            const isNumeric =
              h.includes('Số lượng') || h.includes('Đơn giá') || h.includes('Thành tiền');
            return new TableCell({
              verticalAlign: VerticalAlign.CENTER,
              borders: {
                top: thinBorder,
                bottom: thinBorder,
                left: thinBorder,
                right: thinBorder,
              },
              children: [
                cellParagraph(
                  String(row[h] ?? ''),
                  false,
                  isStt
                    ? AlignmentType.CENTER
                    : isNumeric
                      ? AlignmentType.RIGHT
                      : AlignmentType.LEFT,
                ),
              ],
            });
          }),
        }),
    );

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...bodyRows],
      }),
    );
  } else {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [run(model.emptyMessage, { size: BODY_SIZE })],
        spacing: { before: 120 },
      }),
    );
  }

  if (model.tongTien > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 120 },
        children: [
          run('Tổng cộng: ', { bold: true }),
          run(model.tongTienFormatted, { bold: true }),
        ],
      }),
    );
    if (model.tongTienBangChu) {
      children.push(
        new Paragraph({
          spacing: { before: 80 },
          children: [
            run('Bằng chữ: ', { bold: true }),
            run(`${model.tongTienBangChu}.`, { italics: true }),
          ],
        }),
      );
    }
  }

  children.push(
    new Paragraph({
      spacing: { before: 160 },
      children: [run('Ghi chú: ', { bold: true }), run(model.ghiChu)],
    }),
    new Paragraph({ spacing: { before: 320 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { ...noBorder, insideHorizontal: noBorder.top, insideVertical: noBorder.left },
      rows: [
        new TableRow({
          children: [
            model.footer.col1Label,
            model.footer.col2Label,
            model.footer.col3Label,
            model.footer.col4Label,
          ].map(
            (label, idx) =>
              new TableCell({
                width: { size: 25, type: WidthType.PERCENTAGE },
                borders: noBorder,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 160 },
                    children: [run(label, { bold: true, size: SUB_SIZE })],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 1200 },
                    children: [
                      run(
                        idx === 3 ? '(Ký, họ tên, đóng dấu)' : '(Ký, họ tên)',
                        { italics: true, size: SUB_SIZE },
                      ),
                    ],
                  }),
                ],
              }),
          ),
        }),
      ],
    }),
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: PAGE_MARGIN,
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}_${getTodayISODate()}.docx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
