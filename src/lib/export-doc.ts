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
  disahkan?: boolean;
  disahkanOleh?: string | null;
  disahkanNip?: string | null;
  disahkanPada?: string | null;
  nomorRegistrasi?: string | null;
  rtlRekomendasi?: string | null;
  rtlTarget?: string | null;
  rtlTenggat?: string | null;
  rtlProgres?: string | null;
  pengawasNama?: string | null;
  pengawasNip?: string | null;
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
  namaPengawas: string;
  nipPengawas: string;
  jabatanPengawas: string;
  isiTemplate: string;
}

export function parseTemplateConfig(rawJson?: string): DokumenTemplateConfig {
  try {
    const parsed = JSON.parse(rawJson || DEFAULT_TEMPLATE_DOKUMEN_JSON);
    return {
      namaInstansi:
        parsed.namaInstansi ||
        "DINAS PENDIDIKAN PROVINSI DKI JAKARTA • SDN 01 MENTENG",
      subJudulInstansi:
        parsed.subJudulInstansi ||
        "SISTEM INFORMASI SUPERVISI & EVALUASI AKADEMIK BERBASIS AI (SIPENA)",
      alamatInstansi:
        parsed.alamatInstansi ||
        "Jl. Besuki No. 4, Menteng, Jakarta Pusat • Telp (021) 3192-4510",
      logoUrl: parsed.logoUrl || "",
      warnaUtama: parsed.warnaUtama || "#1d4ed8",
      warnaAksen: parsed.warnaAksen || "#0f766e",
      kotaTandaTangan: parsed.kotaTandaTangan || "Jakarta",
      namaSupervisor: parsed.namaSupervisor || "Dr. Hj. Ratna Kusuma, M.Pd.",
      nipSupervisor: parsed.nipSupervisor || "19720415 199802 2 001",
      jabatanSupervisor:
        parsed.jabatanSupervisor || "Kepala Sekolah / Supervisor Akademik",
      namaPengawas: parsed.namaPengawas || "Drs. H. Bambang Sudibyo, M.Pd.",
      nipPengawas: parsed.nipPengawas || "19680512 199303 1 004",
      jabatanPengawas: parsed.jabatanPengawas || "Pengawas Sekolah Pembina",
      isiTemplate: parsed.isiTemplate || "",
    };
  } catch {
    return JSON.parse(DEFAULT_TEMPLATE_DOKUMEN_JSON);
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return [29, 78, 216];
  const r = parseInt(clean.slice(0, 2), 16) || 29;
  const g = parseInt(clean.slice(2, 4), 16) || 78;
  const b = parseInt(clean.slice(4, 6), 16) || 216;
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

  const noReg =
    data.nomorRegistrasi || `REG-SUP/2026/${data.id.slice(-6).toUpperCase()}`;
  const statusPengesahan = data.disahkan
    ? `DISAHKAN & TERKUNCI (${data.disahkanOleh || tpl.namaSupervisor})`
    : "DRAF EVALUASI (MENUNGGU PENGESAHAN KEPALA SEKOLAH)";

  // Header / Kop Surat Resmi
  doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.rect(0, 0, 210, 5.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(15, 23, 42);
  doc.text(tpl.namaInstansi.toUpperCase(), 105, 14, { align: "center" });

  doc.setFontSize(9.5);
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.text(tpl.subJudulInstansi, 105, 19.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(tpl.alamatInstansi, 105, 24.5, { align: "center" });

  doc.setDrawColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.setLineWidth(0.75);
  doc.line(15, 28, 195, 28);
  doc.setLineWidth(0.2);
  doc.line(15, 29.2, 195, 29.2);

  // Judul & Nomor Registrasi
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text("BERITA ACARA & LAPORAN HASIL SUPERVISI AKADEMIK", 105, 36.5, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`No. Registrasi: ${noReg}   |   Status: ${statusPengesahan}`, 105, 41, {
    align: "center",
  });

  // Identitas Guru & Ringkasan Skor
  autoTable(doc, {
    startY: 44.5,
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 2.2 },
    columnStyles: {
      0: { fontStyle: "bold", fillColor: [239, 246, 255], cellWidth: 36 },
      1: { cellWidth: 64 },
      2: { fontStyle: "bold", fillColor: [240, 253, 250], cellWidth: 34 },
      3: { cellWidth: 46 },
    },
    body: [
      ["Nama Guru", data.namaGuru, "Tanggal Evaluasi", data.tanggalEvaluasi],
      [
        "NIP / Email",
        data.nipGuru || data.emailGuru,
        "Skor Akhir",
        `${data.skorTotal} / 100`,
      ],
      [
        "Mata Pelajaran",
        data.mapelGuru || "Umum",
        "Predikat",
        data.predikat,
      ],
      [
        "Instrumen",
        `${data.judulInstrumen} (v${data.versiInstrumen})`,
        "Verifikasi",
        data.disahkan ? "Tervalidasi Kepsek" : "Proses Review",
      ],
    ],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let curY = (doc as any).lastAutoTable.finalY + 7;

  // 1. Grafik & Tabel Capaian Per Aspek
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("1. Capaian & Analisis Per Aspek Penilaian", 15, curY);
  curY += 4.5;

  for (const item of data.skorPerAspek) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(`${item.aspek}`, 16, curY + 3.2);

    doc.setFillColor(226, 232, 240);
    doc.roundedRect(68, curY, 104, 4, 1.2, 1.2, "F");

    const barWidth = Math.max(4, Math.min(104, (item.skor / 100) * 104));
    if (item.skor >= 91) {
      doc.setFillColor(16, 185, 129);
    } else if (item.skor >= 81) {
      doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
    } else if (item.skor >= 71) {
      doc.setFillColor(245, 158, 11);
    } else {
      doc.setFillColor(225, 29, 72);
    }
    doc.roundedRect(68, curY, barWidth, 4, 1.2, 1.2, "F");

    doc.setFont("helvetica", "bold");
    doc.text(`${item.skor}/100`, 175, curY + 3.2);
    curY += 6;
  }

  curY += 2;

  autoTable(doc, {
    startY: curY,
    head: [
      ["Aspek Penilaian", "Skor", "Analisis Substantif (AI & Kepala Sekolah)"],
    ],
    body: data.skorPerAspek.map((a) => [a.aspek, `${a.skor}`, a.alasan]),
    theme: "striped",
    headStyles: {
      fillColor: primaryRgb,
      textColor: [255, 255, 255],
      fontSize: 8.5,
    },
    styles: { fontSize: 8, cellPadding: 2.2 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 42 },
      1: { halign: "center", fontStyle: "bold", cellWidth: 16 },
      2: { cellWidth: 122 },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  curY = (doc as any).lastAutoTable.finalY + 6;

  // 2. Temuan Substantif / Kesimpulan Evaluasi
  if (curY > 235) {
    doc.addPage();
    curY = 18;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("2. Temuan Substantif & Kesimpulan Supervisi", 15, curY);
  curY += 4.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const kesimpulanLines = doc.splitTextToSize(data.kesimpulan || "-", 180);
  doc.text(kesimpulanLines, 15, curY);
  curY += kesimpulanLines.length * 4.2 + 4;

  // 3. Kekuatan & Saran Pembinaan
  if (curY > 225) {
    doc.addPage();
    curY = 18;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("3. Poin Kekuatan & Rekomendasi Pembinaan", 15, curY);
  curY += 3.5;

  autoTable(doc, {
    startY: curY,
    head: [["Kekuatan Utama Pembelajaran", "Rekomendasi Pembinaan Kepala Sekolah"]],
    body: [
      [
        data.kekuatan.map((k, idx) => `${idx + 1}. ${k}`).join("\n\n") || "-",
        data.saran.map((s, idx) => `${idx + 1}. ${s}`).join("\n\n") || "-",
      ],
    ],
    theme: "grid",
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8.5,
    },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 90 },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  curY = (doc as any).lastAutoTable.finalY + 5;

  // Catatan Observasi Kepala Sekolah
  if (data.catatanAdmin) {
    if (curY > 240) {
      doc.addPage();
      curY = 18;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    doc.text(
      `4. Catatan Resmi Kepala Sekolah ${
        data.diubahAdminOleh ? `(${data.diubahAdminOleh})` : ""
      }:`,
      15,
      curY
    );
    curY += 4.2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const catLines = doc.splitTextToSize(data.catatanAdmin, 180);
    doc.text(catLines, 15, curY);
    curY += catLines.length * 4.2 + 4;
  }

  // 5. Rencana Tindak Lanjut (RTL) Pengawas Sekolah
  if (curY > 218) {
    doc.addPage();
    curY = 18;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    "5. Rencana Tindak Lanjut (RTL) & Peninjauan Pengawas Sekolah",
    15,
    curY
  );
  curY += 3.5;

  autoTable(doc, {
    startY: curY,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2.3 },
    columnStyles: {
      0: { fontStyle: "bold", fillColor: [241, 245, 249], cellWidth: 46 },
      1: { cellWidth: 134 },
    },
    body: [
      [
        "Rekomendasi Pengawas",
        data.rtlRekomendasi ||
          "Menunggu peninjauan & penetapan RTL oleh Pengawas Sekolah Pembina.",
      ],
      ["Target Peningkatan Mutu", data.rtlTarget || "-"],
      [
        "Tenggat & Progres RTL",
        data.rtlTenggat
          ? `Tenggat: ${data.rtlTenggat}  |  Status Progres: ${
              data.rtlProgres || "Belum Dimulai"
            }`
          : `Status Progres: ${data.rtlProgres || "Belum Dimulai"}`,
      ],
      [
        "Pengawas Pembina",
        data.pengawasNama
          ? `${data.pengawasNama} (NIP. ${data.pengawasNip || tpl.nipPengawas})`
          : `${tpl.namaPengawas} (NIP. ${tpl.nipPengawas})`,
      ],
    ],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  curY = (doc as any).lastAutoTable.finalY + 8;

  // 6. Blok Tanda Tangan Resmi 3 Pihak
  if (curY > 240) {
    doc.addPage();
    curY = 22;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  // Kolom 1: Guru yang Disupervisi
  doc.text("Mengetahui / Yang Disupervisi,", 16, curY);
  doc.text("Guru Mata Pelajaran / Kelas,", 16, curY + 4.2);

  // Kolom 2: Pengawas Sekolah Pembina
  doc.text("Mengetahui & Membina,", 78, curY);
  doc.text(tpl.jabatanPengawas, 78, curY + 4.2);

  // Kolom 3: Kepala Sekolah
  doc.text(`${tpl.kotaTandaTangan}, ${data.tanggalEvaluasi}`, 138, curY);
  doc.text(tpl.jabatanSupervisor, 138, curY + 4.2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(data.namaGuru, 16, curY + 23);
  doc.text(data.pengawasNama || tpl.namaPengawas, 78, curY + 23);
  doc.text(data.disahkanOleh || tpl.namaSupervisor, 138, curY + 23);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`NIP. ${data.nipGuru || "-"}`, 16, curY + 27);
  doc.text(`NIP. ${data.pengawasNip || tpl.nipPengawas}`, 78, curY + 27);
  doc.text(`NIP. ${data.disahkanNip || tpl.nipSupervisor}`, 138, curY + 27);

  // Footer Verifikasi Digital
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Dokumen Resmi SIPENA • No. Reg: ${noReg} • Dihasilkan secara elektronik dan dapat diverifikasi melalui Portal Supervisi Akademik.`,
    105,
    289,
    { align: "center" }
  );

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}

export async function generateWordBuffer(
  data: ExportHasilData,
  rawTemplateJson?: string
): Promise<Buffer> {
  const tpl = parseTemplateConfig(rawTemplateJson);
  const noReg =
    data.nomorRegistrasi || `REG-SUP/2026/${data.id.slice(-6).toUpperCase()}`;

  const aspectRows = data.skorPerAspek.map(
    (item) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 28, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: item.aspek, bold: true, size: 20 }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 14, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `${item.skor} / 100`,
                    bold: true,
                    size: 20,
                  }),
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

  const signatureNoBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  };

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
                size: 26,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: tpl.subJudulInstansi,
                bold: true,
                color: "1D4ED8",
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            border: {
              bottom: {
                color: "1D4ED8",
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
            spacing: { before: 120, after: 80 },
            children: [
              new TextRun({
                text: "BERITA ACARA & LAPORAN HASIL SUPERVISI AKADEMIK",
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 180 },
            children: [
              new TextRun({
                text: `No. Registrasi: ${noReg} | Status: ${
                  data.disahkan
                    ? "DISAHKAN KEPALA SEKOLAH (IMMUTABLE)"
                    : "DRAF EVALUASI"
                }`,
                size: 18,
                color: "475569",
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: "EFF6FF", type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: "Nama Guru", bold: true })],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: data.namaGuru })],
                  }),
                  new TableCell({
                    shading: { fill: "F0FDFA", type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: "Skor Akhir", bold: true })],
                      }),
                    ],
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
                    shading: { fill: "EFF6FF", type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: "Mata Pelajaran", bold: true }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: data.mapelGuru || "Umum" })],
                  }),
                  new TableCell({
                    shading: { fill: "F0FDFA", type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: "Tanggal Evaluasi", bold: true }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: data.tanggalEvaluasi })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: "EFF6FF", type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: "Instrumen", bold: true })],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: `${data.judulInstrumen} (Versi ${data.versiInstrumen})`,
                      }),
                    ],
                  }),
                  new TableCell({
                    shading: { fill: "F0FDFA", type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: "NIP / Email", bold: true }),
                        ],
                      }),
                    ],
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
            spacing: { before: 240, after: 100 },
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
                    shading: { fill: "1D4ED8", type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Aspek",
                            bold: true,
                            color: "FFFFFF",
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    shading: { fill: "1D4ED8", type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: "Skor",
                            bold: true,
                            color: "FFFFFF",
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    shading: { fill: "1D4ED8", type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Analisis Substantif (AI & Kepala Sekolah)",
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
            spacing: { before: 240, after: 80 },
            children: [
              new TextRun({
                text: "2. Temuan Substantif & Kesimpulan",
                bold: true,
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 180 },
            children: [new TextRun({ text: data.kesimpulan || "-", size: 21 })],
          }),
          new Paragraph({
            spacing: { before: 160, after: 80 },
            children: [
              new TextRun({
                text: "3. Kekuatan Utama Pembelajaran",
                bold: true,
                size: 22,
              }),
            ],
          }),
          ...data.kekuatan.map(
            (k, i) =>
              new Paragraph({
                spacing: { after: 60 },
                children: [new TextRun({ text: `${i + 1}. ${k}`, size: 20 })],
              })
          ),
          new Paragraph({
            spacing: { before: 180, after: 80 },
            children: [
              new TextRun({
                text: "4. Rekomendasi Pembinaan Kepala Sekolah",
                bold: true,
                size: 22,
              }),
            ],
          }),
          ...data.saran.map(
            (s, i) =>
              new Paragraph({
                spacing: { after: 60 },
                children: [new TextRun({ text: `${i + 1}. ${s}`, size: 20 })],
              })
          ),
          ...(data.catatanAdmin
            ? [
                new Paragraph({
                  spacing: { before: 180, after: 60 },
                  children: [
                    new TextRun({
                      text: `5. Catatan Resmi Kepala Sekolah ${
                        data.diubahAdminOleh ? `(${data.diubahAdminOleh})` : ""
                      }`,
                      bold: true,
                      color: "0F766E",
                      size: 22,
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { after: 160 },
                  children: [
                    new TextRun({
                      text: data.catatanAdmin,
                      size: 20,
                    }),
                  ],
                }),
              ]
            : []),
          new Paragraph({
            spacing: { before: 200, after: 80 },
            children: [
              new TextRun({
                text: "6. Rencana Tindak Lanjut (RTL) Pengawas Sekolah",
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
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Rekomendasi Pengawas",
                            bold: true,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        text:
                          data.rtlRekomendasi ||
                          "Menunggu penetapan RTL oleh Pengawas Sekolah.",
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: "Target Peningkatan", bold: true }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: data.rtlTarget || "-" })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Tenggat & Progres",
                            bold: true,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: `${data.rtlTenggat || "-"} (Status: ${
                          data.rtlProgres || "Belum Dimulai"
                        })`,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({ spacing: { before: 320 }, text: "" }),
          // Blok Tanda Tangan 3 Pihak
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    borders: signatureNoBorder,
                    width: { size: 33, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ text: "Guru yang Disupervisi," }),
                      new Paragraph({
                        spacing: { before: 500 },
                        children: [
                          new TextRun({ text: data.namaGuru, bold: true }),
                        ],
                      }),
                      new Paragraph({
                        text: `NIP. ${data.nipGuru || "-"}`,
                      }),
                    ],
                  }),
                  new TableCell({
                    borders: signatureNoBorder,
                    width: { size: 33, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ text: tpl.jabatanPengawas }),
                      new Paragraph({
                        spacing: { before: 500 },
                        children: [
                          new TextRun({
                            text: data.pengawasNama || tpl.namaPengawas,
                            bold: true,
                          }),
                        ],
                      }),
                      new Paragraph({
                        text: `NIP. ${data.pengawasNip || tpl.nipPengawas}`,
                      }),
                    ],
                  }),
                  new TableCell({
                    borders: signatureNoBorder,
                    width: { size: 34, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        text: `${tpl.kotaTandaTangan}, ${data.tanggalEvaluasi}`,
                      }),
                      new Paragraph({ text: tpl.jabatanSupervisor }),
                      new Paragraph({
                        spacing: { before: 340 },
                        children: [
                          new TextRun({
                            text: data.disahkanOleh || tpl.namaSupervisor,
                            bold: true,
                          }),
                        ],
                      }),
                      new Paragraph({
                        text: `NIP. ${data.disahkanNip || tpl.nipSupervisor}`,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
