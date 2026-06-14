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
import type { NhapXuatKhoPhieuDocumentModel } from './build-nhap-xuat-kho-phieu-document';

const FONT = 'Times New Roman';
const BODY_SIZE = 22;
const TITLE_SIZE = 28;
const SUB_SIZE = 20;

const PAGE_MARGIN = {
  top: 567,
  right: 567,
  bottom: 567,
  left: 567,
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
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { ...noBorder, insideHorizontal: noBorder.top, insideVertical: noBorder.left },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 33, type: WidthType.PERCENTAGE },
              borders: noBorder,
              children: [
                new Paragraph({
                  children: [
                    run(`${model.donViLabel}: `, { bold: true }),
                    run(model.donViValue),
                  ],
                }),
                new Paragraph({
                  children: [
                    run(`${model.diaChiLabel}: `, { bold: true }),
                    run(model.diaChiValue),
                  ],
                }),
                new Paragraph({
                  children: [
                    run(`${model.boPhanLabel}: `, { bold: true }),
                    run(model.boPhanValue),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 34, type: WidthType.PERCENTAGE },
              borders: noBorder,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [run(model.docTitle, { bold: true, size: TITLE_SIZE })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [run(`${model.ngayLapPhieuLabel}: ${model.ngayPhieu}`)],
                }),
              ],
            }),
            new TableCell({
              width: { size: 33, type: WidthType.PERCENTAGE },
              borders: noBorder,
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    run(`${model.soPhieuLabel}: `, { bold: true }),
                    run(model.soPhieu),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    run(`${model.mauSoLabel}: `, { bold: true }),
                    run(model.mauSo),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [run(model.thongTu, { size: SUB_SIZE, italics: true })],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 160 } }),
  ];

  for (const line of model.infoLines) {
    children.push(
      new Paragraph({
        children: [run(`${line.label}: `, { bold: true }), run(line.value)],
        spacing: { after: 40 },
      }),
    );
  }

  children.push(new Paragraph({ spacing: { after: 120 } }));

  if (model.rows.length > 0) {
    const headers = model.columnHeaders;
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
    const codeRow = new TableRow({
      children: model.columnCodes.map((code) =>
        new TableCell({
          verticalAlign: VerticalAlign.CENTER,
          borders: {
            top: thinBorder,
            bottom: thinBorder,
            left: thinBorder,
            right: thinBorder,
          },
          children: [cellParagraph(code, true, AlignmentType.CENTER)],
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

    const tableRows = [headerRow, codeRow, ...bodyRows];
    if (model.showCongRow) {
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 5,
              borders: {
                top: thinBorder,
                bottom: thinBorder,
                left: thinBorder,
                right: thinBorder,
              },
              children: [cellParagraph(model.congLabel, true, AlignmentType.RIGHT)],
            }),
            new TableCell({
              borders: {
                top: thinBorder,
                bottom: thinBorder,
                left: thinBorder,
                right: thinBorder,
              },
              children: [cellParagraph(model.congValue, true, AlignmentType.RIGHT)],
            }),
            new TableCell({
              borders: {
                top: thinBorder,
                bottom: thinBorder,
                left: thinBorder,
                right: thinBorder,
              },
              children: [cellParagraph('', false, AlignmentType.LEFT)],
            }),
          ],
        }),
      );
    }

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tableRows,
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

  if (model.tongTienBangChu) {
    children.push(
      new Paragraph({
        spacing: { before: 120 },
        children: [
          run(`${model.tongTienBangChuLabel}: `, { bold: true }),
          run(`${model.tongTienBangChu}.`, { italics: true }),
        ],
      }),
    );
  }

  children.push(
    new Paragraph({
      spacing: { before: 80 },
      children: [
        run(`${model.chungTuGocLabel}: `, { bold: true }),
        run(model.chungTuGoc),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 160, after: 240 },
      children: [run(model.signatureDateLine, { italics: true })],
    }),
  );

  if (model.ghiChuNoiBo) {
    children.push(
      new Paragraph({
        spacing: { before: 80 },
        children: [run(`Ghi chú nội bộ: `, { bold: true, size: SUB_SIZE }), run(model.ghiChuNoiBo, { size: SUB_SIZE })],
      }),
    );
  }

  children.push(
    new Paragraph({ spacing: { before: 240 } }),
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
