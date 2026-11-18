import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getAllSettingsDecrypted,
  getPredikatFromSkor,
  logActivity,
} from "@/lib/settings";
import { evaluateSupervisi, triggerShirokoWebhook } from "@/lib/ai-evaluator";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const [hasilList, penugasanAll] = await Promise.all([
    prisma.hasil.findMany({
      include: {
        penugasan: {
          include: {
            guru: {
              select: {
                id: true,
                nama: true,
                email: true,
                nip: true,
                mapel: true,
                nomorWA: true,
                unitKerja: true,
              },
            },
            instrumen: {
              include: {
                pertanyaan: { orderBy: { urutan: "asc" } },
              },
            },
            jawaban: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.penugasan.findMany({
      include: {
        guru: {
          select: {
            id: true,
            nama: true,
            email: true,
            nip: true,
            mapel: true,
            nomorWA: true,
            unitKerja: true,
          },
        },
        instrumen: {
          include: {
            pertanyaan: { orderBy: { urutan: "asc" } },
          },
        },
        jawaban: true,
        hasil: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  // 1. Grafik Batang Perbandingan Antar Guru
  const guruMap = new Map<
    string,
    {
      nama: string;
      mapel: string;
      sum: number;
      count: number;
      skorTerakhir: number;
    }
  >();
  for (const h of hasilList) {
    if (h.status !== "selesai") continue;
    const g = h.penugasan.guru;
    const entry = guruMap.get(g.id) || {
      nama: g.nama,
      mapel: g.mapel || "Umum",
      sum: 0,
      count: 0,
      skorTerakhir: h.skorTotal,
    };
    entry.sum += h.skorTotal;
    entry.count += 1;
    guruMap.set(g.id, entry);
  }

  const barPerbandinganGuru = Array.from(guruMap.entries()).map(
    ([guruId, d]) => ({
      guruId,
      nama: d.nama.split(",")[0],
      namaLengkap: d.nama,
      mapel: d.mapel,
      rataSkor: d.count > 0 ? Math.round(d.sum / d.count) : 0,
      skorTerakhir: d.skorTerakhir,
    })
  );

  // 2. Grafik Distribusi Skor / Predikat Kemendikbudristek (SIPENA)
  const distBuckets = [
    { rentang: "Amat Baik (91-100)", jumlah: 0 },
    { rentang: "Baik (81-90)", jumlah: 0 },
    { rentang: "Cukup (71-80)", jumlah: 0 },
    { rentang: "Kurang (<71)", jumlah: 0 },
  ];
  for (const h of hasilList) {
    if (h.status !== "selesai") continue;
    if (h.skorTotal >= 91) distBuckets[0].jumlah++;
    else if (h.skorTotal >= 81) distBuckets[1].jumlah++;
    else if (h.skorTotal >= 71) distBuckets[2].jumlah++;
    else distBuckets[3].jumlah++;
  }

  // 3. Grafik Garis Tren Dari Waktu ke Waktu
  const trenWaktu = [...hasilList]
    .filter((h) => h.status === "selesai")
    .reverse()
    .map((h) => ({
      tanggal: new Date(h.createdAt).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
      }),
      guru: h.penugasan.guru.nama.split(",")[0],
      skor: h.skorTotal,
    }));

  return NextResponse.json({
    hasil: hasilList,
    penugasan: penugasanAll,
    charts: {
      barPerbandinganGuru,
      distribusiSkor: distBuckets,
      trenWaktu,
    },
  });
}

// PUT untuk Penilaian Kepala Sekolah, Verifikasi, Pengesahan Immutable, AI Co-Evaluator, & RTL Pengawas
export async function PUT(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const action = String(body.action || "simpan_penilaian");

    // 1. Trigger AI Co-Evaluator untuk membantu Kepala Sekolah menyusun draf analisis
    if (action === "evaluasi_ai_kepsek") {
      const penugasanId = String(body.penugasanId || "");
      if (!penugasanId) {
        return NextResponse.json(
          { error: "ID Penugasan wajib disertakan." },
          { status: 400 }
        );
      }

      // Simpan skor observasi Kepsek per indikator jika ikut dikirimkan
      if (body.observasi && typeof body.observasi === "object") {
        for (const [pertanyaanId, obs] of Object.entries(
          body.observasi as Record<string, { skorKepsek?: number; catatanKepsek?: string }>
        )) {
          const cur = await prisma.jawaban.findUnique({
            where: {
              penugasanId_pertanyaanId: { penugasanId, pertanyaanId },
            },
          });
          let merged: Record<string, unknown> = {};
          if (cur) {
            try {
              const p = JSON.parse(cur.nilaiJSON);
              merged = typeof p === "object" && p !== null ? p : { nilai: p };
            } catch {
              merged = { nilai: cur.nilaiJSON };
            }
          }
          if (obs.skorKepsek !== undefined) merged.skorKepsek = obs.skorKepsek;
          if (obs.catatanKepsek !== undefined)
            merged.catatanKepsek = obs.catatanKepsek;

          await prisma.jawaban.upsert({
            where: {
              penugasanId_pertanyaanId: { penugasanId, pertanyaanId },
            },
            update: { nilaiJSON: JSON.stringify(merged) },
            create: {
              penugasanId,
              pertanyaanId,
              nilaiJSON: JSON.stringify(merged),
            },
          });
        }
      }

      const res = await evaluateSupervisi(penugasanId, {
        triggeredBy: session.role === "kepala_sekolah" ? "kepala_sekolah" : "admin",
        evaluatorName: session.nama,
      });

      if (!res.success) {
        return NextResponse.json(
          { error: res.error || "Gagal menjalankan AI Co-Evaluator." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        hasilId: res.hasilId,
        message:
          "Draf analisis AI Co-Evaluator berhasil disusun! Silakan tinjau, sesuaikan, atau sahkan laporan.",
      });
    }

    // 2. Verifikasi Penugasan (Setujui ke Dalam Penilaian / Kembalikan Perlu Revisi)
    if (action === "verifikasi_penugasan") {
      const penugasanId = String(body.penugasanId || "");
      const statusBaru = String(body.status || "dalam_penilaian");
      const catatanVerifikasi = body.catatanVerifikasi
        ? String(body.catatanVerifikasi).trim()
        : null;

      if (statusBaru === "perlu_revisi" && !catatanVerifikasi) {
        return NextResponse.json(
          { error: "Catatan alasan revisi wajib diisi saat mengembalikan berkas." },
          { status: 400 }
        );
      }

      const updated = await prisma.penugasan.update({
        where: { id: penugasanId },
        data: {
          status: statusBaru,
          catatanVerifikasi,
          diverifikasiOleh: session.nama,
          diverifikasiPada: new Date(),
        },
        include: { guru: true, instrumen: true },
      });

      await logActivity({
        userId: session.userId,
        namaUser: session.nama,
        role: session.role,
        aksi: "VERIFIKASI_PENUGASAN_SUPERVISI",
        detail: `${session.nama} memperbarui status supervisi ${updated.guru.nama} menjadi "${statusBaru}"`,
      });

      return NextResponse.json({
        success: true,
        penugasan: updated,
        message:
          statusBaru === "perlu_revisi"
            ? `Berkas ${updated.guru.nama} dikembalikan dengan status Perlu Revisi.`
            : `Berkas ${updated.guru.nama} disetujui dan masuk tahap Dalam Penilaian.`,
      });
    }

    // 3. Penilaian Observasi Manual & Pengesahan Kepala Sekolah (Immutable Lock)
    if (
      action === "simpan_penilaian" ||
      action === "sahkan_laporan" ||
      action === "buka_kunci_admin"
    ) {
      const {
        hasilId,
        penugasanId,
        catatanAdmin,
        skorTotalBaru,
        kesimpulanBaru,
        kekuatanBaru,
        saranBaru,
        skorPerAspekBaru,
      } = body;

      let existing = hasilId
        ? await prisma.hasil.findUnique({
            where: { id: String(hasilId) },
            include: { penugasan: { include: { guru: true, instrumen: true } } },
          })
        : null;

      if (!existing && penugasanId) {
        existing = await prisma.hasil.findUnique({
          where: { penugasanId: String(penugasanId) },
          include: { penugasan: { include: { guru: true, instrumen: true } } },
        });
      }

      if (action === "buka_kunci_admin") {
        if (!existing) {
          return NextResponse.json(
            { error: "Hasil tidak ditemukan." },
            { status: 404 }
          );
        }
        const unlocked = await prisma.hasil.update({
          where: { id: existing.id },
          data: { disahkan: false },
        });
        await prisma.penugasan.update({
          where: { id: existing.penugasanId },
          data: { status: "dalam_penilaian" },
        });
        await logActivity({
          userId: session.userId,
          namaUser: session.nama,
          role: session.role,
          aksi: "BUKA_KUNCI_LAPORAN",
          detail: `${session.nama} membuka kunci pengesahan laporan ${existing.penugasan.guru.nama} untuk revisi administratif`,
        });
        return NextResponse.json({
          success: true,
          hasil: unlocked,
          message: "Kunci pengesahan dibuka. Laporan kembali ke tahap Dalam Penilaian.",
        });
      }

      // Jika belum ada record Hasil sama sekali (misal Kepala Sekolah langsung menilai tanpa AI), buatkan record baru!
      const settings = await getAllSettingsDecrypted();
      if (!existing && penugasanId) {
        const pen = await prisma.penugasan.findUnique({
          where: { id: String(penugasanId) },
          include: { guru: true, instrumen: true },
        });
        if (!pen) {
          return NextResponse.json(
            { error: "Data penugasan tidak ditemukan." },
            { status: 404 }
          );
        }
        const initialScore =
          skorTotalBaru !== undefined && !isNaN(Number(skorTotalBaru))
            ? Math.max(0, Math.min(100, Number(skorTotalBaru)))
            : 85;
        existing = await prisma.hasil.create({
          data: {
            penugasanId: pen.id,
            skorTotal: initialScore,
            predikat: getPredikatFromSkor(initialScore, settings.ai_rubrik_json),
            skorPerAspekJSON: JSON.stringify(
              skorPerAspekBaru || [
                {
                  aspek: "Penilaian Observasi Kepala Sekolah",
                  skor: initialScore,
                  alasan: "Penilaian langsung oleh Kepala Sekolah.",
                },
              ]
            ),
            kesimpulan:
              kesimpulanBaru ||
              "Penilaian hasil supervisi akademik oleh Kepala Sekolah.",
            kekuatanJSON: JSON.stringify(
              Array.isArray(kekuatanBaru)
                ? kekuatanBaru
                : ["Pelaksanaan pembelajaran berjalan tertib sesuai modul ajar."]
            ),
            sarannyaJSON: JSON.stringify(
              Array.isArray(saranBaru)
                ? saranBaru
                : ["Pertahankan konsistensi dan dokumentasi asesmen formatif."]
            ),
            status: "selesai",
          },
          include: { penugasan: { include: { guru: true, instrumen: true } } },
        });
      }

      if (!existing) {
        return NextResponse.json(
          { error: "ID Hasil atau ID Penugasan wajib disertakan." },
          { status: 400 }
        );
      }

      if (existing.disahkan) {
        return NextResponse.json(
          {
            error:
              "Laporan sudah disahkan & terkunci permanen (Immutable). Nilai tidak dapat diubah kecuali kunci dibuka oleh Admin.",
          },
          { status: 403 }
        );
      }

      const kepsekUser = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { nip: true },
      });

      const updateData: Record<string, unknown> = {
        status: "selesai",
        catatanAdmin:
          typeof catatanAdmin === "string"
            ? catatanAdmin.trim() || null
            : existing.catatanAdmin,
        diubahAdminOleh: session.nama,
        diubahAdminPada: new Date(),
      };

      if (
        skorTotalBaru !== undefined &&
        skorTotalBaru !== null &&
        !isNaN(Number(skorTotalBaru))
      ) {
        const numSkor = Math.max(0, Math.min(100, Number(skorTotalBaru)));
        updateData.skorTotal = numSkor;
        updateData.predikat = getPredikatFromSkor(numSkor, settings.ai_rubrik_json);
        if (existing.skorAsliAI === null) {
          updateData.skorAsliAI = existing.skorTotal;
        }
      }

      if (typeof kesimpulanBaru === "string") {
        updateData.kesimpulan = kesimpulanBaru;
      }
      if (Array.isArray(kekuatanBaru)) {
        updateData.kekuatanJSON = JSON.stringify(kekuatanBaru);
      }
      if (Array.isArray(saranBaru)) {
        updateData.sarannyaJSON = JSON.stringify(saranBaru);
      }
      if (Array.isArray(skorPerAspekBaru)) {
        updateData.skorPerAspekJSON = JSON.stringify(skorPerAspekBaru);
      }

      const sahkan = action === "sahkan_laporan" || body.disahkan === true;
      if (sahkan) {
        updateData.disahkan = true;
        updateData.disahkanOleh = session.nama;
        updateData.disahkanNip = kepsekUser?.nip || "197204151998022001";
        updateData.disahkanPada = new Date();
        updateData.nomorRegistrasi =
          existing.nomorRegistrasi ||
          `REG-SUP/2026/${existing.id.slice(-4).toUpperCase()}`;
      }

      const updated = await prisma.hasil.update({
        where: { id: existing.id },
        data: updateData,
      });

      if (sahkan) {
        await prisma.penugasan.update({
          where: { id: existing.penugasanId },
          data: { status: "selesai" },
        });

        // Push notifikasi pengesahan resmi ke Bot WhatsApp jika diaktifkan
        if (settings.shiroko_enabled === "true" && settings.shiroko_url) {
          triggerShirokoWebhook({
            event: "laporan_disahkan_kepsek",
            guru: {
              nama: existing.penugasan.guru.nama,
              nomorWA: existing.penugasan.guru.nomorWA,
              mapel: existing.penugasan.guru.mapel,
            },
            instrumen: existing.penugasan.instrumen.judul,
            skorTotal: updated.skorTotal,
            predikat: updated.predikat,
            nomorRegistrasi: updated.nomorRegistrasi,
            disahkanOleh: session.nama,
            hasilId: updated.id,
          }).catch(() => {});
        }
      }

      await logActivity({
        userId: session.userId,
        namaUser: session.nama,
        role: session.role,
        aksi: sahkan ? "SAHKAN_LAPORAN_SUPERVISI" : "SIMPAN_PENILAIAN_KEPSEK",
        detail: `${session.nama} ${
          sahkan ? "MENGESAHKAN & MENGUNCI" : "memperbarui penilaian"
        } supervisi ${existing.penugasan.guru.nama} (Skor: ${updated.skorTotal} - ${updated.predikat})`,
      });

      return NextResponse.json({
        success: true,
        hasil: updated,
        message: sahkan
          ? `Laporan supervisi ${existing.penugasan.guru.nama} telah DISAHKAN & DIKUNCI (${updated.nomorRegistrasi}) dan kini tersedia untuk ditinjau Pengawas Sekolah!`
          : `Penilaian & catatan Kepala Sekolah untuk ${existing.penugasan.guru.nama} berhasil disimpan!`,
      });
    }

    // 4. Rencana Tindak Lanjut (RTL) Pengawas Sekolah
    if (action === "simpan_rtl_pengawas") {
      const { hasilId, rtlRekomendasi, rtlTarget, rtlTenggat, rtlProgres } =
        body;
      if (!hasilId) {
        return NextResponse.json(
          { error: "ID Hasil wajib disertakan." },
          { status: 400 }
        );
      }

      const existing = await prisma.hasil.findUnique({
        where: { id: String(hasilId) },
        include: { penugasan: { include: { guru: true } } },
      });
      if (!existing) {
        return NextResponse.json(
          { error: "Data hasil tidak ditemukan." },
          { status: 404 }
        );
      }

      const pengawasUser = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { nip: true },
      });

      const updated = await prisma.hasil.update({
        where: { id: existing.id },
        data: {
          rtlRekomendasi: String(rtlRekomendasi || "").trim(),
          rtlTarget: String(rtlTarget || "").trim(),
          rtlTenggat: String(rtlTenggat || "").trim(),
          rtlProgres: String(rtlProgres || "Belum Dimulai"),
          pengawasNama: session.nama,
          pengawasNip: pengawasUser?.nip || "196805121993031004",
          ditinjauPengawasPada: new Date(),
        },
      });

      await prisma.penugasan.update({
        where: { id: existing.penugasanId },
        data: { status: "tindak_lanjut" },
      });

      await logActivity({
        userId: session.userId,
        namaUser: session.nama,
        role: session.role,
        aksi: "TETAPKAN_RTL_PENGAWAS",
        detail: `${session.nama} menetapkan Rencana Tindak Lanjut (RTL) untuk ${existing.penugasan.guru.nama} (Progres: ${updated.rtlProgres})`,
      });

      return NextResponse.json({
        success: true,
        hasil: updated,
        message: `Rencana Tindak Lanjut (RTL) Pengawas untuk ${existing.penugasan.guru.nama} berhasil disimpan!`,
      });
    }

    return NextResponse.json({ error: "Aksi tidak dikenali." }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Gagal memperbarui data supervisi.",
      },
      { status: 500 }
    );
  }
}
