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
  layoutTapHuanMetaPairs,
  type TapHuanInDanhSachDocumentModel,
} from './build-tap-huan-in-danh-sach-document';

const FONT = 'Times New Roman';
const BODY_SIZE = 22; /* 11pt */
const TITLE_SIZE = 28; /* 14pt */
const SUB_SIZE = 20; /* 10pt */

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

function run(text: string, opts?: { bold?: boolean; size?: number }) {
  return new TextRun({
    text,
    font: FONT,
    bold: opts?.bold,
    size: opts?.size ?? BODY_SIZE,
  });
}

function cellParagraph(text: string, bold = false, align?: (typeof AlignmentType)[keyof typeof AlignmentType]) {
  return new Paragraph({
    alignment: align,
    children: [run(text, { bold })],
    spacing: { before: 40, after: 40 },
  });
}

export async function downloadTapHuanListDocx(
  model: TapHuanInDanhSachDocumentModel,
  fileName: string,
): Promise<void> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [run(model.companyName.toUpperCase(), { bold: true, size: TITLE_SIZE })],
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
      alignment: AlignmentType.CENTER,
      children: [run(model.documentTitle, { bold: true, size: TITLE_SIZE })],
      spacing: { after: 160 },
    }),
  );

  const metaPairs = layoutTapHuanMetaPairs(model.metaItems, {
    label: model.signedDateLabel,
    value: model.signedDateValue,
  });

  for (const pair of metaPairs) {
    const cells = pair.map(
      (item) =>
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE, size: 0 },
            bottom: { style: BorderStyle.NONE, size: 0 },
            left: { style: BorderStyle.NONE, size: 0 },
            right: { style: BorderStyle.NONE, size: 0 },
          },
          children: [
            new Paragraph({
              children: [
                run(`${item.label}: `, { bold: true }),
                run(item.value),
              ],
            }),
          ],
        }),
    );
    while (cells.length < 2) {
      cells.push(
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE, size: 0 },
            bottom: { style: BorderStyle.NONE, size: 0 },
            left: { style: BorderStyle.NONE, size: 0 },
            right: { style: BorderStyle.NONE, size: 0 },
          },
          children: [new Paragraph({ children: [run(' ')] })],
        }),
      );
    }
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE, size: 0 },
          bottom: { style: BorderStyle.NONE, size: 0 },
          left: { style: BorderStyle.NONE, size: 0 },
          right: { style: BorderStyle.NONE, size: 0 },
          insideHorizontal: { style: BorderStyle.NONE, size: 0 },
          insideVertical: { style: BorderStyle.NONE, size: 0 },
        },
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
            const isName = h === model.nameColumnKey;
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
                  isStt ? AlignmentType.CENTER : isName ? AlignmentType.LEFT : AlignmentType.LEFT,
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

  children.push(
    new Paragraph({ spacing: { before: 320 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE, size: 0 },
        bottom: { style: BorderStyle.NONE, size: 0 },
        left: { style: BorderStyle.NONE, size: 0 },
        right: { style: BorderStyle.NONE, size: 0 },
        insideHorizontal: { style: BorderStyle.NONE, size: 0 },
        insideVertical: { style: BorderStyle.NONE, size: 0 },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 33, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE, size: 0 },
                bottom: { style: BorderStyle.NONE, size: 0 },
                left: { style: BorderStyle.NONE, size: 0 },
                right: { style: BorderStyle.NONE, size: 0 },
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 600 },
                  children: [run(model.footer.nguoiTaoLabel, { bold: true })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [run(model.footer.nguoiTaoValue)],
                }),
              ],
            }),
            new TableCell({
              width: { size: 33, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE, size: 0 },
                bottom: { style: BorderStyle.NONE, size: 0 },
                left: { style: BorderStyle.NONE, size: 0 },
                right: { style: BorderStyle.NONE, size: 0 },
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 1200 },
                  children: [run(model.footer.nguoiKiemTraLabel, { bold: true })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 34, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE, size: 0 },
                bottom: { style: BorderStyle.NONE, size: 0 },
                left: { style: BorderStyle.NONE, size: 0 },
                right: { style: BorderStyle.NONE, size: 0 },
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 1200 },
                  children: [run(model.footer.nguoiPheDuyetLabel, { bold: true })],
                }),
              ],
            }),
          ],
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
