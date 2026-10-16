import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { DEFAULT_TEMPLATE_DOKUMEN_JSON } from "@/lib/settings";

export interface ExportHasilData {
  id: string;
  namaGuru: string;
  nipGuru: string;
  emailGuru: string;
  mapelGuru: string;
  judulInstrumen: string;
  versiInstrumen: number;
  tanggalEvaluasi: string;
  skorTotal: number;
  skorAsliAI?: number | null;
  predikat: string;
  kesimpulan: string;
  kekuatan: string[];
  saran: string[];
  skorPerAspek: { aspek: string; skor: number; alasan: string }[];
  catatanAdmin?: string | null;
  diubahAdminOleh?: string | null;
}

export interface DokumenTemplateConfig {
  namaInstansi: string;
  subJudulInstansi: string;
  alamatInstansi: string;
  logoUrl: string;
  warnaUtama: string;
  warnaAksen: string;
  kotaTandaTangan: string;
  namaSupervisor: string;
  nipSupervisor: string;
  jabatanSupervisor: string;
  isiTemplate: string;
}

export function parseTemplateConfig(rawJson?: string): DokumenTemplateConfig {
  try {
    const parsed = JSON.parse(rawJson || DEFAULT_TEMPLATE_DOKUMEN_JSON);
    return {
      namaInstansi: parsed.namaInstansi || "SMA NEGERI HARAPAN NUSANTARA",
      subJudulInstansi:
        parsed.subJudulInstansi ||
        "UNIT SUPERVISI AKADEMIK DIGITAL BERBASIS AI (SENSEI-AI)",
      alamatInstansi:
        parsed.alamatInstansi ||
        "Jl. Pendidikan Raya No. 88, Gedung Sakura Lt. 2",
      logoUrl: parsed.logoUrl || "",
      warnaUtama: parsed.warnaUtama || "#0e9ce8",
      warnaAksen: parsed.warnaAksen || "#f43f80",
      kotaTandaTangan: parsed.kotaTandaTangan || "Jakarta",
      namaSupervisor: parsed.namaSupervisor || "Dr. H. Aris Setiawan, M.Pd.",
      nipSupervisor: parsed.nipSupervisor || "19780412 200312 1 004",
      jabatanSupervisor:
        parsed.jabatanSupervisor || "Kepala Sekolah / Supervisor Utama",
      isiTemplate: parsed.isiTemplate || "",
    };
  } catch {
    return JSON.parse(DEFAULT_TEMPLATE_DOKUMEN_JSON);
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return [14, 156, 232];
  const r = parseInt(clean.slice(0, 2), 16) || 14;
  const g = parseInt(clean.slice(2, 4), 16) || 156;
  const b = parseInt(clean.slice(4, 6), 16) || 232;
  return [r, g, b];
}

export function generatePdfBuffer(
  data: ExportHasilData,
  rawTemplateJson?: string
): Buffer {
  const tpl = parseTemplateConfig(rawTemplateJson);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const primaryRgb = hexToRgb(tpl.warnaUtama);
  const accentRgb = hexToRgb(tpl.warnaAksen);

  // Header / Kop Surat
  doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.rect(0, 0, 210, 6, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(tpl.namaInstansi.toUpperCase(), 105, 16, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.text(tpl.subJudulInstansi, 105, 22, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(tpl.alamatInstansi, 105, 27, { align: "center" });

  doc.setDrawColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.setLineWidth(0.7);
  doc.line(15, 31, 195, 31);
  doc.setLineWidth(0.2);
  doc.line(15, 32.2, 195, 32.2);

  // Judul Dokumen
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("LAPORAN HASIL SUPERVISI AKADEMIK GURU", 105, 40, {
    align: "center",
  });

  // Identitas Guru & Ringkasan Skor
  autoTable(doc, {
    startY: 45,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: "bold", fillColor: [240, 248, 255], cellWidth: 38 },
      1: { cellWidth: 62 },
      2: { fontStyle: "bold", fillColor: [255, 241, 245], cellWidth: 35 },
      3: { cellWidth: 45 },
    },
    body: [
      ["Nama Guru", data.namaGuru, "Tanggal Evaluasi", data.tanggalEvaluasi],
      ["NIP / Email", data.nipGuru || data.emailGuru, "Skor Akhir", `${data.skorTotal} / 100`],
      [
        "Mata Pelajaran",
        data.mapelGuru || "Umum",
        "Predikat",
        data.predikat,
      ],
      [
        "Instrumen",
        `${data.judulInstrumen} (v${data.versiInstrumen})`,
        "Evaluator",
        "Sensei-AI Supervisor",
      ],
    ],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let curY = (doc as any).lastAutoTable.finalY + 8;

  // Grafik Batang Visual Capaian Per Aspek (Server-Rendered Chart)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("1. Grafik & Tabel Capaian Per Aspek Penilaian", 15, curY);
  curY += 5;

  for (const item of data.skorPerAspek) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`${item.aspek}`, 16, curY + 3.5);

    // Bar track
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(62, curY, 110, 4.5, 1.5, 1.5, "F");

    // Bar fill
    const barWidth = Math.max(4, Math.min(110, (item.skor / 100) * 110));
    if (item.skor >= 85) {
      doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
    } else if (item.skor >= 75) {
      doc.setFillColor(16, 185, 129);
    } else {
      doc.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    }
    doc.roundedRect(62, curY, barWidth, 4.5, 1.5, 1.5, "F");

    doc.setFont("helvetica", "bold");
    doc.text(`${item.skor}/100`, 175, curY + 3.5);
    curY += 7;
  }

  curY += 2;

  // Tabel Detail Alasan per Aspek
  autoTable(doc, {
    startY: curY,
    head: [["Aspek Penilaian", "Skor", "Analisis & Evaluasi Sensei-AI"]],
    body: data.skorPerAspek.map((a) => [a.aspek, `${a.skor}`, a.alasan]),
    theme: "striped",
    headStyles: {
      fillColor: primaryRgb,
      textColor: [255, 255, 255],
      fontSize: 9,
    },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 38 },
      1: { halign: "center", fontStyle: "bold", cellWidth: 18 },
      2: { cellWidth: 124 },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  curY = (doc as any).lastAutoTable.finalY + 7;

  // Kesimpulan AI
  if (curY > 235) {
    doc.addPage();
    curY = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("2. Kesimpulan Evaluasi", 15, curY);
  curY += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const kesimpulanLines = doc.splitTextToSize(data.kesimpulan, 180);
  doc.text(kesimpulanLines, 15, curY);
  curY += kesimpulanLines.length * 4.5 + 4;

  // Kekuatan & Saran Perbaikan
  if (curY > 230) {
    doc.addPage();
    curY = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("3. Poin Kekuatan & Rekomendasi Tindak Lanjut", 15, curY);
  curY += 4;

  autoTable(doc, {
    startY: curY,
    head: [["Kekuatan Utama", "Saran Perbaikan & Pengembangan"]],
    body: [
      [
        data.kekuatan.map((k, idx) => `${idx + 1}. ${k}`).join("\n\n"),
        data.saran.map((s, idx) => `${idx + 1}. ${s}`).join("\n\n"),
      ],
    ],
    theme: "grid",
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      fontSize: 9,
    },
    styles: { fontSize: 8.5, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 90 },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  curY = (doc as any).lastAutoTable.finalY + 6;

  // Catatan Admin (jika ada)
  if (data.catatanAdmin) {
    if (curY > 240) {
      doc.addPage();
      curY = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    doc.text(
      `Catatan Supervisor / Admin ${data.diubahAdminOleh ? `(${data.diubahAdminOleh})` : ""}:`,
      15,
      curY
    );
    curY += 4.5;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.8);
    doc.setTextColor(51, 65, 85);
    const catLines = doc.splitTextToSize(data.catatanAdmin, 180);
    doc.text(catLines, 15, curY);
    curY += catLines.length * 4.5 + 4;
  }

  // Tanda Tangan
  if (curY > 240) {
    doc.addPage();
    curY = 25;
  } else {
    curY += 6;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);

  doc.text("Guru yang Disupervisi,", 30, curY);
  doc.text(`${tpl.kotaTandaTangan}, ${data.tanggalEvaluasi}`, 135, curY);
  doc.text(tpl.jabatanSupervisor, 135, curY + 4.5);

  doc.setFont("helvetica", "bold");
  doc.text(data.namaGuru, 30, curY + 24);
  doc.text(tpl.namaSupervisor, 135, curY + 24);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`NIP: ${data.nipGuru || "-"}`, 30, curY + 28.5);
  doc.text(`NIP: ${tpl.nipSupervisor}`, 135, curY + 28.5);

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}

export async function generateWordBuffer(
  data: ExportHasilData,
  rawTemplateJson?: string
): Promise<Buffer> {
  const tpl = parseTemplateConfig(rawTemplateJson);

  const aspectRows = data.skorPerAspek.map(
    (item) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 28, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [new TextRun({ text: item.aspek, bold: true, size: 20 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 14, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `${item.skor} / 100`, bold: true, size: 20 }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 58, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [new TextRun({ text: item.alasan, size: 20 })],
              }),
            ],
          }),
        ],
      })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: tpl.namaInstansi.toUpperCase(),
                bold: true,
                size: 28,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: tpl.subJudulInstansi,
                bold: true,
                color: "0E9CE8",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            border: {
              bottom: {
                color: "0E9CE8",
                space: 6,
                style: BorderStyle.SINGLE,
                size: 12,
              },
            },
            children: [
              new TextRun({
                text: tpl.alamatInstansi,
                size: 18,
                color: "64748B",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 120, after: 200 },
            children: [
              new TextRun({
                text: "LAPORAN HASIL SUPERVISI AKADEMIK GURU",
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: "F0F8FF", type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: "Nama Guru", bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: data.namaGuru })],
                  }),
                  new TableCell({
                    shading: { fill: "FFF1F5", type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: "Skor Akhir", bold: true })] })],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `${data.skorTotal} / 100 (${data.predikat})`,
                            bold: true,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: "F0F8FF", type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: "Mata Pelajaran", bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: data.mapelGuru || "Umum" })],
                  }),
                  new TableCell({
                    shading: { fill: "FFF1F5", type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: "Tanggal Evaluasi", bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: data.tanggalEvaluasi })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: "F0F8FF", type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: "Instrumen", bold: true })] })],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: `${data.judulInstrumen} (Versi ${data.versiInstrumen})`,
                      }),
                    ],
                  }),
                  new TableCell({
                    shading: { fill: "FFF1F5", type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: "NIP / Email", bold: true })] })],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({ text: data.nipGuru || data.emailGuru }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 280, after: 120 },
            children: [
              new TextRun({
                text: "1. Capaian Per Aspek Penilaian",
                bold: true,
                size: 22,
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: "0E9CE8", type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: "Aspek", bold: true, color: "FFFFFF" }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    shading: { fill: "0E9CE8", type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "Skor", bold: true, color: "FFFFFF" }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    shading: { fill: "0E9CE8", type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Analisis Evaluasi Sensei-AI",
                            bold: true,
                            color: "FFFFFF",
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              ...aspectRows,
            ],
          }),
          new Paragraph({
            spacing: { before: 280, after: 100 },
            children: [
              new TextRun({
                text: "2. Kesimpulan Evaluasi Sensei-AI",
                bold: true,
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: data.kesimpulan, size: 21 })],
          }),
          new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: "3. Kekuatan Utama",
                bold: true,
                size: 22,
              }),
            ],
          }),
          ...data.kekuatan.map(
            (k, i) =>
              new Paragraph({
                spacing: { after: 80 },
                children: [new TextRun({ text: `${i + 1}. ${k}`, size: 20 })],
              })
          ),
          new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: "4. Saran Perbaikan & Tindak Lanjut",
                bold: true,
                size: 22,
              }),
            ],
          }),
          ...data.saran.map(
            (s, i) =>
              new Paragraph({
                spacing: { after: 80 },
                children: [new TextRun({ text: `${i + 1}. ${s}`, size: 20 })],
              })
          ),
          ...(data.catatanAdmin
            ? [
                new Paragraph({
                  spacing: { before: 220, after: 80 },
                  children: [
                    new TextRun({
                      text: `5. Catatan Supervisor / Admin ${
                        data.diubahAdminOleh ? `(${data.diubahAdminOleh})` : ""
                      }`,
                      bold: true,
                      color: "F43F80",
                      size: 22,
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { after: 200 },
                  children: [
                    new TextRun({
                      text: data.catatanAdmin,
                      italics: true,
                      size: 20,
                    }),
                  ],
                }),
              ]
            : []),
          new Paragraph({
            spacing: { before: 420 },
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: `${tpl.kotaTandaTangan}, ${data.tanggalEvaluasi}`,
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: tpl.jabatanSupervisor,
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 600 },
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: tpl.namaSupervisor,
                bold: true,
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: `NIP. ${tpl.nipSupervisor}`,
                size: 18,
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
